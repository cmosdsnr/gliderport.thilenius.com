/**
 * ## Legacy Data Synchronization
 *
 * This module fetches old sensor readings from the local SQL database and sends them to the remote
 * server at `gliderport.thilenius.com/api`, used primarily to backfill or sync records that may have
 * been missed during live ingestion.
 *
 * @module oldUpdates
 */

import axios from "axios";
import { connection } from "./sql";
import { log } from "./log";
import { delay } from "./init";

// Toggle to enable/disable legacy update logic
const updateOldWay = true;

// Tracks whether the last known synced entry has been fetched
let lastEntryFound = false;

/**
 * Timestamp string of the most recent remote entry (format: 'YYYY-MM-DD HH:mm:ss').
 */
let lastEntry = "";

/**
 * Converts a Unix timestamp (in seconds) to MySQL datetime string format.
 *
 * @param ts - Timestamp in seconds
 * @returns Formatted datetime string
 */
const timestampToString = (ts: number): string => {
  return new Date(ts * 1000)
    .toISOString()
    .replace("T", " ")
    .replace(/\.[0-9]*Z/, "");
};

// Fetch last entry from remote if legacy sync is enabled
if (updateOldWay) {
  while (!lastEntryFound) {
    try {
      const response = await axios.get("https://gliderport.thilenius.com/api/getLastEntry");
      if (response.status !== 200) {
        log("doOldUpdate", "Error fetching last entry: " + response.statusText);
        break;
      }
      lastEntry = response.data.timestamp;
      if (lastEntry !== "Error") lastEntryFound = true;
      log("doOldUpdate", "Last Entry: " + lastEntry);
    } catch (error) {
      log("doOldUpdate", "GP servers not visible at the moment");
    }
  }
  await delay(15000);
}

/**
 * Sends unsynced local readings to the remote server.
 *
 * - Pulls all records with a timestamp newer than `lastEntry`
 * - Applies temperature correction logic
 * - Batches records and sends them to `/addData` in 500-row chunks
 */
export const doOldUpdate = async () => {
  if (!updateOldWay) return;

  log("doOldUpdate", "Last record on gliderport.thilenius.com/api/SQL: ", lastEntry);

  const sql = `
    SELECT reading, r_temp_count, r_temp_read, r_temp_ref,
           w_count, speed, angle, s_count, s_humidity,
           s_temp_dht, s_temp_bmp, s_pressure
    FROM raw_data
    WHERE reading > '${lastEntry}';
  `.trim();

  connection?.query(sql, async (err, rawRows: any[]) => {
    if (Array.isArray(rawRows) && rawRows.length > 0) {
      let timezoneOffset = new Date().getTimezoneOffset() * 60; // in seconds

      log(
        "doOldUpdate",
        "first reading of " +
          rawRows.length +
          " to transfer: " +
          timestampToString(rawRows[0].reading.getTime() / 1e3 - timezoneOffset)
      );

      let cnt = 0;
      let newRows: any[] = [];

      rawRows.forEach((rawRow) => {
        const row = ["", 0, 0, 0, 0, 0]; // [ts, speed, angle, humidity, pressure, temp]

        row[0] = timestampToString(rawRow.reading.getTime() / 1e3 - timezoneOffset);
        row[1] = rawRow.speed;
        row[2] = rawRow.angle;

        // Add humidity and pressure if available
        if (rawRow.s_count > 0) {
          row[3] = rawRow.s_humidity;
          row[4] = rawRow.s_pressure;
        }

        // Calculate temperature with correction or fallback
        let temp;
        if (rawRow.r_temp_count > 0 && rawRow.r_temp_ref > 0) {
          temp = (40.1 * rawRow.r_temp_read) / rawRow.r_temp_ref + 27.6;
        } else {
          temp = rawRow.s_temp_bmp > rawRow.s_temp_dht ? rawRow.s_temp_bmp : rawRow.s_temp_dht;
        }

        row[5] = Math.round(10 * temp); // scaled for compactness
        newRows.push(row);
        cnt++;

        if (cnt % 5000 === 0) console.log("count: " + cnt);
      });

      // Set lastEntry to the last timestamp sent
      lastEntry = newRows[newRows.length - 1][0];

      // Batch and post in chunks of 500 rows
      for (let i = 0; i <= cnt; i += 500) {
        const chunk = newRows.slice(i, Math.min(i + 500, cnt));
        try {
          const response = await axios.post("https://gliderport.thilenius.com/api/addData", {
            d: chunk,
          });
          log("doOldUpdate", "Post addData Response: " + response.data);
        } catch (err3) {
          log("doOldUpdate", "Error: " + err3);
        }
      }
    } else {
      log("doOldUpdate", "No excess local reading to transfer");
    }
  });
};
