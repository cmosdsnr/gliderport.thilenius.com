// SQL connection and logging utility
import { connection } from "sql";
import { log } from "../log";

export const getRawRecordsBetweenDate = async (start: number, stop: number): Promise<any> => {
  if (!connection) {
    log("getRawRecordsBetweenDate", "❌ No SQL connection");
    return Promise.resolve(null);
  }

  const sql = "SELECT * FROM `raw_data` WHERE `epoch` < " + stop + " AND `epoch` >= " + start + " ORDER BY epoch ASC;";
  const [rawRows]: [any[], any[]] = await connection.promise().query(sql);
  return rawRows;
};

/**
 * Retrieves the oldest epoch timestamp from the `raw_data` table.
 *
 * @returns The latest epoch as a number, or null if not found.
 */
export const getEarliestRecord = async (): Promise<any> => {
  if (connection === null) {
    log("getEarliestRecord", "❌ No SQL connection");
    return Promise.resolve(null);
  }
  const sql = "SELECT * FROM `raw_data` ORDER BY epoch ASC LIMIT 1;";
  const [rows]: [any[], any[]] = await connection.promise().query(sql);

  return rows.length ? rows[0].epoch : null;
};

/**
 * Retrieves the latest epoch timestamp from the `raw_data` table.
 *
 * @returns The latest epoch as a number, or null if not found.
 */
export const getLatestRecord = async (): Promise<number | null> => {
  if (!connection) {
    log("getLatestRecord", "❌ No SQL connection");
    return Promise.resolve(null);
  }

  const sql = `SELECT epoch FROM raw_data ORDER BY epoch DESC LIMIT 1;`;
  const [rows]: [any[], any[]] = await connection.promise().query(sql);

  return rows.length ? rows[0].epoch : null;
};

/**
 * Removes records from the `raw_data` table that have an epoch timestamp older than the provided value.
 *
 * This function checks for an active SQL connection before executing the deletion. If no connection is found,
 * it logs an error and resolves with null. Otherwise, it constructs and executes a DELETE SQL query, logging the
 * number of affected rows.
 *
 * @param epoch - The epoch timestamp; all records with an epoch less than this value will be deleted.
 * @returns A Promise that resolves with the query results upon successful deletion, or rejects with an error if the query fails.
 */
export const removeRecordsOlderThan = (epoch: number): Promise<any> => {
  if (!connection) {
    log("removeRecordsOlderThan", "❌ No SQL connection");
    return Promise.resolve(null);
  }
  const sql = `DELETE FROM raw_data WHERE epoch < ${epoch};`;
  return new Promise((resolve, reject) => {
    connection?.query(sql, (err, results: any) => {
      if (err) {
        log("removeRecordsOlderThan", "❌ Error deleting records:", err.message);
        return reject(err);
      }
      log("removeRecordsOlderThan", `Deleted ${results.affectedRows} records older than ${epoch}`);
      resolve(results);
    });
  });
};

// Define the column names you're analyzing
const columns = [
  "speed",
  "angle",
  "w_count",
  "r_temp_count",
  "r_temp_read",
  "r_temp_ref",
  "s_count",
  "s_humidity",
  "s_temp_dht",
  "s_temp_bmp",
  "s_pressure",
  "epoch",
];

// Define our record type:
//   type RecordType = [number, number, number, number, number, number, number, number, number, number, number, number];

/**
 * Calculates min, max, avg, and range for each column in `raw_data`,
 * and logs the result in a formatted table.
 *
 * @returns Object with stats per column.
 */
export const getRawDataStats = async (): Promise<
  Record<string, { min: number; max: number; avg: number; range: number }>
> => {
  return new Promise((resolve, reject) => {
    if (!connection) {
      log("getRawDataStats", "❌ No SQL connection");
      return reject("No SQL connection");
    }

    // Construct SQL SELECT clause
    const selectParts = columns.flatMap((col) => [
      `MIN(${col}) AS ${col}_min`,
      `MAX(${col}) AS ${col}_max`,
      `AVG(${col}) AS ${col}_avg`,
    ]);
    const sql = `SELECT ${selectParts.join(", ")} FROM raw_data`;

    connection.query(sql, (err, results: any) => {
      if (err) {
        log("getRawDataStats", "❌ Query failed:", err.message);
        return reject(err);
      }

      const row = results[0];
      const output: Record<string, { min: number; max: number; avg: number; range: number }> = {};

      // Print header
      log("getRawDataStats", "╔════════════╦════════════╦════════════╦════════════╦════════════╗");
      log("getRawDataStats", "║   Column   ║    Min     ║    Max     ║    Avg     ║   Range    ║");
      log("getRawDataStats", "╠════════════╬════════════╬════════════╬════════════╬════════════╣");

      columns.forEach((col) => {
        const min = parseFloat(row[`${col}_min`]) || 0;
        const max = parseFloat(row[`${col}_max`]) || 0;
        const avg = parseFloat(row[`${col}_avg`]) || 0;
        const range = max - min;

        output[col] = { min, max, avg, range };

        const colName = col.padEnd(10, " ");
        const minStr = min.toFixed(2).padStart(10, " ");
        const maxStr = max.toFixed(2).padStart(10, " ");
        const avgStr = avg.toFixed(2).padStart(10, " ");
        const rangeStr = range.toFixed(2).padStart(10, " ");

        log("getRawDataStats", `║ ${colName} ║ ${minStr} ║ ${maxStr} ║ ${avgStr} ║ ${rangeStr} ║`);
      });

      log("getRawDataStats", "╚════════════╩════════════╩════════════╩════════════╩════════════╝");

      resolve(output);
    });
  });
};
