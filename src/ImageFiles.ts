/**
 *
 * **This module is responsible for managing image and video file data stored on disk,
 * aggregating statistics about the files, and synchronizing that data with a
 * PocketBase database. It provides an Express Router that exposes multiple endpoints
 * for scanning directories, retrieving image counts, updating images, and managing
 * server state.**
 *
 * Key Responsibilities:
 * - Directory Scanning & Data Aggregation:
 *     - Scans a structured file system (typically under `/app/gliderport`) for images
 *       organized by year, month, and day.
 *     - Computes image statistics (e.g., file count, continuous file sequences, date
 *       ranges, and missing files) using helper functions such as `getImageStats`.
 *     - Processes video files from `/app/gliderport/video` and links them to their
 *       corresponding image records.
 *     - Creates or updates records in the PocketBase "imageFiles" collection based on
 *       the scanned data.
 *
 * - API Endpoints:
 *     - Provides endpoints for:
 *         - Scanning the entire directory (`/scanEntireDirectory`).
 *         - Scanning the latest directory for new image data (`/scanLatestDirectory`).
 *         - Creating listing records (`/createListingRecord`) and retrieving listings (`/listing`).
 *         - Retrieving image data for a specific year and month (`/getImageData`).
 *         - Counting images within a specified time range (`/imageCount`).
 *         - Updating an image record (`/updateImage`).
 *         - Managing server state (e.g., sleeping with `/gotoSleep` and waking up with `/wakeUp`).
 *
 * - Cron Scheduling:
 *     - Schedules a daily task using node-cron that triggers the scanning of the latest
 *       directory (`scanLatestDirectory`) at 1:00 AM every day.
 *
 * - Utility Functions & Helpers:
 *     - Includes helper functions for:
 *         - Reading file metadata (e.g., modification dates via `fs.statSync`).
 *         - Calculating image statistics and detecting missing files.
 *         - Aggregating image file data and generating unique IDs (using the `ToId` helper).
 *     - Utilizes custom modules for directory checks (`miscellaneous.js`), logging (`log.js`),
 *       and SQL connectivity (`SqlConnect.js`).
 *
 * Usage:
 * - This module exports a default function `ImageRoutes()` that returns an Express Router.
 * - Mount the returned router in your main Express application to enable API endpoints for
 *   image and video file management.
 *
 * @module ImageFiles
 */

import express, { Request, Response, Router } from "express";
import fs from "fs";
import cron from "node-cron";
import { isDirectory } from "@/miscellaneous.js";
import { log } from "log.js";
import { pb } from "pb.js";
import { connection } from "SqlConnect.js";
import { ToId } from "miscellaneous.js";
import { hit } from "hitCounter.js";
import { __dirname } from "miscellaneous.js";

type ImageData = { image: Buffer; date: number };
type ImageList = ImageData[];
type SendImageData = { image: string; date: number };
type SendCameraData = SendImageData[];
type BothCameraData = { camera1: SendCameraData; camera2: SendImageData[] };

type CameraData = {
  starting: {
    file: string;
    time: number;
  };
  ending: {
    file: string;
    time: number;
  };
  smallestIndex: number;
  largestIndex: number;
  numFiles: number;
  numMissing: number;
  isContinuous: boolean;
  video: boolean;
};
interface ImageStats {
  formatType: number; // 0:image1000.jpg 1:image10000.jpg 2:image-1/2-10000.jpg
  error?: string;
  CameraA: CameraData; // original camera pointing right
  CameraB?: CameraData; // second camera pointing left
}

// Global arrays to store last five small images for each camera.
const lastFiveSmallImagesCamera1: ImageList = [];
const lastFiveSmallImagesCamera2: ImageList = [];

//hold teh current 4 images (big/small left/right)
const currentImages: Buffer[] = [];

/**
 * Retrieves the modification time of a file as a timestamp.
 *
 * @param {string} filePath - The path to the file.
 * @returns {number | null} The file's modification timestamp, or null if an error occurs.
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

// Default configuration object for a camera.
const cameraDefault: CameraData = {
  // original camera pointing right
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
 * @param {string} directoryPath - The directory containing image files.
 * @returns {ImageStats} An object containing statistics for the images.
 */
function getImageStats(directoryPath: string): ImageStats {
  let indexA: boolean[] = Array(9999).fill(false);
  let indexB: boolean[] = Array(9999).fill(false);

  const results: ImageStats = {
    CameraA: JSON.parse(JSON.stringify(cameraDefault)),
    formatType: 0, // 0: image1000.jpg, 1: image10000.jpg, 2: image-1/2-10000.jpg
  };

  try {
    const files = fs.readdirSync(directoryPath);
    if (!files || files.length === 0) {
      log("getImageStats", "no files in ", directoryPath);
      return results;
    }

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

    files.forEach((file: string) => {
      if (file.match(/image/)) {
        let Camera = results.CameraA;
        let Index = indexA;
        if (results.formatType == 2 && file.match(/-2-/)) {
          Camera = results.CameraB!;
          Index = indexB;
        }
        Camera.numFiles++;
        const fileDate = getFileDate(directoryPath + "/" + file);
        if (fileDate !== null) {
          if (fileDate < Camera.starting.time) {
            Camera.starting.time = fileDate;
            Camera.starting.file = file;
          }
          if (fileDate > Camera.ending.time) {
            Camera.ending.time = fileDate;
            Camera.ending.file = file;
          }
        }

        // Extract the 4 or 5 digit number from the filename.
        let num = parseInt(file.match(/\d{4,5}/)![0]);
        if (results.formatType == 0) num -= 1000;
        else num -= 10000;
        Index[num] = true;
        if (num > Camera.largestIndex) Camera.largestIndex = num;
        if (num < Camera.smallestIndex) Camera.smallestIndex = num;
      }
    });
    for (let i = results.CameraA.smallestIndex; i <= results.CameraA.largestIndex; i++) {
      if (!indexA[i]) {
        results.CameraA.isContinuous = false;
        results.CameraA.numMissing++;
      }
    }

    if (
      results.CameraA.isContinuous &&
      results.CameraA.largestIndex - results.CameraA.smallestIndex + 1 !== results.CameraA.numFiles
    )
      log(
        "getImageStats",
        "CameraA: ",
        results.CameraA.largestIndex,
        results.CameraA.smallestIndex,
        results.CameraA.numFiles
      );

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
      )
        log(
          "getImageStats",
          "CameraB: ",
          results.CameraB.largestIndex,
          results.CameraB.smallestIndex,
          results.CameraB.numFiles
        );
    }
    return results;
  } catch (err: any) {
    log("getImageStats", directoryPath, err.message);
    results.error = err.message;
    return results;
  }
}

/**
 * Counts the images in a directory within a specified time range.
 *
 * @param {string} date - The date in "yyyy-mm-dd" format.
 * @param {number} from - The starting hour.
 * @param {number} to - The ending hour.
 * @param {number} camera - The camera number (1 or 2).
 * @returns {object} An object containing the list of image filenames or an error message.
 */
const imageCount = (date: string, from: number, to: number, camera: number) => {
  let ans: string[] = [];
  // Validate the date format.
  const [year, month, day] = date.split("-");
  if (year.length !== 4 || month.length !== 2 || day.length !== 2) return { error: "date format is not yyyy-mm-dd" };
  const directoryPath = `/app/gliderport/${year}/${month}/${date}`;
  try {
    let files = fs.readdirSync(directoryPath);
    files.forEach((file: string) => {
      if (file.match(/image/)) {
        if (camera === 1 && file.match(/-2-/)) return;
        if (camera === 2 && file.match(/-1-/)) return;
      }
      const fileDate = getFileDate(directoryPath + "/" + file);
      const hour = fileDate ? new Date(fileDate).getHours() : -1;
      if (hour >= from && hour <= to) ans.push(file);
    });
    return { files: ans };
  } catch (err: any) {
    return { error: err.message };
  }
};

/**
 * Scans the entire /app/gliderport directory for image and video data,
 * aggregates statistics, and updates the PocketBase "imageFiles" collection.
 *
 * @returns {Promise<void>} Resolves when the scanning process is complete.
 */
const scanEntireDirectory = async () => {
  let videos: any = {};
  let files = fs.readdirSync("/app/gliderport/video");
  for (let i = 0; i < files.length; i++) {
    let year = files[i];
    if (year.match(/^\d{4}$/) && isDirectory(`/app/gliderport/video/${year}`))
      videos[year] = fs.readdirSync(`/app/gliderport/video/${year}`);
  }

  let images: Record<string, Record<string, Record<string, ImageStats>>> = {};
  // Scan /app/gliderport for year directories.
  files = fs.readdirSync("/app/gliderport");
  log("scanEntireDirectory", "files: ", files.length);
  for (let i = 0; i < files.length; i++) {
    let year = files[i];
    if (year === "video") continue;
    if (year.match(/^\d{4}$/) && isDirectory(`/app/gliderport/${year}`)) {
      images[year] = {};
      let months = fs.readdirSync(`/app/gliderport/${year}`);
      log("scanEntireDirectory", months.length, "months to do this year");
      for (let j = 0; j < months.length; j++) {
        let month = months[j];
        log("scanEntireDirectory", "date: " + year + "/" + month);
        // Scan month directory for date directories.
        if (month.match(/^\d{2}$/) && isDirectory(`/app/gliderport/${year}/${month}`)) {
          images[year][month] = {};
          let dates = fs.readdirSync(`/app/gliderport/${year}/${month}`);
          log("scanEntireDirectory", dates.length, "dates to do this month");
          for (let k = 0; k < dates.length; k++) {
            let date = dates[k];
            images[year][month][date] = getImageStats(`/app/gliderport/${year}/${month}/${date}`);
            const v = videos[year].filter((fn: string) => fn.match(new RegExp(`^${date}.*mp4$`)));
            v.forEach((f: string) => {
              if (f.match(/-2-/)) images[year][month][date].CameraB!.video = true;
              else images[year][month][date].CameraA.video = true;
            });
          }
          const id = ToId(year + month);
          log("scanEntireDirectory", "id: ", id);
          await pb
            .collection("imageFiles")
            .update(id, { data: images[year][month] })
            .catch((err: any) => console.error(err.message));
        }
      }
    }
  }
};

/**
 * Creates a listing record by aggregating data from the PocketBase "imageFiles" collection.
 *
 * @returns {Promise<void>} Resolves when the listing record is updated.
 */
const createListingRecord = async () => {
  let ans: any = {};
  const res = await pb.collection("imageFiles").getList(0, 9999);
  res.items.forEach((item: any) => {
    let year = parseInt(item.id.slice(9, 13));
    if (!isNaN(year)) {
      if (ans[year] === undefined) ans[year] = {};
      let month = parseInt(item.id.slice(13, 15));
      if (ans[year][month] === undefined) ans[year][month] = [];
      Object.keys(item.data).forEach((date: string) => {
        ans[year][month].push(parseInt(date.slice(8, 10)));
      });
    }
  });
  await pb
    .collection("imageFiles")
    .update(ToId("listing"), { data: ans })
    .catch((err: any) => console.error(err.message));
};

/**
 * Retrieves the listing record from the PocketBase "imageFiles" collection.
 *
 * @returns {Promise<any>} A Promise that resolves to the listing record data.
 */
const getListingRecord = async () => {
  const res = await pb.collection("imageFiles").getOne(ToId("listing"));
  return res.data;
};

/**
 * Retrieves image data for a specific year and month from PocketBase.
 *
 * @param {number} year - The year for which to retrieve image data.
 * @param {number} month - The month for which to retrieve image data.
 * @returns {Promise<any>} A Promise that resolves to the image data.
 */
const getImageData = async (year: number, month: number) => {
  try {
    const res = await pb.collection("imageFiles").getOne(ToId(year + month.toString().padStart(2, "0")));
    return res.data;
  } catch (err) {
    return {};
  }
};

/**
 * Scans the latest directory for image and video data,
 * updates the corresponding PocketBase records, and aggregates statistics.
 *
 * @returns {Promise<void>} Resolves when the scan is complete.
 */
export const scanLatestDirectory = async () => {
  try {
    const listing = await pb.collection("imageFiles").getOne(ToId("listing"));
    // get the largest key in data
    let keys = Object.keys(listing.data);
    let year = Math.max(...keys.map((key) => parseInt(key)));
    let videos = fs.readdirSync(`/app/gliderport/video/${year}`);
    // get the largest month in data[year]
    let months = Object.keys(listing.data[year]);
    let month = Math.max(...months.map((key) => parseInt(key)));
    log("rescan", `start searching /app/gliderport/${year}/${month.toString().padStart(2, "0")}`);

    // see if this month exists and process it
    while (isDirectory(`/app/gliderport/${year}/${month.toString().padStart(2, "0")}`)) {
      // load the corresponding id
      const id = ToId(year.toString() + month.toString().padStart(2, "0"));
      let mostRecent = await pb.collection("imageFiles").getList(1, 1, { filter: `id = "${id}"` });
      // if it doesn't exist create it
      if (mostRecent.items.length === 0) {
        log("rescan", "creating new record for ", id);
        await pb
          .collection("imageFiles")
          .create({ id, data: {} })
          .catch((err: any) => console.error(err.message));
        //now get it
        mostRecent = await pb.collection("imageFiles").getList(1, 1, { filter: `id = "${id}"` });
      }
      let res = mostRecent.items[0].data;
      let days = fs.readdirSync(`/app/gliderport/${year}/${month.toString().padStart(2, "0")}`);
      listing.data[year][month] = [];
      for (const day of days) {
        if (res[day] === undefined) {
          res[day] = getImageStats(`/app/gliderport/${year}/${month.toString().padStart(2, "0")}/${day}`);
          res[day].video = videos.filter((fn: string) => fn.match(new RegExp(`^${day}.*mp4$`)));
        }
        listing.data[year][month].push(parseInt(day.slice(8, 10)));
      }
      // in case something was out of order in the directory
      listing.data[year][month] = listing.data[year][month].sort((a: number, b: number) => a - b);
      await pb
        .collection("imageFiles")
        .update(id, { data: res })
        .catch((err: any) => console.error(err.message));
      await pb
        .collection("imageFiles")
        .update(listing.id, { data: listing.data })
        .catch((err: any) => console.error(err.message));
      month = month + 1;
      if (month > 12) {
        month = 1;
        year = year + 1;
        videos = fs.readdirSync(`/app/gliderport/video/${year}`);
      }
      if (isDirectory(`/app/gliderport/${year}/${month.toString().padStart(2, "0")}`))
        log("rescan", `next search /app/gliderport/${year}/${month.toString().padStart(2, "0")}`);
    }
  } catch (err: any) {
    log("rescan", `error in scanLatestDirectory: ${err.message}`);
    console.error(err);
  }
};

// Schedule scanLatestDirectory to run at 1:00 am every day.
cron.schedule("0 1 * * *", () => {
  scanLatestDirectory();
});

/**
 * Express Router for Image Files Management.
 *
 * Exposed Endpoints:
 * - GET /scanLatestDirectory: Triggers a scan of the latest directory.
 * - GET /scanEntireDirectory: Scans the entire directory structure.
 * - GET /createListingRecord: Creates the listing record in PocketBase.
 * - GET /listing: Retrieves the current listing record.
 * - GET /imageCount: Returns image count for a specified date and time range.
 * - GET /getImageData: Retrieves image data for a specific year and month.
 * - GET /latestImages: Returns the latest images (for front-end display).
 * - POST /updateImage: Updates an image record based on data from the front end.
 * - GET /getLastFiveSmallImages: Returns the last five small images for each camera.
 * - POST /updateLog: (Debug) Updates log data.
 * - GET /gotoSleep: Sets the server state to "sleeping".
 * - GET /wakeUp: Sets the server state to "awake".
 *
 * @returns {Router} The configured Express Router.
 */
export const ImageRoutes = (): Router => {
  const router = express.Router();

  router.get("/scanLatestDirectory", async (req: Request, res: Response) => {
    res.json(await scanLatestDirectory());
  });

  router.get("/scanEntireDirectory", async (req: Request, res: Response) => {
    scanEntireDirectory();
    res.json({ status: "ok" });
  });

  router.get("/createListingRecord", async (req: Request, res: Response) => {
    createListingRecord();
    res.json({ status: "ok" });
  });

  router.get("/listing", async (req: Request, res: Response) => {
    res.json(await getListingRecord());
  });

  router.get("/imageCount", (req: Request, res: Response) => {
    if (req.query.date === undefined)
      return res
        .status(400)
        .json({ error: "date not provided", ...req.query, help: "add ?date=2025-04-12 to the url" });
    if (req.query.from === undefined)
      return res.status(400).json({ error: "from not provided", ...req.query, help: "add ?from=0 to the url" });
    if (req.query.to === undefined)
      return res.status(400).json({ error: "to not provided", ...req.query, help: "add ?to=23 to the url" });
    if (req.query.camera === undefined)
      return res.status(400).json({ error: "camera not provided", ...req.query, help: "add ?camera=1|2 to the url" });
    res.json(
      imageCount(
        req.query.date as string,
        parseInt(req.query.from as string),
        parseInt(req.query.to as string),
        parseInt(req.query.camera as string)
      )
    );
  });

  router.get("/getImageData", async (req: Request, res: Response) => {
    if (req.query.year === undefined)
      return res.status(400).json({ error: "year not provided", ...req.query, help: "add ?year=2025 to the url" });
    if (req.query.month === undefined)
      return res.status(400).json({ error: "month not provided", ...req.query, help: "add ?month=4 to the url" });
    res.json(await getImageData(parseInt(req.query.year as string), parseInt(req.query.month as string)));
  });

  // Called by the front end when it loads.
  router.get("/latestImages", (req: Request, res: Response) => {
    res.json();
  });

  /**
   * POST /updateImage
   * Updates an image record.
   * Expects the following in the request body:
   * - A: Base64 encoded image data.
   * - size: 1 for small images, 2 for big images.
   * - camera: 1 for left camera, 2 for right camera.
   *
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   */
  router.post("/updateImage", (req: Request, res: Response) => {
    if (
      req.body.A === undefined ||
      req.body.size === undefined ||
      req.body.camera === undefined ||
      req.body.size < 1 ||
      req.body.camera < 1 ||
      req.body.size > 2 ||
      req.body.camera > 2
    )
      return res
        .status(400)
        .json({ error: "data, size or camera not provided", ...req.body, help: "add data, size and camera to body" });

    const index = req.body.size + 2 * (req.body.camera - 1) - 1;
    currentImages[index] = Buffer.from(req.body.A, "base64");

    //save this blob to an image file in case we need to reload
    fs.writeFile(__dirname + "/images/" + "image" + index + ".jpg", currentImages[index], (err) => {
      if (err) {
        console.error("Error saving image:", err);
      } else {
        console.log("Image saved as " + __dirname + "/images/" + "image" + index + ".jpg");
      }
    });

    if (index == 3)
      pb.collection("status").update(ToId("images"), {
        record: { lastImage: Math.floor(new Date().getTime() / 1000), sleeping: 0 },
      });

    // Store last 5 small images for each camera.
    if (req.body.size === 1) {
      if (req.body.camera === 1) {
        lastFiveSmallImagesCamera1.push({ image: currentImages[index], date: new Date().getTime() });
        if (lastFiveSmallImagesCamera1.length > 5) {
          lastFiveSmallImagesCamera1.shift(); // Remove the oldest image.
        }
      }
      if (req.body.camera === 2) {
        lastFiveSmallImagesCamera2.push({ image: currentImages[index], date: new Date().getTime() });
        if (lastFiveSmallImagesCamera2.length > 5) {
          lastFiveSmallImagesCamera2.shift(); // Remove the oldest image.
        }
      }
    }
    res.json({ status: "Ok", camera: req.body.camera, size: req.body.size, index: index });
  });

  router.get("/getSmallImages", (req: Request, res: Response) => {
    res.json({ images: [currentImages[0].toString("base64"), currentImages[2].toString("base64")] });
  });

  router.get("/getLargeImages", (req: Request, res: Response) => {
    res.json({ images: [currentImages[1].toString("base64"), currentImages[3].toString("base64")] });
  });

  router.get("/getLastFiveSmallImages", (req: Request, res: Response) => {
    let ans: BothCameraData = {
      camera1: [],
      camera2: [],
    };
    lastFiveSmallImagesCamera1.map((buf) => {
      ans.camera1.push({ image: buf.image.toString("base64"), date: buf.date });
    });
    lastFiveSmallImagesCamera2.map((buf) => {
      ans.camera2.push({ image: buf.image.toString("base64"), date: buf.date });
    });
    res.json(ans);
    // Add IP hit to database.
    hit(req);
  });

  router.post("/updateLog", (req: Request, res: Response) => {
    res.json({ status: "ok", sent: req.body });
  });

  router.get("/gotoSleep", (req: Request, res: Response) => {
    try {
      pb.collection("status")
        .getOne(ToId("images"))
        .then((result: any) => {
          pb.collection("status").update(ToId("images"), {
            record: { lastImage: result.record.lastImage, sleeping: 1 },
          });
        });
      res.json({ status: "going to sleep" });
    } catch (err: any) {
      console.error("Error updating status:", err);
      return res.status(500).json({ status: "error", message: err.message });
    }
  });

  router.get("/wakeUp", (req: Request, res: Response) => {
    try {
      pb.collection("status")
        .getOne(ToId("images"))
        .then((result: any) => {
          pb.collection("status").update(ToId("images"), {
            record: { lastImage: result.record.lastImage, sleeping: 0 },
          });
        });
      res.json({ status: "going to sleep" });
    } catch (err: any) {
      console.error("Error updating status:", err);
      return res.status(500).json({ status: "error", message: err.message });
    }
  });
  return router;
};
