/**
 *
 * This module handles exporting monthly chunks of sensor data to binary files,
 * reading these files, and scheduling a cron job for automated exports.
 * It uses timezone-aware date handling via Luxon, file system and path utilities,
 * as well as custom SQL and logging utilities.
 *
 * @module MonthlyExport
 */

import { DateTime } from "luxon"; // Luxon enables timezone-aware date/time manipulation

// SQL connection and logging utilities
import { log } from "../log"; // Custom logging utility to track application events

// Import SQL helper functions and type definitions for handling sensor data
import { getEarliestRecord, getLatestRecord, getRawRecordsBetweenDate, removeRecordsOlderThan } from "./sqlFunctions"; // SQL queries to get record time range and data
import { SensorPackedRecord } from "./binaryFunctions"; // Type definition for a packed sensor record
import { readRecordsFromBinaryFile, saveRecordsToBinaryFile } from "./fileOps"; // Utilities for reading from and writing to binary files

// Import node-cron to schedule recurring tasks (e.g., monthly data exports)
import cron from "node-cron";

/**
 * Exports monthly chunks of raw_data to binary files using Los Angeles time.
 *
 * This function performs the following steps:
 * 1. Retrieves the earliest and latest record timestamps (in epoch seconds) from the database.
 * 2. Determines the full month range available (using LA timezone) and excludes the current partial month.
 * 3. For each complete month:
 *    - Calculates the start and end epoch seconds.
 *    - Fetches sensor records from the database within that epoch range.
 *    - Saves the records to a binary file named in the format `${YYYY}-${MM}.bin`.
 *
 * @function exportMonthlyBinaryFiles
 * @returns {Promise<void>} A promise that resolves when the export is complete.
 */
export const exportMonthlyBinaryFiles = async (): Promise<void> => {
  // Retrieve the earliest and latest timestamps from the raw_data table.
  const earliestEpoch = await getEarliestRecord();
  const latestEpoch = await getLatestRecord();

  // Exit if no valid data is available.
  if (!earliestEpoch || !latestEpoch) {
    log("exportMonthlyBinaryFiles", "No data in raw_data table.");
    return;
  }

  // Initialize the current pointer to the start of the month for the earliest record, using LA time.
  let current = DateTime.fromSeconds(earliestEpoch, { zone: "America/Los_Angeles" }).startOf("month");
  // Define the end boundary as the start of the month before the latest record (to avoid partial data).
  const end = DateTime.fromSeconds(latestEpoch, { zone: "America/Los_Angeles" }).startOf("month").minus({ months: 1 });

  // Process each full month within the available data range.
  while (current < end) {
    // Calculate the beginning of the next month.
    const next = current.plus({ months: 1 });

    // Convert the current and next DateTime objects to epoch seconds.
    const startEpoch = Math.floor(current.toSeconds());
    const endEpoch = Math.floor(next.toSeconds());

    // Log the current month and its corresponding epoch range.
    log("exportMonthlyBinaryFiles", `Fetching data for ${current.toFormat("yyyy-MM")} (${startEpoch}–${endEpoch})`);

    // Retrieve sensor records for the current month from the database.
    const records: SensorPackedRecord[] = await getRawRecordsBetweenDate(startEpoch, endEpoch);

    // If records are found, generate a filename and save the records as a binary file.
    if (records?.length > 0) {
      // Construct the filename using the format 'YYYY-MM.bin'
      const filename = `${current.year}-${current.month.toString().padStart(2, "0")}.bin`;
      await saveRecordsToBinaryFile(records, filename);
    } else {
      log("exportMonthlyBinaryFiles", `No records found for ${current.toFormat("yyyy-MM")}`);
    }

    // Advance to the next month.
    current = next;
  }

  // Remove records older than 2 full months from the latest record.
  const remove = DateTime.fromSeconds(latestEpoch, { zone: "America/Los_Angeles" })
    .startOf("month")
    .minus({ months: 2 });
  try {
    await removeRecordsOlderThan(remove.toSeconds());
  } catch (err: any) {
    log("exportMonthlyBinaryFiles", "Error removing old records:", err.message);
  }

  log("exportMonthlyBinaryFiles", "Monthly export complete.");
};

// Cron schedule configuration to automatically run the monthly export job.
// The cron pattern "0 2 2 * *" means:
//   - Minute: 0
//   - Hour: 2 (i.e., 2 AM)
//   - Day of Month: 2 (the 2nd day of each month)
//   - Month: Every month
//   - Day of Week: Every day (irrelevant since day-of-month is specified)
cron.schedule(
  "0 2 2 * *", // Cron pattern: run at 2:00 AM on the 2nd day of every month.
  async () => {
    // Log the start of the monthly export job.
    log("cron", "📦 Running monthly export job...");

    // Execute the exportMonthlyBinaryFiles function to process and save data.
    await exportMonthlyBinaryFiles();

    // Log the successful completion of the export job.
    log("cron", "✅ Monthly export job complete.");
  },
  {
    timezone: "America/Los_Angeles", // Ensure the job runs based on Los Angeles local time.
  }
);
