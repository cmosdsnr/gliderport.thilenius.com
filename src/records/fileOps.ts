import fs from "fs/promises";
import path from "path";

// SQL connection and logging utilities
import { log } from "../log";

// Resolve the runtime directory of the current module relative to the /bin directory
import { dirname } from "path"; // Function to extract directory name from a path
import { fileURLToPath } from "url"; // Converts a module URL to a local file path
const __f = fileURLToPath(import.meta.url); // Convert current module's URL to a file path
const __dirname = dirname(__f) + "/../bin"; // Set __dirname to point to the /bin directory

import { packSensorRecord, unpackSensorRecord, SensorPackedRecord } from "./binaryFunctions";

/**
 * Save an array of records to a binary file.
 * Each record is packed into 18 bytes.
 * The filename is "{month}-{year}.bin".
 */
export async function saveRecordsToBinaryFile(records: SensorPackedRecord[], filename: string): Promise<void> {
  const buffers = records.map(packSensorRecord); // 18 bytes each
  const outputBuffer = Buffer.concat(buffers);
  const outputPath = path.join(__dirname, filename);
  await fs.writeFile(outputPath, outputBuffer);
  log("saveRecordsToBinaryFile", `Saved ${records.length} records (${outputBuffer.length} bytes) to ${filename}`);
}

/**
 * Reads a binary file of 18-byte packed SensorPackedRecords and returns the unpacked array.
 *
 * @param filename - The name of the binary file to read (e.g., "2025-03.bin").
 * @returns An array of unpacked SensorPackedRecord objects.
 */
export async function readRecordsFromBinaryFile(filename: string): Promise<SensorPackedRecord[]> {
  const inputPath = path.join(__dirname, filename);
  const fileBuffer = await fs.readFile(inputPath);

  const recordSize = 18;
  const recordCount = Math.floor(fileBuffer.length / recordSize);
  const records: SensorPackedRecord[] = [];

  for (let i = 0; i < recordCount; i++) {
    const offset = i * recordSize;
    const recordBuffer = fileBuffer.subarray(offset, offset + recordSize);
    const record = unpackSensorRecord(recordBuffer);
    records.push(record);
  }

  log("readRecordsFromBinaryFile", `Read ${records.length} records (${fileBuffer.length} bytes) from ${filename}`);
  return records;
}

/**
 * Reads a binary file corresponding to a given year and month.
 *
 * This function attempts to:
 * 1. Construct the full file path for the binary file based on the year and month.
 * 2. Read and unpack the sensor records from the binary file.
 * 3. Log the number of records read and display the first record as an example.
 * If an error occurs during file reading, it logs the error and returns an empty array.
 *
 * @function tryRead
 * @param {number} year - The year of the file to read.
 * @param {number} month - The month of the file to read.
 * @returns {Promise<SensorPackedRecord[]>} The unpacked sensor records or an empty array in case of error.
 */
export const tryRead = async (year: number, month: number): Promise<SensorPackedRecord[]> => {
  try {
    // Construct the file path using the __dirname and formatted filename 'YYYY-MM.bin'
    const filename = path.join(__dirname, `${year}-${month.toString().padStart(2, "0")}.bin`);

    // Read and unpack the sensor records from the binary file.
    const records = await readRecordsFromBinaryFile(filename);

    log("tryRead", `Read ${records.length} records from ${filename}`);
    log("tryRead", records[0]); // Log first record for preview purposes.

    return records;
  } catch (err) {
    log("tryRead", "Error reading binary file:", err);
    return [];
  }
};
