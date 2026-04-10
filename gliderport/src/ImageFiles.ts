/**
 * @packageDocumentation
 *
 * This module is responsible for managing image and video file data stored on disk,
 * aggregating statistics about the files, and synchronizing that data with a
 * PocketBase database. It provides an Express Router that exposes multiple endpoints
 * for scanning directories, retrieving image counts, updating images, and managing
 * server state.
 *
 * @remarks
 * **Key Responsibilities:**
 * - **Directory Scanning & Data Aggregation**
 *   - Scans a structured file system (under `IMAGE_PATH`) for images organized by year, month, and day.
 *   - Computes image statistics (e.g., file count, continuous file sequences, date ranges, and missing files)
 *     using helper functions such as `getImageStats`.
 *   - Processes video files from `IMAGE_PATH/video` and links them to their corresponding image records.
 *   - Creates or updates records in the PocketBase `imageFiles` collection based on scanned data.
 *
 * - **API Endpoints**
 *   - Provides endpoints for:
 *     - Scanning the entire directory (`/scanEntireDirectory`).
 *     - Scanning the latest directory for new image data (`/scanLatestDirectory`).
 *     - Creating listing records (`/createListingRecord`) and retrieving listings (`/listing`).
 *     - Retrieving image data for a specific year and month (`/getImageData`).
 *     - Counting images within a specified time range (`/imageCount`).
 *     - Updating an image record (`/updateImage`).
 *     - Managing server state (e.g., putting the server to sleep with `/gotoSleep` and waking it up with `/wakeUp`).
 *
 * - **Cron Scheduling**
 *   - Schedules a daily task using `node-cron` that triggers the scanning of the latest
 *     directory (`scanLatestDirectory`) at 1:00 AM every day.
 *
 * - **Utility Functions & Helpers**
 *   - Includes helper functions for:
 *     - Reading file metadata (e.g., modification dates via `fs.statSync`).
 *     - Calculating image statistics and detecting missing files.
 *     - Aggregating image file data and generating unique IDs (using the `ToId` helper).
 *   - Utilizes custom modules for directory checks (`miscellaneous.js`), logging (`log.js`),
 *     SQL connectivity (`SqlConnect.js`), and WebSocket transmission (`socket.ts`).
 *
 * @module ImageFiles
 */

import express, { Request, Response, Router } from "express";
import { registerEndpoint } from "endpointRegistry";
import fs from "fs";
import cron from "node-cron";
import { isDirectory, ToId } from "miscellaneous";
import { pb } from "pb";
import { hit } from "hitCounter";
import { transmitNewImage } from "socket";
import { __logDir, log } from "log";
import { DateTime } from "luxon";
import path from "path";

/** Absolute path to the shared application log file. */
const __LogFile = path.join(__logDir, "gliderport.log");

/** A single image record: base64-encoded image data and the capture timestamp (ms). */
type ImageData = { image: string; date: number };

/** An ordered list of {@link ImageData} records for one camera. */
type ImageList = ImageData[];

/** Live image lists for both cameras, used when returning the latest small images. */
type BothCameraData = { camera1: ImageList; camera2: ImageList };

/**
 * Aggregated statistics for a single camera's images within one day directory.
 *
 * @remarks
 * Populated by {@link getImageStats}. The `starting`/`ending` fields hold the file
 * name and modification timestamp (ms) of the first and last images found.
 * Indices are 0-based offsets derived from the numeric part of each filename.
 */
type CameraData = {
  /** Earliest image in the directory (file name + modification time in ms). */
  starting: {
    file: string;
    time: number;
  };
  /** Latest image in the directory (file name + modification time in ms). */
  ending: {
    file: string;
    time: number;
  };
  /** Lowest 0-based image index found in the directory. */
  smallestIndex: number;
  /** Highest 0-based image index found in the directory. */
  largestIndex: number;
  /** Total number of image files found. */
  numFiles: number;
  /** Count of index slots between `smallestIndex` and `largestIndex` with no matching file. */
  numMissing: number;
  /** `true` when no gaps exist between `smallestIndex` and `largestIndex`. */
  isContinuous: boolean;
  /** `true` when a corresponding MP4 video file was found for this camera/day. */
  video: boolean;
};

/**
 * Result of scanning a single day directory with {@link getImageStats}.
 *
 * @remarks
 * `CameraB` is only present when `formatType === 2` (dual-camera filenames
 * matching `image-1-NNNNN.jpg` / `image-2-NNNNN.jpg`).
 */
interface ImageStats {
  /**
   * Detected filename format used in the directory:
   * - `0` — `image1000.jpg` (4-digit index, base 1000)
   * - `1` — `image10000.jpg` (5-digit index, base 10000)
   * - `2` — `image-1-10000.jpg` / `image-2-10000.jpg` (dual-camera, 5-digit)
   */
  formatType: number;
  /** Set to the error message string if directory reading throws. */
  error?: string;
  /** Statistics for the original (right-facing) camera. Always present. */
  CameraA: CameraData;
  /** Statistics for the second (left-facing) camera. Only present when `formatType === 2`. */
  CameraB?: CameraData;
}

/** Rolling buffer of the last five small images received from camera 1 (right-facing). */
const lastFiveSmallImagesCamera1: ImageList = [];
/** Rolling buffer of the last five small images received from camera 2 (left-facing). */
const lastFiveSmallImagesCamera2: ImageList = [];
/** Most recent large image for each camera: index 0 = camera 1, index 1 = camera 2. */
const lastBigImagesCamera: ImageList = [];

/**
 * Holds the four most recently received live images in the order:
 * `[smallCam1, bigCam1, smallCam2, bigCam2]` (base64-encoded strings).
 */
const currentImages: string[] = [];

/** Absolute path to the root directory containing year/month/date image subdirectories. */
const IMAGE_PATH = "/app/gliderport/images";

/**
 * Retrieves the modification time of a file as a timestamp.
 *
 * @param filePath - The path to the file.
 * @returns The file's modification timestamp in milliseconds, or `null` if an error occurs.
 */
function getFileDate(filePath: string): number | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime.getTime();
  } catch (err) {
    console.error(err);
    return null;
  }
}

/**
 * Prototype {@link CameraData} object used as the deep-clone source when initialising
 * per-camera statistics inside {@link getImageStats}.
 *
 * `starting.time` is set to `9999999999999` (always greater than any real mtime) so that
 * the first real file always wins the "min" comparison; `ending.time` is `-Infinity` for
 * the symmetric "max" comparison.
 */
const cameraDefault: CameraData = {
  starting: {
    file: "",
    time: 9999999999999,
  },
  ending: {
    file: "",
    time: -Infinity,
  },
  smallestIndex: 0,
  largestIndex: 0,
  numFiles: 0,
  numMissing: 0,
  isContinuous: true,
  video: false,
};

/**
 * Computes statistics for images in a given directory.
 *
 * @param directoryPath - The directory containing image files.
 * @returns An object containing statistics for the images.
 * @remarks
 * - Determines the filename format (`formatType`) by inspecting a sample file.
 * - Iterates through all files matching `/image.*\.jpg/`:
 *   - Updates start/end times and filenames.
 *   - Parses the numeric index from the filename and marks presence in `indexA` or `indexB`.
 * - Computes whether the sequence is continuous and counts missing files.
 * - Returns `ImageStats`, with `CameraA` always present and `CameraB` only if `formatType === 2`.
 */
function getImageStats(directoryPath: string): ImageStats {
  let indexA: boolean[] = Array(9999).fill(false);
  let indexB: boolean[] = Array(9999).fill(false);

  const results: ImageStats = {
    CameraA: JSON.parse(JSON.stringify(cameraDefault)),
    formatType: 0,
  };

  try {
    const files = fs.readdirSync(directoryPath);
    if (!files || files.length === 0) {
      log(__LogFile, "getImageStats", "No files in", directoryPath);
      return results;
    }

    // Determine formatType by scanning filenames
    for (const file of files) {
      if (/image.*\.jpg/.test(file)) {
        if (/image-\d-\d{5}\.jpg/.test(file)) {
          results.formatType = 2;
          results.CameraB = JSON.parse(JSON.stringify(cameraDefault));
        } else if (/image\d{5}\.jpg/.test(file)) {
          results.formatType = 1;
        } else if (/image\d{4}\.jpg/.test(file)) {
          results.formatType = 0;
        }
        break;
      }
    }

    // Process each image file
    for (const file of files) {
      if (file.match(/image/)) {
        let camera = results.CameraA;
        let indexArray = indexA;

        if (results.formatType === 2 && file.match(/-2-/)) {
          camera = results.CameraB!;
          indexArray = indexB;
        }

        camera.numFiles++;
        const fileDate = getFileDate(`${directoryPath}/${file}`);
        if (fileDate !== null) {
          if (fileDate < camera.starting.time) {
            camera.starting.time = fileDate;
            camera.starting.file = file;
          }
          if (fileDate > camera.ending.time) {
            camera.ending.time = fileDate;
            camera.ending.file = file;
          }
        }

        // Extract numeric index (4 or 5 digits) from the filename
        const match = file.match(/\d{4,5}/);
        if (!match) continue;
        let num = parseInt(match[0], 10);
        if (results.formatType === 0) num -= 1000;
        else num -= 10000;

        indexArray[num] = true;
        camera.largestIndex = Math.max(camera.largestIndex, num);
        camera.smallestIndex = Math.min(camera.smallestIndex, num);
      }
    }

    // Check continuity and missing files for CameraA
    for (let i = results.CameraA.smallestIndex; i <= results.CameraA.largestIndex; i++) {
      if (!indexA[i]) {
        results.CameraA.isContinuous = false;
        results.CameraA.numMissing++;
      }
    }

    if (
      results.CameraA.isContinuous &&
      results.CameraA.largestIndex - results.CameraA.smallestIndex + 1 !== results.CameraA.numFiles
    ) {
      log(
        __LogFile,
        "getImageStats",
        "CameraA:",
        results.CameraA.largestIndex,
        results.CameraA.smallestIndex,
        results.CameraA.numFiles,
      );
    }

    // If CameraB exists, check continuity and missing files
    if (results.CameraB) {
      for (let i = results.CameraB.smallestIndex; i <= results.CameraB.largestIndex; i++) {
        if (!indexB[i]) {
          results.CameraB.isContinuous = false;
          results.CameraB.numMissing++;
        }
      }

      if (
        results.CameraB.isContinuous &&
        results.CameraB.largestIndex - results.CameraB.smallestIndex + 1 !== results.CameraB.numFiles
      ) {
        log(
          __LogFile,
          "getImageStats",
          "CameraB:",
          results.CameraB.largestIndex,
          results.CameraB.smallestIndex,
          results.CameraB.numFiles,
        );
      }
    }

    return results;
  } catch (err: any) {
    log(__LogFile, "getImageStats", directoryPath, err.message);
    results.error = err.message;
    return results;
  }
}

/**
 * Counts the images in a directory within a specified time range.
 *
 * @param date   - The date in `"yyyy-mm-dd"` format.
 * @param from   - The starting hour (inclusive).
 * @param to     - The ending hour (inclusive).
 * @param camera - The camera number (1 or 2).
 * @returns An object containing either `{ files: string[] }` or `{ error: string }`.
 * @remarks
 * - Validates that `date` matches `"yyyy-mm-dd"`.
 * - Reads the directory at `IMAGE_PATH/{year}/{month}/{date}`.
 * - Filters files by `camera` (excludes `-2-` for camera 1, excludes `-1-` for camera 2).
 * - Checks each file’s modification hour and returns those within `[from, to]`.
 */
const imageCount = (
  date: string,
  from: number,
  to: number,
  camera: number,
): { files: string[] } | { error: string } => {
  // Validate the date format
  const [year, month, day] = date.split("-");
  if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
    return { error: "date format is not yyyy-mm-dd" };
  }

  const directoryPath = `${IMAGE_PATH}/${year}/${month}/${date}`;
  try {
    const files = fs.readdirSync(directoryPath);
    const ans: string[] = [];

    files.forEach((file: string) => {
      if (file.match(/image/)) {
        if (camera === 1 && file.match(/-2-/)) return;
        if (camera === 2 && file.match(/-1-/)) return;
      }
      const fileDate = getFileDate(`${directoryPath}/${file}`);
      const hour = fileDate !== null ? new Date(fileDate).getHours() : -1;
      if (hour >= from && hour <= to) ans.push(file);
    });

    return { files: ans };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Scans the entire `IMAGE_PATH` directory for image and video data,
 * aggregates statistics, and updates the PocketBase `imageFiles` collection.
 *
 * @returns A promise that resolves when the scanning process is complete.
 * @remarks
 * - Reads all subdirectories under `IMAGE_PATH/video/{year}` to build a `videos` map.
 * - Iterates through each year/month subfolder under `IMAGE_PATH` (excluding `video`):
 *   - Calls `getImageStats` for each date directory.
 *   - Marks `video` property in `ImageStats` when matching files found under `videos`.
 *   - Updates or creates the corresponding record in PocketBase collection `imageFiles` with ID `ToId(year + month)`.
 */
const scanEntireDirectory = async (): Promise<void> => {
  let videos: Record<string, string[]> = {};
  let files = fs.readdirSync(`${IMAGE_PATH}/video`);

  // Build a map of videos by year
  for (const year of files) {
    if (/^\d{4}$/.test(year) && isDirectory(`${IMAGE_PATH}/video/${year}`)) {
      videos[year] = fs.readdirSync(`${IMAGE_PATH}/video/${year}`);
    }
  }

  // Scan each year folder under IMAGE_PATH
  files = fs.readdirSync(IMAGE_PATH);
  log(__LogFile, "scanEntireDirectory", "files:", files.length);

  for (const year of files) {
    if (year === "video") continue;
    if (/^\d{4}$/.test(year) && isDirectory(`${IMAGE_PATH}/${year}`)) {
      const images: Record<string, Record<string, ImageStats>> = {};
      const months = fs.readdirSync(`${IMAGE_PATH}/${year}`);
      log(__LogFile, "scanEntireDirectory", months.length, "months to do this year");

      for (const month of months) {
        log(__LogFile, "scanEntireDirectory", "date:", `${year}/${month}`);
        if (/^\d{2}$/.test(month) && isDirectory(`${IMAGE_PATH}/${year}/${month}`)) {
          images[month] = {};
          const dates = fs.readdirSync(`${IMAGE_PATH}/${year}/${month}`);
          log(__LogFile, "scanEntireDirectory", dates.length, "dates to do this month");

          for (const date of dates) {
            images[month][date] = getImageStats(`${IMAGE_PATH}/${year}/${month}/${date}`);
            const videoMatches = videos[year]?.filter((fn) => fn.match(new RegExp(`^${date}.*mp4$`))) || [];
            videoMatches.forEach((f) => {
              if (f.match(/-2-/)) {
                images[month][date].CameraB!.video = true;
              } else {
                images[month][date].CameraA.video = true;
              }
            });
          }

          const id = ToId(year + month);
          log(__LogFile, "scanEntireDirectory", "id:", id);
          await pb
            .collection("imageFiles")
            .update(id, { data: images[month] })
            .catch((err: any) => console.error(err.message));
        }
      }
    }
  }
};

/**
 * Creates a listing record by aggregating data from the PocketBase `imageFiles` collection.
 *
 * @returns A promise that resolves when the listing record is updated.
 * @remarks
 * - Retrieves up to 9999 items from `imageFiles`.
 * - Parses each item's ID (`ToId("{year}{month}")`) to group dates.
 * - Builds `ans` as `{ [year]: { [month]: [dates...] } }`.
 * - Updates the PocketBase record with ID `ToId("listing")` using `ans`.
 */
const createListingRecord = async (): Promise<void> => {
  const ans: Record<string, Record<number, number[]>> = {};
  const res = await pb.collection("imageFiles").getList(0, 9999);

  res.items.forEach((item: any) => {
    const year = parseInt(item.id.slice(9, 13), 10);
    if (!isNaN(year)) {
      if (!ans[year]) ans[year] = {};
      const month = parseInt(item.id.slice(13, 15), 10);
      if (!ans[year][month]) ans[year][month] = [];
      Object.keys(item.data).forEach((dateKey: string) => {
        ans[year][month].push(parseInt(dateKey.slice(8, 10), 10));
      });
    }
  });

  await pb
    .collection("imageFiles")
    .update(ToId("listing"), { data: ans })
    .catch((err: any) => console.error(err.message));
};

/**
 * Retrieves the listing record from the PocketBase `imageFiles` collection.
 *
 * @returns A promise that resolves to the listing record data, or an empty object on error.
 */
const getListingRecord = async (): Promise<any> => {
  try {
    const res = await pb.collection("imageFiles").getOne(ToId("listing"));
    return res.data;
  } catch {
    return {};
  }
};

/**
 * Retrieves image data for a specific year and month from PocketBase.
 *
 * @param year  - The year for which to retrieve image data.
 * @param month - The month for which to retrieve image data.
 * @returns A promise that resolves to the image data, or an empty object on error.
 */
const getImageData = async (year: number, month: number): Promise<any> => {
  try {
    const id = ToId(`${year}${month.toString().padStart(2, "0")}`);
    const res = await pb.collection("imageFiles").getOne(id);
    return res.data;
  } catch {
    return {};
  }
};

/**
 * Scans the latest directory for image and video data,
 * updates the corresponding PocketBase records, and aggregates statistics.
 *
 * @returns A promise that resolves when the scan is complete.
 * @remarks
 * - Retrieves the current `listing` record to identify the most recent year/month.
 * - For each subsequent month directory (while it exists):
 *   - Ensures a PocketBase record exists for ID `ToId("{year}{month}")`.
 *   - Loads existing data, scans that month's subdirectories, and updates
 *     missing dates with `getImageStats`.
 *   - Marks `video` fields when matching video files exist.
 *   - Sorts the list of dates in ascending order.
 *   - Updates the PocketBase record with new `data`.
 *   - Increments month and adjusts year if needed.
 * - Finally, writes the updated `listing` data back to PocketBase.
 */
export const scanLatestDirectory = async (): Promise<void> => {
  try {
    const listingRes = await pb.collection("imageFiles").getOne(ToId("listing"));
    const listingData = listingRes.data;

    const years = Object.keys(listingData).map((k) => parseInt(k, 10));
    let year = Math.max(...years);
    let videos = fs.readdirSync(`${IMAGE_PATH}/video/${year}`);

    const months = Object.keys(listingData[year]).map((m) => parseInt(m, 10));
    let month = Math.max(...months);
    log(__LogFile, "rescan", `start searching ${IMAGE_PATH}/${year}/${month.toString().padStart(2, "0")}`);

    // Iterate while the month directory exists
    while (isDirectory(`${IMAGE_PATH}/${year}/${month.toString().padStart(2, "0")}`)) {
      const id = ToId(`${year}${month.toString().padStart(2, "0")}`);
      let mostRecent = await pb.collection("imageFiles").getList(1, 1, { filter: `id = "${id}"` });

      // If no record exists, create it
      if (mostRecent.items.length === 0) {
        log(__LogFile, "rescan", "creating new record for", id);
        await pb
          .collection("imageFiles")
          .create({ id, data: {} })
          .catch((err: any) => console.error(err.message));
        mostRecent = await pb.collection("imageFiles").getList(1, 1, { filter: `id = "${id}"` });
      }

      const existingData = mostRecent.items[0].data;
      const dates = fs.readdirSync(`${IMAGE_PATH}/${year}/${month.toString().padStart(2, "0")}`);
      listingData[year][month] = [];

      for (const date of dates) {
        if (existingData[date] === undefined) {
          existingData[date] = getImageStats(`${IMAGE_PATH}/${year}/${month.toString().padStart(2, "0")}/${date}`);
          const videoMatches = videos.filter((fn) => fn.match(new RegExp(`^${date}.*mp4$`)));
          if (videoMatches.length > 0) {
            existingData[date].CameraA.video = videoMatches.some((f) => !f.match(/-2-/));
            existingData[date].CameraB!.video = videoMatches.some((f) => f.match(/-2-/));
          }
        }
        listingData[year][month].push(parseInt(date.slice(8, 10), 10));
      }

      // Sort dates
      listingData[year][month].sort((a: number, b: number) => a - b);

      await pb
        .collection("imageFiles")
        .update(id, { data: existingData })
        .catch((err: any) => console.error(err.message));

      // Advance to next month/year
      month++;
      if (month > 12) {
        month = 1;
        year++;
        videos = fs.readdirSync(`${IMAGE_PATH}/video/${year}`);
        listingData[year] = {};
      }

      if (isDirectory(`${IMAGE_PATH}/${year}/${month.toString().padStart(2, "0")}`)) {
        log(__LogFile, "rescan", `next search ${IMAGE_PATH}/${year}/${month.toString().padStart(2, "0")}`);
      }
    }

    // Update listing record
    await pb
      .collection("imageFiles")
      .update(listingRes.id, { data: listingData })
      .catch((err: any) => console.error(err.message));
  } catch (err: any) {
    log(__LogFile, "rescan", `error in scanLatestDirectory: ${err.message}`);
    console.error(err);
  }
};

// Schedule scanLatestDirectory to run at 1:00 AM every day.
cron.schedule("0 1 * * *", () => {
  scanLatestDirectory();
});

/**
 * Returns a new Express `Router` that exposes:
 *   GET /scanLatestDirectory → triggers a scan of the latest directory.
 *   GET /scanEntireDirectory → scans the entire directory structure.
 *   GET /createListingRecord → creates or updates the listing record in PocketBase.
 *   GET /listing → retrieves the current listing record from PocketBase.
 *   GET /imageCount → returns image count for a specified date and time range.
 *   GET /getImageData → retrieves image data for a specific year and month from PocketBase.
 *   GET /latestImages → returns the latest images for front-end display.
 *   POST /updateImage → updates an image record with base64 data from the client.
 *   GET /getLargeImage → returns the last big image for a specified camera.
 *   GET /getLastFiveSmallImages → returns the last five small images for each camera.
 *   POST /updateLog → (debug) receives log updates from the client.
 *   GET /gotoSleep → sets the server’s state to “sleeping” in PocketBase.
 *   GET /wakeUp → sets the server’s state to “awake” in PocketBase.
 *
 * Mount this on your app or a sub-route to provide image file management endpoints.
 *
 * @returns A `Router` with all image management routes.
 */
export const ImageRoutes = (): Router => {
  const router = express.Router();

  registerEndpoint({
    method: "GET",
    path: "/gpapi/scanLatestDirectory",
    group: "Images",
    signature: "scanLatestDirectory: () => { status: string }",
    description: "Scans the latest image directory for new data and updates PocketBase imageFiles records.",
    pathTemplate: "GET /gpapi/scanLatestDirectory",
  });
  router.get("/scanLatestDirectory", async (_req: Request, res: Response) => {
    await scanLatestDirectory();
    res.json({ status: "ok" });
  });

  registerEndpoint({
    method: "GET",
    path: "/gpapi/scanEntireDirectory",
    group: "Images",
    signature: "scanEntireDirectory: () => { status: string }",
    description: "Scans the entire image directory tree and rebuilds all PocketBase imageFiles records.",
    pathTemplate: "GET /gpapi/scanEntireDirectory",
  });
  router.get("/scanEntireDirectory", async (_req: Request, res: Response) => {
    await scanEntireDirectory();
    res.json({ status: "ok" });
  });

  registerEndpoint({
    method: "GET",
    path: "/gpapi/createListingRecord",
    group: "Images",
    signature: "createListingRecord: () => { status: string }",
    description: "Aggregates all imageFiles records into the listing record used by the gallery browser.",
    pathTemplate: "GET /gpapi/createListingRecord",
  });
  router.get("/createListingRecord", async (_req: Request, res: Response) => {
    await createListingRecord();
    res.json({ status: "ok" });
  });

  registerEndpoint({
    method: "GET",
    path: "/gpapi/listing",
    group: "Images",
    signature: "listing: () => Record<year, Record<month, day[]>>",
    description: "Returns the gallery listing record — a nested object of year → month → available days.",
    pathTemplate: "GET /gpapi/listing",
  });
  router.get("/listing", async (_req: Request, res: Response) => {
    const data = await getListingRecord();
    res.json(data);
  });

  registerEndpoint({
    method: "GET",
    path: "/gpapi/imageCount",
    group: "Images",
    signature: "imageCount: (date: string, from: number, to: number, camera: 1|2) => { files: string[] }",
    description: "Returns the list of image filenames for a given date, hour range, and camera number.",
    pathTemplate: "GET /gpapi/imageCount?date=<yyyy-mm-dd>&from=<hour>&to=<hour>&camera=<1|2>",
  });
  router.get("/imageCount", (req: Request, res: Response) => {
    if (req.query.date === undefined) {
      return res.status(400).json({
        error: "date not provided",
        ...req.query,
        help: "add ?date=2025-04-12 to the URL",
      });
    }
    if (req.query.from === undefined) {
      return res.status(400).json({
        error: "from not provided",
        ...req.query,
        help: "add ?from=0 to the URL",
      });
    }
    if (req.query.to === undefined) {
      return res.status(400).json({
        error: "to not provided",
        ...req.query,
        help: "add ?to=23 to the URL",
      });
    }
    if (req.query.camera === undefined) {
      return res.status(400).json({
        error: "camera not provided",
        ...req.query,
        help: "add ?camera=1|2 to the URL",
      });
    }
    const date = req.query.date as string;
    const fromHour = parseInt(req.query.from as string, 10);
    const toHour = parseInt(req.query.to as string, 10);
    const cameraNum = parseInt(req.query.camera as string, 10);
    const result = imageCount(date, fromHour, toHour, cameraNum);
    res.json(result);
  });

  registerEndpoint({
    method: "GET",
    path: "/gpapi/getImageData",
    group: "Images",
    signature: "getImageData: (year: number, month: number) => Record<date, ImageStats>",
    description: "Returns image statistics for every day in a given year and month from PocketBase.",
    pathTemplate: "GET /gpapi/getImageData?year=<year>&month=<month>",
  });
  router.get("/getImageData", async (req: Request, res: Response) => {
    if (req.query.year === undefined) {
      return res.status(400).json({
        error: "year not provided",
        ...req.query,
        help: "add ?year=2025 to the URL",
      });
    }
    if (req.query.month === undefined) {
      return res.status(400).json({
        error: "month not provided",
        ...req.query,
        help: "add ?month=4 to the URL",
      });
    }
    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);
    const data = await getImageData(year, month);
    res.json(data);
  });

  registerEndpoint({
    method: "GET",
    path: "/gpapi/latestImages",
    group: "Images",
    signature: "latestImages: () => []",
    description:
      "Called by the frontend on load; records a site hit and returns an empty array (live images arrive via WebSocket).",
    pathTemplate: "GET /gpapi/latestImages",
  });
  // Called by the front end when it loads initial images
  router.get("/latestImages", (req: Request, res: Response) => {
    res.json([]);
    // Add IP hit to database
    hit(req);
  });

  /**
   * POST /updateImage
   *
   * Updates an image record for the given camera and size.
   *
   * @param req  - The HTTP request containing:
   *   - `A`: Base64-encoded image data.
   *   - `size`: 1 for small images, 2 for big images.
   *   - `camera`: 1 for camera1 (right), 2 for camera2 (left).
   * @param res  - The HTTP response.
   * @returns     A JSON object with `{ status, camera, size, index }` or an error.
   */
  registerEndpoint({
    method: "POST",
    path: "/gpapi/updateImage",
    group: "Images",
    signature:
      "updateImage: (A: string, size: 1|2, camera: 1|2) => { status: string; camera: number; size: number; index: number }",
    description:
      "Receives a base64-encoded image from the Pi camera, stores it in memory, and broadcasts it to WebSocket clients.",
    pathTemplate: "POST /gpapi/updateImage",
  });
  router.post("/updateImage", (req: Request, res: Response) => {
    const { A, size, camera } = req.body;
    if (
      A === undefined ||
      size === undefined ||
      camera === undefined ||
      size < 1 ||
      camera < 1 ||
      size > 2 ||
      camera > 2
    ) {
      return res.status(400).json({
        error: "data, size or camera not provided",
        ...req.body,
        help: "add data, size, and camera to the body",
      });
    }

    const index = size + 2 * (camera - 1) - 1;
    currentImages[index] = Buffer.from(A, "base64").toString("base64");

    // On big image from either camera, update PocketBase status
    if (index === 3) {
      pb.collection("status").update(ToId("images"), {
        record: { lastImage: Math.floor(Date.now() / 1000), sleeping: 0 },
      });
    }

    // Store last five small images for each camera
    if (size === 1) {
      if (camera === 1) {
        lastFiveSmallImagesCamera1.push({ image: currentImages[index], date: Date.now() });
        if (lastFiveSmallImagesCamera1.length > 5) {
          lastFiveSmallImagesCamera1.shift();
        }
      } else {
        lastFiveSmallImagesCamera2.push({ image: currentImages[index], date: Date.now() });
        if (lastFiveSmallImagesCamera2.length > 5) {
          lastFiveSmallImagesCamera2.shift();
        }
      }
      transmitNewImage(camera, currentImages[index], Date.now());
    }

    // Store last big images
    if (size === 2) {
      if (camera === 1) lastBigImagesCamera[0] = { image: currentImages[index], date: Date.now() };
      if (camera === 2) lastBigImagesCamera[1] = { image: currentImages[index], date: Date.now() };
    }

    res.json({ status: "Ok", camera, size, index });
  });

  /**
   * GET /getLargeImage
   *
   * Returns the last big image for the specified camera.
   *
   * @param req - HTTP request with query parameter `camera=1|2`.
   * @param res - HTTP response.
   * @returns   JSON of the last big image object or a 400 error if missing.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/getLargeImage",
    group: "Images",
    signature: "getLargeImage: (camera: 1|2) => ImageData",
    description: "Returns the most recently received large image for the specified camera.",
    pathTemplate: "GET /gpapi/getLargeImage?camera=<1|2>",
  });
  router.get("/getLargeImage", (req: Request, res: Response) => {
    if (req.query.camera === undefined) {
      return res.status(400).json({
        error: "camera not provided",
        ...req.query,
        help: "add ?camera=1|2 to the URL",
      });
    }
    const cameraNum = parseInt(req.query.camera as string, 10);
    if (cameraNum === 1) res.json(lastBigImagesCamera[0]);
    if (cameraNum === 2) res.json(lastBigImagesCamera[1]);
  });

  /**
   * GET /getLastFiveSmallImages
   *
   * Returns the last five small images for each camera.
   * Also records a hit (via `hit(req)`).
   *
   * @param req - HTTP request (used for recording a hit).
   * @param res - HTTP response.
   * @returns   JSON with `{ camera1, camera2 }` arrays.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/getLastFiveSmallImages",
    group: "Images",
    signature: "getLastFiveSmallImages: () => { camera1: ImageList; camera2: ImageList }",
    description: "Returns the last five small images for each camera, used to populate the live view strip.",
    pathTemplate: "GET /gpapi/getLastFiveSmallImages",
  });
  router.get("/getLastFiveSmallImages", (req: Request, res: Response) => {
    res.json({
      camera1: lastFiveSmallImagesCamera1,
      camera2: lastFiveSmallImagesCamera2,
    });
    hit(req);
  });

  /**
   * POST /updateLog
   *
   * (Debug) Receives client log updates and responds with status.
   *
   * @param req - HTTP request containing log data.
   * @param res - HTTP response.
   * @returns   JSON `{ status: "ok", sent: <req.body> }`.
   */
  registerEndpoint({
    method: "POST",
    path: "/gpapi/updateLog",
    group: "Images",
    signature: "updateLog: (body: any) => { status: string; sent: any }",
    description: "(Debug) Receives client-side log data from the Pi camera and echoes it back.",
    pathTemplate: "POST /gpapi/updateLog",
  });
  router.post("/updateLog", (req: Request, res: Response) => {
    res.json({ status: "ok", sent: req.body });
  });

  /**
   * GET /gotoSleep
   *
   * Sets the server state to "sleeping" in PocketBase under the `images` status record.
   *
   * @param req - HTTP request.
   * @param res - HTTP response.
   * @returns   JSON `{ status: "going to sleep" }` or a 500 error on failure.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/gotoSleep",
    group: "Images",
    signature: "gotoSleep: () => { status: string }",
    description: "Sets the camera server state to sleeping in PocketBase, stopping new image saves.",
    pathTemplate: "GET /gpapi/gotoSleep",
  });
  router.get("/gotoSleep", (_req: Request, res: Response) => {
    try {
      pb.collection("status")
        .getOne(ToId("images"))
        .then((result: any) => {
          pb.collection("status").update(ToId("images"), {
            record: { lastImage: result.record.lastImage, sleeping: 1 },
          });
        });
      res.json({ status: "going to sleep" });
      log(__LogFile, "gotoSleep", "signal at", DateTime.now().toISO());
    } catch (err: any) {
      console.error("Error updating status:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  /**
   * GET /wakeUp
   *
   * Sets the server state to "awake" in PocketBase under the `images` status record.
   *
   * @param req - HTTP request.
   * @param res - HTTP response.
   * @returns   JSON `{ status: "WAKING UP" }` or a 500 error on failure.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/wakeUp",
    group: "Images",
    signature: "wakeUp: () => { status: string }",
    description: "Sets the camera server state to awake in PocketBase, resuming image saves.",
    pathTemplate: "GET /gpapi/wakeUp",
  });
  router.get("/wakeUp", (_req: Request, res: Response) => {
    try {
      pb.collection("status")
        .getOne(ToId("images"))
        .then((result: any) => {
          pb.collection("status").update(ToId("images"), {
            record: { lastImage: result.record.lastImage, sleeping: 0 },
          });
        });
      res.json({ status: "WAKING UP" });
      log(__LogFile, "wakeUp", "signal at", DateTime.now().toISO());
    } catch (err: any) {
      console.error("Error updating status:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  return router;
};
