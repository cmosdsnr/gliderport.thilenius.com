/**
 *
 * **This module is responsible for archiving wind sensor data stored in the PocketBase
 * "wind" collection. It packages the data into a compact binary format, saves it to a
 * file (named by month and year), and then deletes the archived records from PocketBase.**
 *
 * Key Responsibilities:
 * - File System & Directory Management: Determines the archive directory from either
 *   a local "../bin" directory or a fallback "/app/gliderport/bin".
 * - Data Packing & File Creation: Packs each wind data record into a 10-byte Buffer and
 *   writes them to a binary file with a "YYYY-MM.bin" filename.
 * - Archive Management: Scans for the most recent archive, calculates the next month
 *   to archive based on Los Angeles local time (using date-fns-tz), verifies record
 *   completeness, archives new records, and deletes old records.
 * - Scheduled Archival & Notification: Runs a scheduled archival job (via node-cron)
 *   on the 2nd day of every month and sends email notifications with logs.
 * - Express Router Integration: Exposes an Express endpoint to manually trigger
 *   the archival process.
 *
 * Dependencies: express, date-fns-tz, fs/promises, path, url, node-cron, PocketBase, sendMeEmail, ToId.
 *
 * @module archive
 */

import { Request, Response, Router } from "express";
import { fromZonedTime } from "date-fns-tz";
import { sendMeEmail } from "./sendMeEmail";

import { pb } from "pb.js";
import cron from "node-cron";

import { logStr, writeLog } from "log.js";
import { __dirname } from "miscellaneous.js";
import fs from "fs/promises";
import path from "path";

/**
 * @typedef {Array<number, number, number, number, number, number>} RecordType
 * A wind data record consisting of:
 * [timestamp, speed, direction, temperature, humidity, pressure]
 */
type RecordType = [number, number, number, number, number, number];

/**
 * Packs a wind data record into a 10-byte Buffer.
 * The first 4 bytes represent the timestamp (32-bit unsigned integer).
 * The next 6 bytes represent a 48-bit packed field of:
 *   - speed: 9 bits
 *   - direction: 9 bits
 *   - temperature: 10 bits
 *   - humidity: 7 bits
 *   - pressure: 13 bits
 *
 * @param {RecordType} record - The wind data record.
 * @returns {Buffer} A Buffer containing the packed record.
 */
function packRecord(record: RecordType): Buffer {
  const buf = Buffer.alloc(10); // Allocate 10 bytes: 4 for timestamp, 6 for packed values.
  buf.writeUInt32LE(record[0], 0); // Write timestamp (little-endian).

  let packed = BigInt(0);
  // Mask each field to ensure it fits within its designated bit-size.
  const speed = record[1] & 0x1ff; // 9 bits.
  const direction = record[2] & 0x1ff; // 9 bits.
  const temperature = record[3] & 0x3ff; // 10 bits.
  const humidity = record[4] & 0x7f; // 7 bits.
  const pressure = (record[5] < 0 ? (1 << 13) + record[5] : record[5]) & 0x1fff; // 13 bits.

  // Pack fields sequentially into a 48-bit value.
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
 * Saves an array of wind data records to a binary file.
 * Each record is packed into a 10-byte Buffer; all buffers are concatenated
 * and written to a file named according to the "YYYY-MM.bin" format.
 *
 * @param {RecordType[]} records - Array of wind data records.
 * @param {string} filename - The name of the binary file to save.
 * @returns {Promise<void>} Resolves when the file is written.
 */
async function saveRecordsToBinaryFile(records: RecordType[], filename: string): Promise<void> {
  const log: string[] = [""];
  const buffers = records.map(packRecord);
  const outputBuffer = Buffer.concat(buffers);
  const outputPath = path.join(__dirname, "/bin/", filename);
  await fs.writeFile(outputPath, outputBuffer);
  logStr(log, "saveRecordsToBinaryFile", `Saved ${records.length} records to ${filename}`);
  writeLog(log);
}

/**
 * Scans the archive directory for files matching the "YYYY-MM.bin" pattern and returns the most recent one.
 *
 * @returns {Promise<string|null>} The filename of the most recent archive, or null if none are found.
 */
async function getMostRecentArchiveFile(): Promise<string | null> {
  const log: string[] = [""];
  try {
    const files = await fs.readdir(__dirname + "/bin");
    const binFiles = files.filter((f) => /^\d{4}-\d{2}\.bin$/.test(f));
    if (binFiles.length === 0) return null;
    binFiles.sort();
    return binFiles[binFiles.length - 1];
  } catch (error) {
    logStr(log, "getMostRecentArchiveFile", "Error reading bin directory:", error);
    writeLog(log);
    return null;
  }
}

/**
 * Archives the next month's wind data records from the PocketBase "wind" collection.
 *
 * The process involves:
 *  1. Retrieving the most recent archive file.
 *  2. Parsing the file's year and month to determine the next month.
 *  3. Calculating start timestamps for the target month and the following month (using LA local time).
 *  4. Verifying that the target month is complete.
 *  5. Querying PocketBase for records within the target month, packing them, and writing them to a binary file.
 *  6. Deleting any records older than the target month's start timestamp.
 *
 * @returns {Promise<void>} Resolves when the archival process is complete.
 */
async function archiveLastMonth(): Promise<void> {
  const log: string[] = [""];
  try {
    // Step 1: Retrieve the most recent archive file.
    const mostRecentFile = await getMostRecentArchiveFile();
    if (!mostRecentFile) {
      logStr(log, "archiveLastMonth", "No archived files found in the bin directory. Aborting archive.");
      return;
    }
    logStr(log, "archiveLastMonth", "Most recent archived file:", mostRecentFile);

    // Step 2: Parse year and month from the filename.
    const [recentYearStr, recentMonthStrWithExt] = mostRecentFile.split("-");
    const recentYear = parseInt(recentYearStr, 10);
    const recentMonth = parseInt(recentMonthStrWithExt.substring(0, 2), 10);

    // Determine the next month to archive.
    let nextMonth: number, nextYear: number;
    if (recentMonth < 12) {
      nextMonth = recentMonth + 1;
      nextYear = recentYear;
    } else {
      nextMonth = 1;
      nextYear = recentYear + 1;
    }

    // Step 3: Calculate start timestamps for the next month and following month.
    const nextMonthStartStr = `${nextYear}-${nextMonth.toString().padStart(2, "0")}-01 00:00:00`;
    const nextMonthStartUTC = fromZonedTime(nextMonthStartStr, "America/Los_Angeles");
    const nextMonthStartTimestamp = Math.floor(nextMonthStartUTC.getTime() / 1000);

    let followingMonth: number, followingYear: number;
    if (nextMonth < 12) {
      followingMonth = nextMonth + 1;
      followingYear = nextYear;
    } else {
      followingMonth = 1;
      followingYear = nextYear + 1;
    }
    const followingMonthStartStr = `${followingYear}-${followingMonth.toString().padStart(2, "0")}-01 00:00:00`;
    const followingMonthStartUTC = fromZonedTime(followingMonthStartStr, "America/Los_Angeles");
    const followingMonthStartTimestamp = Math.floor(followingMonthStartUTC.getTime() / 1000);

    logStr(log, "archiveLastMonth", `Next month to archive: ${nextYear}-${nextMonth.toString().padStart(2, "0")}`);
    logStr(log, "archiveLastMonth", `Time span: ${nextMonthStartTimestamp} to ${followingMonthStartTimestamp}`);

    // Step 4: Verify that the target month is complete.
    const completeFilter = `id >= "${followingMonthStartTimestamp}"`;
    const completeRecords = await pb.collection("wind").getFullList(1, { sort: "id", filter: completeFilter });
    if (completeRecords.length === 0) {
      logStr(log, "archiveLastMonth", "Next month is not complete (no records for following month). Aborting archive.");
      return;
    }

    // Step 5: Query for records in the target month.
    const filter = `id >= "${nextMonthStartTimestamp}" && id < "${followingMonthStartTimestamp}"`;
    const pbRecords = await pb.collection("wind").getFullList(100000, { sort: "id", filter });
    logStr(
      log,
      "archiveLastMonth",
      `Found ${pbRecords.length} records to archive for ${nextYear}-${nextMonth.toString().padStart(2, "0")}.`
    );
    if (pbRecords.length === 0) {
      logStr(log, "archiveLastMonth", "No records found for the target month. Nothing to archive.");
      return;
    }

    // Map PocketBase records to RecordType.
    const recordsToArchive: RecordType[] = pbRecords.map((record: any) => {
      const timestamp = parseInt(record.id, 10);
      return [
        timestamp,
        record.speed > 511 ? 511 : record.speed,
        record.direction > 359 ? 359 : record.direction,
        record.temperature > 1023 ? 1023 : record.temperature,
        record.humidity,
        record.pressure > 4090 ? 4090 : record.pressure < -4090 ? -4090 : record.pressure,
      ] as RecordType;
    });

    // Step 6: Save the records to a binary file.
    const filename = `${nextYear}-${nextMonth.toString().padStart(2, "0")}.bin`;
    await saveRecordsToBinaryFile(recordsToArchive, filename);
    logStr(log, "archiveLastMonth", `Archived ${recordsToArchive.length} records to ${filename}.`);

    // Step 7: Delete any wind records older than the target month.
    const deleteFilter = `id < "${nextMonthStartTimestamp}"`;
    const recordsToDelete = await pb.collection("wind").getFullList(100000, { sort: "id", filter: deleteFilter });
    logStr(log, "archiveLastMonth", `Found ${recordsToDelete.length} records to delete (older than next month start).`);
    for (const record of recordsToDelete) {
      try {
        await pb.collection("wind").delete(record.id);
        logStr(log, "archiveLastMonth", `Deleted record with id ${record.id}`);
      } catch (err) {
        logStr(log, "archiveLastMonth", `Error deleting record with id ${record.id}:`, err);
      }
    }
    logStr(log, "archiveLastMonth", "Archiving complete. Old records have been deleted.");
  } catch (error) {
    logStr(log, "archiveLastMonth", "Error in archiveLastMonth:", error);
  }
}

/**
 * Runs the scheduled archival job.
 * Logs the start and completion of the monthly archive process, and sends an email
 * notification with the logs using sendMeEmail.
 *
 * @returns {Promise<void>} Resolves when the archival job is complete.
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
  writeLog(log);
};

// Schedule the archival job to run at 00:00 on the 2nd day of every month in Los Angeles time.
cron.schedule("0 0 2 * *", runScheduledArchive, { timezone: "America/Los_Angeles" });

/**
 * Creates and returns an Express router for archival endpoints.
 *
 * Exposed Endpoints:
 * - GET /runScheduledArchive: Manually triggers the archival process.
 *
 * @returns {Router} An Express Router with defined endpoints.
 */
export const archiveRoutes = (): Router => {
  const router = Router();

  router.get("/runScheduledArchive", async (req: Request, res: Response) => {
    try {
      runScheduledArchive();
      res.status(200).send("Archive job started.");
    } catch (error) {
      res.status(500).send("Error reading archive files.");
    }
  });

  return router;
};
