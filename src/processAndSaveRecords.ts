// import { fromZonedTime, format } from "date-fns-tz";
// import { enGB } from "date-fns/locale";
import fs from "fs/promises";
import path from "path";
import { connection } from "sql";
import { log } from "./log";

import { dirname } from "path";
import { fileURLToPath } from "url";
const __f = fileURLToPath(import.meta.url);
const __dirname = dirname(__f) + "/../bin";

import { pb } from "pb.js";
import cron from "node-cron";

const getRawRecordsBetweenDate = async (start: number, stop: number): Promise<any> => {
  if (connection === null) {
    return null;
  }
  const sql = "SELECT * FROM `raw_data` WHERE `epoch` < " + stop + " AND `epoch` >= " + start + " ORDER BY epoch ASC;";
  const [rawRows]: [any[], any[]] = await connection.promise().query(sql);
  return rawRows;
};

const getEarliestRecord = async (): Promise<any> => {
  if (connection === null) {
    return null;
  }
  const sql = "SELECT * FROM `raw_data` ORDER BY epoch ASC LIMIT 1;";
  const [rawRows]: [any[], any[]] = await connection.promise().query(sql);
  if (!rawRows.length) {
    return null;
  }
  return rawRows[0].epoch;
};

// Define the column names you're analyzing
const columns = ["speed", "angle", "count", "tc", "t", "tr", "c", "h", "dt", "bt", "p"];

/**
 * Calculates min, max, and range for each column in `raw_data`,
 * and logs the result in a formatted table.
 *
 * @returns Object mapping each column to its min, max, and range values.
 */
export const getRawDataMinMax = async (): Promise<Record<string, { min: number; max: number; range: number }>> => {
  return new Promise((resolve, reject) => {
    if (!connection) {
      log("getRawDataMinMax", "❌ No SQL connection");
      return reject("No SQL connection");
    }

    const selectParts = columns.map((col) => `MIN(${col}) AS ${col}_min, MAX(${col}) AS ${col}_max`);
    const sql = `SELECT ${selectParts.join(", ")} FROM raw_data`;

    connection.query(sql, (err, results: any) => {
      if (err) {
        log("getRawDataMinMax", "❌ Query failed:", err.message);
        return reject(err);
      }

      const row = results[0];
      const output: Record<string, { min: number; max: number; range: number }> = {};

      // Table header
      log("getRawDataMinMax", "╔════════════╦════════════╦════════════╦════════════╗");
      log("getRawDataMinMax", "║   Column   ║    Min     ║    Max     ║   Range    ║");
      log("getRawDataMinMax", "╠════════════╬════════════╬════════════╬════════════╣");

      columns.forEach((col) => {
        const min = row[`${col}_min`];
        const max = row[`${col}_max`];
        const range = max - min;

        output[col] = { min, max, range };

        const colName = col.padEnd(10, " ");
        const minStr = min.toFixed(2).padStart(10, " ");
        const maxStr = max.toFixed(2).padStart(10, " ");
        const rangeStr = range.toFixed(2).padStart(10, " ");

        log("getRawDataMinMax", `║ ${colName} ║ ${minStr} ║ ${maxStr} ║ ${rangeStr} ║`);
      });

      log("getRawDataMinMax", "╚════════════╩════════════╩════════════╩════════════╝");

      resolve(output);
    });
  });
};
getRawDataMinMax();

// Define our record type:
// const { speed, angle, count, tc, t, tr, c, h, dt, bt, p } = row;
type RecordType = [number, number, number, number, number, number];

/**
 * Pack one record into a 12-byte Buffer.
 * - First 4 bytes: a 32-bit unsigned integer (timestamp).
 * - Next 6 bytes: a 48-bit field that packs:
 *   - speed : 9 bits, direction : 9 bits, humidity : 7 bits, temperature : 10 bits (= 35 bits)
 *   - 1 signed 13-bit value: pressure (13 bits)
 *   Total = 48 bits, 6 bytes, leaving 0 bits unused.
 */
function packRecord(record: RecordType): Buffer {
  // Allocate 10 bytes: 4 for timestamp + 6 for packed values.
  const buf = Buffer.alloc(10);

  // Write the timestamp as a 32-bit unsigned integer (little-endian).
  buf.writeUInt32LE(record[0], 0);

  let packed = BigInt(0);
  const speed = record[1] & 0x1ff; // Ensure the value fits in 9 bits.
  const direction = record[2] & 0x1ff; // Ensure the value fits in 9 bits.
  const temperature = record[3] & 0x3ff; // Ensure the value fits in 10 bits.
  const humidity = record[4] & 0x7f; // Ensure the value fits in 7 bits.
  const pressure = (record[5] < 0 ? (1 << 13) + record[5] : record[5]) & 0x1fff; // Ensure the value fits in 13 bits.

  packed = (packed << BigInt(9)) | BigInt(speed);
  packed = (packed << BigInt(9)) | BigInt(direction);
  packed = (packed << BigInt(10)) | BigInt(temperature);
  packed = (packed << BigInt(7)) | BigInt(humidity);
  packed = (packed << BigInt(13)) | BigInt(pressure);

  // Write the packed 48-bit value into 6 bytes at offset 4.
  // Since 48 bits fits in a Number (safe up to 2^53), we can convert it.
  buf.writeUIntLE(Number(packed), 4, 6);

  return buf;
}

/**
 * Save an array of records to a binary file.
 * Each record is packed into 12 bytes.
 * The filename is "{month}-{year}.bin".
 */
async function saveRecordsToBinaryFile(records: RecordType[], filename: string): Promise<void> {
  const buffers = records.map(packRecord);
  const outputBuffer = Buffer.concat(buffers);
  const outputPath = path.join(__dirname, filename);
  await fs.writeFile(outputPath, outputBuffer);
  console.log(`Saved ${records.length} records to ${filename}`);
}

/**
 * Process all records from the SQL database, grouping them by LA month and year.
 * For each group, pack the records into binary format and save them to a file.
 */
export async function processAndSaveRecords() {
  try {
    // 1. Query all records from gliderport, sorted ascending by 'recorded'.
    const sqlQuery = "SELECT * FROM gliderport WHERE 1 ORDER BY recorded ASC";
    const hoursResult = await connection?.promise().query<any[]>(sqlQuery);
    const result = hoursResult ? hoursResult[0] : [];
    console.log(`Got ${result.length} records from SQL.`);

    // Variables for grouping by month/year.
    let currentMonth: number | null = null;
    let currentYear: number | null = null;
    let recordsForMonth: RecordType[] = [];

    // Process each record.
    for (const row of result) {
      // Convert the local LA time (row.recorded) to a UTC Date using fromZonedTime.
      //   const utcDate = fromZonedTime(row.recorded, "America/Los_Angeles");
      // Since the timestamp fits in 32 bits, we assume it’s in milliseconds.
      const timestamp = row.timestamp;

      // Determine the local month and year (based on LA time).
      const laDate = new Date(1000 * timestamp);
      const month = laDate.getMonth() + 1; // getMonth() returns 0-indexed month.
      const year = laDate.getFullYear();

      // If this is the first record, initialize current grouping.
      if (currentMonth === null || currentYear === null) {
        currentMonth = month;
        currentYear = year;
      }

      // When month or year changes, save the current group.
      if (month !== currentMonth || year !== currentYear) {
        const filename = `${currentYear}-${currentMonth.toString().padStart(2, "0")}.bin`;
        await saveRecordsToBinaryFile(recordsForMonth, filename);
        // Reset the group for the new month.
        recordsForMonth = [];
        currentMonth = month;
        currentYear = year;
      }

      // Build the record using fields from the row.
      // Adjust the field names if necessary.
      // speed, direction, temperature, humidity, pressure
      const rec: RecordType = [
        timestamp,
        row.speed > 511 ? 511 : row.speed,
        row.direction > 359 ? 359 : row.direction,
        row.temperature > 1023 ? 1023 : row.temperature,
        row.humidity,
        row.pressure > 4090 ? 4090 : row.pressure < -4090 ? -4090 : row.pressure,
      ];
      recordsForMonth.push(rec);
    }

    // Save any remaining records.
    if (recordsForMonth.length > 0 && currentMonth !== null && currentYear !== null) {
      const filename = `${currentYear}-${currentMonth.toString().padStart(2, "0")}.bin`;
      await saveRecordsToBinaryFile(recordsForMonth, filename);
    }

    console.log("Processing complete.");
  } catch (error) {
    console.error("Error processing records:", error);
  }
}

/**
 * Unpacks a 10-byte Buffer into a RecordType.
 *
 * RecordType format: [timestamp, speed, direction, temperature, humidity, pressure]
 *
 * Buffer layout (little-endian):
 * - Bytes 0-3: 32-bit unsigned integer (timestamp).
 * - Bytes 4-9: 48 bits of packed data:
 *    - speed: 9 bits
 *    - direction: 9 bits
 *    - temperature: 10 bits
 *    - humidity: 7 bits
 *    - pressure: 13 bits (signed, two's complement)
 */
function unpackRecord(buf: Buffer): [number, number, number, number, number, number] {
  // Read the first 4 bytes as the timestamp.
  const timestamp = buf.readUInt32LE(0);

  // Read the next 6 bytes as a 48-bit unsigned number.
  const packed = BigInt(buf.readUIntLE(4, 6));

  // We now need to extract the fields in reverse order:
  // Lowest 13 bits: pressure
  // Next 7 bits: humidity
  // Next 10 bits: temperature
  // Next 9 bits: direction
  // Next 9 bits: speed

  let tempPacked = packed;
  const pressureRaw = Number(tempPacked & BigInt(0x1fff)); // 13 bits mask: 0x1fff = 8191
  tempPacked = tempPacked >> BigInt(13);

  const humidity = Number(tempPacked & BigInt(0x7f)); // 7 bits mask: 0x7f = 127
  tempPacked = tempPacked >> BigInt(7);

  const temperature = Number(tempPacked & BigInt(0x3ff)); // 10 bits mask: 0x3ff = 1023
  tempPacked = tempPacked >> BigInt(10);

  const direction = Number(tempPacked & BigInt(0x1ff)); // 9 bits mask: 0x1ff = 511
  tempPacked = tempPacked >> BigInt(9);
  if (direction > 359) console.log("direction", direction);

  const speed = Number(tempPacked & BigInt(0x1ff)); // 9 bits mask: 0x1ff = 511

  // Convert pressure from 13-bit two's complement.
  let pressure = pressureRaw;
  if (pressure >= 4096) {
    // if the sign bit is set
    pressure = pressure - 8192;
  }

  return [timestamp, speed, direction, temperature, humidity, pressure];
}

/**
 * Reads a binary file where each record is 12 bytes long and unpacks it into an array of records.
 * @param filename The path to the binary file.
 * @returns An array of RecordType.
 */
async function readBinaryFileToArray(filename: string): Promise<RecordType[]> {
  // Read the entire file into a Buffer.
  const fileBuffer = await fs.readFile(filename);
  const recordSize = 10;
  const recordCount = Math.floor(fileBuffer.length / recordSize);
  const records: RecordType[] = [];

  // Loop through the file Buffer in chunks of 12 bytes.
  for (let i = 0; i < recordCount; i++) {
    const offset = i * recordSize;
    const recordBuffer = fileBuffer.slice(offset, offset + recordSize);
    const record = unpackRecord(recordBuffer);
    // records.push(record);
  }

  return records;
}

function printMinMax(records: RecordType[]) {
  const fieldNames = ["timestamp", "speed", "direction", "temperature", "humidity", "pressure"];

  // Initialize statistics for each field.
  const stats: Record<string, { min: number; max: number }> = {};
  for (const field of fieldNames) {
    stats[field] = { min: Infinity, max: -Infinity };
  }

  // Update stats for each record.
  for (const record of records) {
    record.forEach((value, index) => {
      const field = fieldNames[index];
      if (value < stats[field].min) stats[field].min = value;
      if (value > stats[field].max) stats[field].max = value;
    });
  }

  // Create a string with "min/max" for each field, separated by commas.
  const valuesString = fieldNames.map((field) => `${stats[field].min}/${stats[field].max}`).join(", ");

  console.log(valuesString);
}

// Example usage:
export const tryRead = async (year: number, month: number) => {
  try {
    const filename = path.join(__dirname, `${year}-${month.toString().padStart(2, "0")}.bin`);
    const records = await readBinaryFileToArray(filename);
    // console.log(`Read ${records.length} records from ${filename}`);
    // console.log(records[0]); // Log the first record as an example.
    printMinMax(records);
    return records;
  } catch (err) {
    console.error("Error reading binary file:", err);
    return [];
  }
};

export async function tryReadAllFiles() {
  try {
    // Read the contents of the bin directory.
    const files = await fs.readdir(__dirname);

    // Loop over each file.
    for (const file of files) {
      // Only process files ending with ".bin".
      if (file.endsWith(".bin")) {
        // Use a regular expression to extract the year and month.
        const match = file.match(/^(\d{4})-(\d{2})\.bin$/);
        if (match) {
          const year = parseInt(match[1], 10);
          const month = parseInt(match[2], 10);
          // console.log(`Processing file: ${file} (Year: ${year}, Month: ${month})`);
          // Call tryRead, which is assumed to print min/max statistics.
          await tryRead(year, month);
        } else {
          console.warn(`File "${file}" does not match the expected pattern "YYYY-MM.bin".`);
        }
      }
    }
    console.log("All files processed.");
  } catch (err) {
    console.error("Error reading bin directory:", err);
  }
}

// Example hrToId function (replace with your actual implementation)
const ToId = (x: string) => {
  return "0".repeat(15 - x.length) + x;
};

// Routine that inserts records into the 'wind' collection.
export async function insertRecordsToWind(year: number, month: number): Promise<void> {
  try {
    // Get records from the binary file for the specified year and month.
    const records = await tryRead(year, month);
    console.log(`Inserting ${records.length} records into PocketBase collection 'wind'.`);

    // Process each record sequentially (or batch if preferred)
    for (const record of records) {
      // RecordType is defined as: [timestamp, speed, direction, temperature, humidity, pressure]
      const [timestamp, speed, direction, temperature, humidity, pressure] = record;
      // Compute the record ID from the timestamp.
      const id = ToId(timestamp.toString());
      // Build the data object for insertion.
      const data = { speed, direction, temperature, humidity, pressure };

      try {
        // Insert the record into the 'wind' collection with the custom id.
        await pb.collection("wind").create({ id, ...data });
      } catch (error) {
        console.error(`Error inserting record with id ${id}:`, error);
      }
    }

    console.log("Insertion complete.");
  } catch (error) {
    console.error("Error in insertRecordsToWind:", error);
  }
}

/**
 * Archives old records from the PocketBase "wind" collection.
 *
 * This function:
 *  1. Uses the current date in LA to compute:
 *     - previousMonthStart: start of the previous month (e.g. for March 19, this is Feb 1 00:00:00).
 *     - monthBeforePrevStart: start of the month before previous (e.g. Jan 1 00:00:00).
 *  2. Queries the "wind" collection for records with id (timestamp) in the range:
 *     [monthBeforePrevStart, previousMonthStart)
 *  3. Packs those records into a binary file named "YYYY-MM.bin" where YYYY-MM corresponds
 *     to the month being archived (the month before previous).
 *  4. Deletes those records from PocketBase.
 */
export async function archiveOldWindRecords(): Promise<void> {
  try {
    // Get current date in LA local time.
    const now = new Date();
    const laNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));

    // Compute the start of the previous month in LA.
    // For example, if laNow is March 19, 2025, then previousMonthStart = Feb 1, 2025 00:00:00.
    const currentMonth = laNow.getMonth() + 1; // 1-indexed month
    const currentYear = laNow.getFullYear();
    let prevMonth: number, prevYear: number;
    if (currentMonth > 1) {
      prevMonth = currentMonth - 1;
      prevYear = currentYear;
    } else {
      prevMonth = 12;
      prevYear = currentYear - 1;
    }
    const previousMonthStartStr = `${prevYear}-${prevMonth.toString().padStart(2, "0")}-01 00:00:00`;

    // Compute the start of the month before previous.
    let monthBeforePrev: number, yearBeforePrev: number;
    if (prevMonth > 1) {
      monthBeforePrev = prevMonth - 1;
      yearBeforePrev = prevYear;
    } else {
      monthBeforePrev = 12;
      yearBeforePrev = prevYear - 1;
    }
    const monthBeforePrevStartStr = `${yearBeforePrev}-${monthBeforePrev.toString().padStart(2, "0")}-01 00:00:00`;

    // Convert the LA local start strings to UTC dates using fromZonedTime.
    const previousMonthStartUTC = new Date();
    const monthBeforePrevStartUTC = new Date();

    // Convert these UTC dates to UNIX timestamps (in seconds).
    const previousMonthStartTimestamp = Math.floor(previousMonthStartUTC.getTime() / 1000);
    const monthBeforePrevStartTimestamp = Math.floor(monthBeforePrevStartUTC.getTime() / 1000);

    console.log(
      `Archiving records from ${monthBeforePrevStartStr} to ${previousMonthStartStr} (UTC timestamps ${monthBeforePrevStartTimestamp} to ${previousMonthStartTimestamp}).`
    );

    // Construct filter for PocketBase: record ids are the timestamps (as strings).
    const filter = `id >= "${monthBeforePrevStartTimestamp}" && id < "${previousMonthStartTimestamp}"`;
    const pbRecords = await pb.collection("wind").getFullList(100000, { sort: "id", filter });
    console.log(`Found ${pbRecords.length} records in PocketBase for the period.`);
    if (!pbRecords.length) return;

    // Map records to RecordType.
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

    // Use the year and month of the month being archived (monthBeforePrev) for the file name.
    const filename = `${yearBeforePrev}-${monthBeforePrev.toString().padStart(2, "0")}.bin`;
    // await saveRecordsToBinaryFile(recordsToArchive, filename);
    // console.log(`Archived ${recordsToArchive.length} records to ${filename}.`);

    // Delete the archived records from PocketBase.
    for (const record of pbRecords) {
      try {
        await pb.collection("wind").delete(record.id);
        console.log(`Deleted record with id ${record.id}`);
      } catch (err) {
        console.error(`Error deleting record with id ${record.id}:`, err);
      }
    }
    console.log("Archiving and deletion complete.");
  } catch (error) {
    console.error("Error in archiveOldWindRecords:", error);
  }
}

/**
 * Deletes all records from the PocketBase "wind" collection that have a timestamp earlier than the start
 * (midnight) of the previous month (in LA local time) relative to the most recent record.
 */
export async function deleteOldWindRecords() {
  try {
    // Step 1: Get the record with the highest id (most recent) from the "wind" collection.
    const pbResponse = await pb.collection("wind").getList(1, 1, { sort: "-id" });
    let highestTimestamp = 0;
    if (pbResponse?.items?.length > 0) {
      const highestId = pbResponse.items[0].id;
      highestTimestamp = parseInt(highestId, 10); // assuming hrToId returns timestamp as string
    }
    console.log("Highest timestamp from wind:", highestTimestamp);

    // Step 2: Convert highestTimestamp (in seconds) to a Date.
    const highestDateUTC = new Date(highestTimestamp * 1000);
    // Convert that date to LA local time (for grouping) using format.
    const laDateStr = ""; ///format(highestDateUTC, "yyyy-MM-dd HH:mm:ss", { timeZone: "America/Los_Angeles" });
    // Parse the LA date parts.
    const laYear = parseInt(laDateStr.slice(0, 4), 10);
    const laMonth = parseInt(laDateStr.slice(5, 7), 10);
    console.log("Most recent record in LA local time:", laDateStr);

    // Step 3: Compute the start (midnight) of the previous month in LA local time.
    let prevMonth: number, prevYear: number;
    if (laMonth > 1) {
      prevMonth = laMonth - 1;
      prevYear = laYear;
    } else {
      prevMonth = 12;
      prevYear = laYear - 1;
    }
    // Build a date-time string for the start of the previous month.
    const prevMonthStartStr = `${prevYear}-${prevMonth.toString().padStart(2, "0")}-01 00:00:00`;
    // Convert that LA local time string into a UTC Date using fromZonedTime.
    const prevMonthStartUTC = new Date(); //fromZonedTime(prevMonthStartStr, "America/Los_Angeles");
    const prevMonthStartTimestamp = Math.floor(prevMonthStartUTC.getTime() / 1000);
    console.log("Calculated deletion threshold (UTC timestamp):", prevMonthStartTimestamp);
    console.log("Local LA start of previous month:", prevMonthStartStr);

    // Step 4: Query for records in "wind" that are older than this threshold.
    // Since record ids are the timestamp (as a string), we can filter by id.
    const thresholdId = ToId(prevMonthStartTimestamp.toString());
    const deleteFilter = `id < "${thresholdId}"`;
    console.log("Delete filter:", deleteFilter);

    // Retrieve records to delete (batch size can be adjusted if necessary).
    const recordsToDelete = await pb.collection("wind").getFullList(1000, { filter: deleteFilter });
    console.log(`Found ${recordsToDelete.length} records to delete.`);
    if (!recordsToDelete.length) return;

    // Step 5: Delete each record.
    for (const record of recordsToDelete) {
      try {
        await pb.collection("wind").delete(record.id);
        console.log(`Deleted record with id ${record.id}`);
      } catch (err) {
        console.error(`Error deleting record with id ${record.id}:`, err);
      }
    }
    console.log("Old records deletion complete.");
  } catch (error) {
    console.error("Error in deleteOldWindRecords:", error);
  }
}

/**
 * Processes records from the PocketBase "wind" collection whose ids (timestamps in seconds)
 * fall between the provided start and stop timestamps. It then packs these records into a binary file.
 *
 * @param year - The target year (e.g. 2025)
 * @param month - The target month (1-12)
 * @param startTimestamp - The start of the span (in seconds)
 * @param stopTimestamp - The end of the span (in seconds)
 */
export async function processWindRecordsForSpan(
  year: number,
  month: number,
  startTimestamp: number,
  stopTimestamp: number
): Promise<void> {
  try {
    // Construct a filter based on record ids, which are timestamps in seconds.
    const filter = `id >= "${startTimestamp}" && id <= "${stopTimestamp}"`;
    // Retrieve records matching the filter (adjust the limit if needed).
    const pbRecords = await pb.collection("wind").getFullList(100000, { sort: "id", filter });
    console.log(`Got ${pbRecords.length} records from PocketBase between ${startTimestamp} and ${stopTimestamp}.`);

    // Map PocketBase records to our RecordType array.
    const recordsToInsert: RecordType[] = pbRecords.map((record: any) => {
      const timestamp = parseInt(record.id, 10);
      return [
        timestamp,
        record.speed > 511 ? 511 : record.speed,
        record.direction > 359 ? 359 : record.direction,
        record.temperature > 1023 ? 1023 : record.temperature,
        record.humidity, // assuming humidity is within range
        record.pressure > 4090 ? 4090 : record.pressure < -4090 ? -4090 : record.pressure,
      ] as RecordType;
    });

    // Use the provided year and month to create the filename.
    const filename = `${year}-${month.toString().padStart(2, "0")}.bin`;
    await saveRecordsToBinaryFile(recordsToInsert, filename);
    console.log(`Processing complete. Saved ${recordsToInsert.length} records to ${filename}.`);
  } catch (error) {
    console.error("Error processing wind records for span:", error);
  }
}

/**
 * Scans the bin directory for files named like "YYYY-MM.bin" and returns the most recent one.
 */
async function getMostRecentArchiveFile(binDir: string): Promise<string | null> {
  try {
    const files = await fs.readdir(binDir);
    const binFiles = files.filter((f) => /^\d{4}-\d{2}\.bin$/.test(f));
    if (binFiles.length === 0) return null;
    binFiles.sort();
    return binFiles[binFiles.length - 1];
  } catch (error) {
    console.error("Error reading bin directory:", error);
    return null;
  }
}

/**
 * Archives the next month's records from the PocketBase "wind" collection.
 *
 * This routine:
 *  1. Scans the bin directory for the most recent archive file (named "YYYY-MM.bin").
 *  2. Determines the next month to archive.
 *  3. Calculates the start-of-next-month and start-of-following-month timestamps (in seconds) based on LA local time.
 *  4. Checks that the month is complete (by verifying there is at least one record with id ≥ the following month start).
 *  5. If complete, queries for records in the next month, packs them into a binary file named "YYYY-MM.bin", and saves it.
 *  6. Deletes any records in the collection with an id less than the start timestamp of the next month.
 */
export async function archiveNextMonthRecords(): Promise<void> {
  try {
    // const binDir = path.join(__dirname, 'bin');
    // Step 1: Get the most recent archive file.
    const mostRecentFile = await getMostRecentArchiveFile(__dirname);
    if (!mostRecentFile) {
      console.log("No archived files found in the bin directory. Aborting archive.");
      return;
    }
    console.log("Most recent archived file:", mostRecentFile);

    // Step 2: Parse the most recent file's year and month.
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

    // Step 3: Calculate the start timestamp for next month and for the following month.
    const nextMonthStartStr = `${nextYear}-${nextMonth.toString().padStart(2, "0")}-01 00:00:00`;
    const nextMonthStartUTC = new Date(); ///fromZonedTime(nextMonthStartStr, "America/Los_Angeles");
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
    const followingMonthStartUTC = new Date(); //fromZonedTime(followingMonthStartStr, "America/Los_Angeles");
    const followingMonthStartTimestamp = Math.floor(followingMonthStartUTC.getTime() / 1000);

    console.log(`Next month to archive: ${nextYear}-${nextMonth.toString().padStart(2, "0")}`);
    console.log(`Time span: ${nextMonthStartTimestamp} to ${followingMonthStartTimestamp}`);

    // Step 4: Verify that the next month is complete.
    // Check for at least one record with id >= followingMonthStartTimestamp.
    const completeFilter = `id >= "${followingMonthStartTimestamp}"`;
    const completeRecords = await pb.collection("wind").getFullList(1, { sort: "id", filter: completeFilter });
    if (completeRecords.length === 0) {
      console.log("Next month is not complete (no records for following month). Aborting archive.");
      return;
    }

    // Step 5: Query for records in the next month.
    const filter = `id >= "${nextMonthStartTimestamp}" && id < "${followingMonthStartTimestamp}"`;
    const pbRecords = await pb.collection("wind").getFullList(100000, { sort: "id", filter });
    console.log(
      `Found ${pbRecords.length} records to archive for ${nextYear}-${nextMonth.toString().padStart(2, "0")}.`
    );
    if (pbRecords.length === 0) {
      console.log("No records found for the target month. Nothing to archive.");
      return;
    }

    // Map PocketBase records to our RecordType.
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

    // Step 6: Archive the records to a binary file.
    const filename = `${nextYear}-${nextMonth.toString().padStart(2, "0")}.bin`;
    await saveRecordsToBinaryFile(recordsToArchive, filename);
    console.log(`Archived ${recordsToArchive.length} records to ${filename}.`);

    // Step 7: Delete any records with id less than the start of next month.
    const deleteFilter = `id < "${nextMonthStartTimestamp}"`;
    const recordsToDelete = await pb.collection("wind").getFullList(100000, { sort: "id", filter: deleteFilter });
    console.log(`Found ${recordsToDelete.length} records to delete (older than next month start).`);
    for (const record of recordsToDelete) {
      try {
        await pb.collection("wind").delete(record.id);
        console.log(`Deleted record with id ${record.id}`);
      } catch (err) {
        console.error(`Error deleting record with id ${record.id}:`, err);
      }
    }
    console.log("Archiving complete. Old records have been deleted.");
  } catch (error) {
    console.error("Error in archiveNextMonthRecords:", error);
  }
}

// Schedule the job to run at 00:00 on the 2nd day of every month in LA time.
// cron.schedule(
//     '0 0 2 * *',
//     async () => {
//         console.log('Running monthly archive job on the 2nd day...');
//         try {
//             await archiveNextMonthRecords();
//             console.log('Monthly archive job completed.');
//         } catch (error) {
//             console.error('Error in monthly archive job:', error);
//         }
//     },
//     {
//         timezone: 'America/Los_Angeles'
//     }
// );
