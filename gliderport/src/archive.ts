/**
 * @packageDocumentation
 *
 * This module is responsible for archiving wind sensor data stored in the PocketBase
 * "wind" collection. It packages the data into a compact binary format, saves it to a
 * file (named by month and year), and then deletes the archived records from PocketBase.
 *
 * ## Key Responsibilities
 * - **File System & Directory Management**: Determines the archive directory from either
 *   a local `../bin` directory or a fallback `/app/gliderport/bin`.
 * - **Data Packing & File Creation**: Packs each wind data record into a 10-byte `Buffer` and
 *   writes them to a binary file with a `YYYY-MM.bin` filename.
 * - **Archive Management**: Scans for the most recent archive, calculates the next month
 *   to archive based on Los Angeles local time (using `date-fns-tz`), verifies record
 *   completeness, archives new records, and deletes old records.
 * - **Scheduled Archival & Notification**: Runs a scheduled archival job (via `node-cron`)
 *   on the 2nd day of every month and sends email notifications with logs.
 * - **Express Router Integration**: Exposes an Express endpoint to manually trigger
 *   the archival process.
 *
 * ## Dependencies
 * - `express`
 * - `date-fns-tz`
 * - `fs/promises`
 * - `path`
 * - `url`
 * - `node-cron`
 * - PocketBase (`pb.js`)
 * - `sendMeEmail`
 * - `logStr`, `writeLog` (from `log.js`)
 * - `__dirname` (from `miscellaneous.js`)
 *
 * @module archive
 */

import { Request, Response, Router } from "express";
import { fromZonedTime } from "date-fns-tz";
import { sendMeEmail } from "sendMeEmail";
import cron from "node-cron";
import fs from "fs/promises";
import path from "path";
import { pb } from "pb";
import { logStr, writeLog, __logDir, __dirname } from "log";
import { ToId } from "miscellaneous";
import { DateTime } from "luxon";

// Determine the log file path.
const __LogFile = path.join(__logDir, "gliderport.log");
/**
 * A wind data record consisting of:
 * 1. **timestamp**   – UNIX timestamp (seconds since epoch)
 * 2. **speed**       – 0–511
 * 3. **direction**   – 0–359
 * 4. **temperature** – 0–1023
 * 5. **humidity**    – 0–127
 * 6. **pressure**    – -4090–4090 (mapped into 0–8191 for packing)
 */
export type RecordType = [number, number, number, number, number, number];

/**
 * Packs a single wind data record into a 10-byte `Buffer`.
 *
 * The first 4 bytes (little-endian) store the UNIX timestamp (32-bit unsigned integer).
 * The remaining 6 bytes store a 48-bit packed field containing:
 * - **speed**: 9 bits  (0–511)
 * - **direction**: 9 bits  (0–359)
 * - **temperature**: 10 bits (0–1023)
 * - **humidity**: 7 bits  (0–127)
 * - **pressure**: 13 bits (-4090–4090 mapped to 0–8191)
 *
 * @param record - The wind data record to pack.
 * @returns A 10-byte `Buffer` containing the packed record.
 */
function packRecord(record: RecordType): Buffer {
  const buf = Buffer.alloc(10);
  buf.writeUInt32LE(record[0], 0);

  // Mask each field to ensure it fits within its designated bit-size.
  const speed = record[1] & 0x1ff; // 9 bits
  const direction = record[2] & 0x1ff; // 9 bits
  const temperature = record[3] & 0x3ff; // 10 bits
  const humidity = record[4] & 0x7f; // 7 bits
  const pressure = (record[5] < 0 ? (1 << 13) + record[5] : record[5]) & 0x1fff; // 13 bits

  // Pack fields sequentially into a 48-bit BigInt.
  let packed = BigInt(0);
  packed = (packed << BigInt(9)) | BigInt(speed);
  packed = (packed << BigInt(9)) | BigInt(direction);
  packed = (packed << BigInt(10)) | BigInt(temperature);
  packed = (packed << BigInt(7)) | BigInt(humidity);
  packed = (packed << BigInt(13)) | BigInt(pressure);

  // Write the packed 48-bit value into 6 bytes starting at offset 4.
  buf.writeUIntLE(Number(packed), 4, 6);
  return buf;
}

/**
 * Reads a binary archive file and unpacks all records into RecordType[].
 * @param filename - The archive filename (e.g., "2025-01.bin")
 * @returns Promise<RecordType[]> - Array of unpacked records
 */
export async function unpackRecords(filename: string): Promise<{ error?: string; records?: RecordType[] }> {
  const filePath = path.join(__dirname, "/gliderport/bin/", filename);
  //check file exists
  try {
    await fs.access(filePath);
  } catch (error) {
    return { error: `Archive file ${filename} does not exist.` };
  }
  const buffer = await fs.readFile(filePath);
  const recordSize = 10; // Each packed record is 10 bytes
  const count = Math.floor(buffer.length / recordSize);
  const records: RecordType[] = [];
  for (let i = 0; i < count; i++) {
    const offset = i * recordSize;
    const recBuf = buffer.subarray(offset, offset + recordSize);

    // Unpack the record
    const timestamp = recBuf.readUInt32LE(0);

    // Read the packed 6 bytes as a BigInt
    let packed = BigInt(0);
    for (let j = 0; j < 6; j++) {
      packed = (packed << 8n) | BigInt(recBuf[4 + j]);
    }

    // Helper to extract bits from packed value
    const extract = (bits: number): number => {
      const mask = (1n << BigInt(bits)) - 1n;
      const value = Number(packed & mask);
      packed >>= BigInt(bits);
      return value;
    };

    // Extract in reverse order of packing
    const pressure = extract(13);
    const humidity = extract(7);
    const temperature = extract(10);
    const direction = extract(9);
    const speed = extract(9);

    // Map pressure back to signed value
    const signedPressure = pressure > 4095 ? pressure - 8192 : pressure;

    records.push([timestamp, speed, direction, temperature, humidity, signedPressure]);
  }
  return { records };
}

export function statsOfRecords(records: RecordType[]): any {
  if (!records || records.length === 0) {
    return { error: "No records given to statsOfRecords." };
  }

  const stats: any = { count: records.length };

  // Initialize mins/maxs from the first record
  let [minTs, maxTs] = [records[0][0], records[0][0]];
  let [minSpeed, maxSpeed] = [records[0][1], records[0][1]];
  let [minDir, maxDir] = [records[0][2], records[0][2]];
  let [minTemp, maxTemp] = [records[0][3], records[0][3]];
  let [minHum, maxHum] = [records[0][4], records[0][4]];
  let [minPres, maxPres] = [records[0][5], records[0][5]];

  for (const [ts, sp, dir, tmp, hum, prs] of records) {
    if (ts < minTs) minTs = ts;
    if (ts > maxTs) maxTs = ts;

    if (sp < minSpeed) minSpeed = sp;
    if (sp > maxSpeed) maxSpeed = sp;

    if (dir < minDir) minDir = dir;
    if (dir > maxDir) maxDir = dir;

    if (tmp < minTemp) minTemp = tmp;
    if (tmp > maxTemp) maxTemp = tmp;

    if (hum < minHum) minHum = hum;
    if (hum > maxHum) maxHum = hum;

    if (prs < minPres) minPres = prs;
    if (prs > maxPres) maxPres = prs;
  }

  stats.minTimestamp = minTs;
  stats.maxTimestamp = maxTs;
  stats.minSpeed = minSpeed;
  stats.maxSpeed = maxSpeed;
  stats.minDirection = minDir;
  stats.maxDirection = maxDir;
  stats.minTemperature = minTemp;
  stats.maxTemperature = maxTemp;
  stats.minHumidity = minHum;
  stats.maxHumidity = maxHum;
  stats.minPressure = minPres;
  stats.maxPressure = maxPres;

  stats.startTime = DateTime.fromSeconds(minTs, { zone: "America/Los_Angeles" }).toFormat("yyyy-MM-dd HH:mm:ss");
  stats.endTime = DateTime.fromSeconds(maxTs, { zone: "America/Los_Angeles" }).toFormat("yyyy-MM-dd HH:mm:ss");

  return stats;
}

/**
 * Saves an array of wind data records to a binary file in the archive directory.
 * Each record is packed via {@link packRecord} and concatenated into a single `Buffer`.
 *
 * @param records  - Array of wind data records to save.
 * @param filename - Filename (in "YYYY-MM.bin" format) for the output binary.
 * @returns Resolves when the file write completes.
 */
async function saveRecordsToBinaryFile(records: RecordType[], filename: string): Promise<void> {
  const log: string[] = [""];
  const buffers = records.map(packRecord);
  const outputBuffer = Buffer.concat(buffers);
  const outputPath = path.join(__dirname, "/gliderport/bin/", filename);

  await fs.writeFile(outputPath, outputBuffer);
  writeLog(__LogFile, log);
}

/**
 * Append an array of wind data records to a binary file in the archive directory.
 * Each record is packed via {@link packRecord} and concatenated into a single `Buffer`.
 *
 * @param records  - Array of wind data records to save.
 * @param filename - Filename (in "YYYY-MM.bin" format) for the output binary.
 * @returns Resolves when the file write completes.
 */
async function appendRecordsToBinaryFile(records: RecordType[], filename: string): Promise<void> {
  const log: string[] = [""];
  const buffers = records.map(packRecord);
  const outputBuffer = Buffer.concat(buffers);
  const outputPath = path.join(__dirname, "/gliderport/bin/", filename);

  await fs.appendFile(outputPath, outputBuffer);
  writeLog(__LogFile, log);
}

/**
 * Scans the archive directory for files matching the "YYYY-MM.bin" pattern and returns
 * the most recent filename (lexicographically largest). If no matching files are found,
 * returns `null`.
 *
 * @returns The filename of the most recent archive, or `null` if none are found.
 */
async function getMostRecentArchiveFile(): Promise<string | null> {
  const log: string[] = [""];
  try {
    const files = await fs.readdir(path.join(__dirname, "/gliderport/bin"));
    const binFiles = files.filter((f) => /^\d{4}-\d{2}\.bin$/.test(f));
    if (binFiles.length === 0) return null;
    binFiles.sort(); // "2025-01.bin" < "2025-02.bin" < ...
    return binFiles[binFiles.length - 1];
  } catch (error) {
    logStr(log, "getMostRecentArchiveFile", "Error reading bin directory:", error);
    writeLog(__LogFile, log);
    return null;
  }
}

/**
 * Archives the next month's wind data records from the PocketBase "wind" collection.
 *
 * The archival process:
 *  1. Retrieve the most recent archive file (e.g. "2025-03.bin").
 *  2. Parse its year/month to determine the next month to archive.
 *  3. Calculate UNIX timestamps for the start of the target month and the start of the following month
 *     (using Los Angeles local time).
 *  4. Verify the target month is complete by checking for any record in the following month.
 *  5. Query PocketBase for all records with `id` (UNIX timestamp) in
 *     `[nextMonthStart, followingMonthStart)`, pack them, and write to "YYYY-MM.bin".
 *  6. Delete all wind records with `id` < nextMonthStart (i.e. older than the archived month).
 *
 * @returns Resolves when the archival and deletion steps finish.
 */
async function archiveLastMonth(): Promise<void> {
  const log: string[] = [""];
  try {
    // Step 1: Retrieve the most recent archive file.
    const mostRecentFile = await getMostRecentArchiveFile();
    if (!mostRecentFile) {
      logStr(log, "archiveLastMonth", "No archived files found in the bin directory. Aborting archive.");
      writeLog(__LogFile, log);
      return;
    }
    logStr(log, "archiveLastMonth", "Most recent archived file:", mostRecentFile);

    // Step 2: Parse year and month from "YYYY-MM.bin".
    const [recentYearStr, recentMonthStrWithExt] = mostRecentFile.split("-");
    const recentYear = parseInt(recentYearStr, 10);
    const recentMonth = parseInt(recentMonthStrWithExt.substring(0, 2), 10);

    // create DateTime object for the last month start
    const MonthStart = DateTime.fromObject(
      { year: recentYear, month: recentMonth, day: 1 },
      { zone: "America/Los_Angeles" },
    ).plus({ months: 1 });

    const MonthEnd = MonthStart.plus({ months: 1 });

    if (MonthEnd.plus({ months: 1 }).toSeconds() > DateTime.now().toSeconds()) {
      logStr(
        log,
        "archiveLastMonth",
        "Month to archive is not old enough. Need more than 1 mo. buffer. Aborting archive.",
      );
      writeLog(__LogFile, log);
      return;
    }

    const filename = `${MonthStart.toFormat("yyyy-MM")}.bin`;

    logStr(log, "archiveLastMonth", `Next month to archive: ${MonthStart.toFormat("MM-yy")}`);
    logStr(log, "archiveLastMonth", `Time span: ${MonthStart.toSeconds()} to ${MonthEnd.toSeconds()}`);

    // Step 4: Verify the target month is complete (look for any record in the following month).
    const completeFilter = `id >= "${ToId(MonthEnd.toSeconds().toString())}"`;
    const firstItem = await pb
      .collection("wind")
      .getFirstListItem(completeFilter)
      .catch(() => null);
    if (!firstItem) {
      logStr(log, "archiveLastMonth", "Next month is not complete. Aborting archive.");
      writeLog(__LogFile, log);
      return;
    }
    writeLog(__LogFile, log);
    log.length = 0; // Clear log for next steps

    // Step 5: Query PocketBase for all records in [nextMonthStart, followingMonthStart).
    const filter = `id >= "${ToId(MonthStart.toSeconds().toString())}" && id <= "${ToId(
      MonthEnd.toSeconds().toString(),
    )}"`;

    const batchSize = 500;
    let page = 1;
    let allRecords: RecordType[] = [];
    let totalCount = 0;
    let deleteCount = 0;
    let idsToDelete: string[][] = [];

    while (true) {
      const response = await pb.collection("wind").getList(page, batchSize, {
        filter: filter,
        sort: "id", // optional
      });

      // Map PocketBase records into RecordType tuples.
      const recordsToArchive: RecordType[] = response.items.map((record: any) => {
        const timestamp = parseInt(record.id, 10);
        return [
          timestamp,
          record.windSpeed,
          record.windAngle,
          record.bmpTemp == 0 ? record.dhtTemp : record.bmpTemp, // Use bmpTemp if available, otherwise fallback to dhtTemp
          record.dhtHumidity,
          record.bmpPressure,
        ] as RecordType;
      });
      idsToDelete.push(response.items.map((r: any) => r.id));
      allRecords = allRecords.concat(recordsToArchive);
      if (allRecords.length > 0 && (allRecords.length >= 5000 || response.items.length < batchSize)) {
        totalCount === 0
          ? await saveRecordsToBinaryFile(allRecords, filename)
          : await appendRecordsToBinaryFile(allRecords, filename);
        totalCount += allRecords.length;
        logStr(log, "saveRecordsToBinaryFile", `Saved ${allRecords.length} records to ${filename}`);
        allRecords.length = 0; // Clear for next batch
      }
      if (response.items.length < batchSize) break;
      page++;
    }

    for (const ids of idsToDelete) {
      const batch = pb.createBatch();
      ids.forEach((id: string) => batch.collection("wind").delete(id));
      if (ids.length > 0)
        await batch.send().catch((err: any) => {
          logStr(log, "archiveLastMonth", "Error deleting records in batch:", err);
        });
      deleteCount += ids.length;
    }

    console.log(`Total filtered records fetched: ${totalCount} for ${MonthStart.toFormat("yyyy-MM")}.`);
    if (totalCount === 0) {
      logStr(log, "archiveLastMonth", "No records found for the target month. Nothing to archive.");
      writeLog(__LogFile, log);
      return;
    } else
      logStr(
        log,
        "archiveLastMonth",
        `Total filtered records fetched: ${totalCount} for ${MonthStart.toFormat("yyyy-MM")}.`,
      );

    logStr(log, "archiveLastMonth", `Deleted ${deleteCount} Old records.`);
    logStr(log, "archiveLastMonth", "Archiving complete. Old records have been deleted.");
    writeLog(__LogFile, log);
  } catch (error) {
    logStr(log, "archiveLastMonth", "Error in archiveLastMonth:", error);
    writeLog(__LogFile, log);
  }
}

/**
 * Runs the scheduled archival job for wind data.
 *
 * Logs the start and completion of the monthly archive process, and sends an email
 * notification with the logs using {@link sendMeEmail}. Any exceptions during the process
 * result in a failure email and are logged.
 *
 * @returns Resolves when the archival job and email notification complete.
 */
export const runScheduledArchive = async (): Promise<void> => {
  const log: string[] = [""];
  logStr(log, "archive cron", "Running monthly archive job on the 2nd day...");
  try {
    await archiveLastMonth();
    logStr(log, "archive cron", "Monthly archive job completed.");
    sendMeEmail("Monthly archive job completed.", log);
  } catch (error: any) {
    logStr(log, "archive cron", "Error in monthly archive job:", error.message);
    sendMeEmail("Monthly archive job failed.", log);
  }
  writeLog(__LogFile, log);
};

// Schedule the archival job to run at 00:00 on the 2nd day of every month in Los Angeles time.
cron.schedule("0 0 2 * *", runScheduledArchive, { timezone: "America/Los_Angeles" });

/**
 * Creates and returns an Express router for archive-related endpoints.
 *
 * @returns A new Express `Router` that exposes:
 *   GET /runScheduledArchive → manually triggers the archival process.
 *
 * Mount this on your app or a sub-route to provide archive endpoints.
 *
 * @returns A `Router` with the route `/runScheduledArchive`.
 */
export const archiveRoutes = (): Router => {
  const router = Router();

  /**
   * Manually triggers the monthly archival process.
   *
   * @route GET /runScheduledArchive
   * @returns A 200 response if the job starts successfully, or a 500 status if an error occurs.
   */
  router.get("/runScheduledArchive", async (req: Request, res: Response) => {
    try {
      runScheduledArchive();
      res.status(200).send("Archive job started.");
    } catch (error) {
      res.status(500).send("Error starting archive job.");
    }
  });

  router.get("/unpackArchive", async (req: Request, res: Response) => {
    if (!req.query.month || !req.query.year) {
      return res.status(400).send("Missing month or year query parameters.");
    }
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return res.status(400).send("Invalid month or year query parameters.");
    }
    if (year < 2015 || year > new Date().getFullYear()) {
      return res.status(400).send("Year out of range.");
    }
    const filename = `${req.query.year}-${month.toString().padStart(2, "0")}.bin`;
    let r: any = {};

    try {
      r = await unpackRecords(filename);
      if (r.error) {
        res.status(404).send({ filename, error: r.error });
        return;
      }
    } catch (error: any) {
      res.status(500).json({ filename, error: "Error unpackRecords. " + error.message });
      return;
    }

    try {
      const stats = statsOfRecords(r.records!);
      res.status(200).json({ filename, stats });
      return;
    } catch (error: any) {
      res.status(500).json({ filename, error: "Error statsOfRecords. " + error.message });
      return;
    }
  });

  return router;
};
