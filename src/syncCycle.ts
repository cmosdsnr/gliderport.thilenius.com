/**
 * ## Synchronization Cycle Module
 *
 * Handles the ingestion of ESP sensor data, local storage to MySQL,
 * and forwarding of recent records to PocketBase.
 *
 * @module syncCycle
 */

import axios from "axios";
import { log } from "./log";
import { insertRaw, getRawRecordsFromDate } from "./sql";
import { pb } from "./pb";
import { loadLastPocketEntry } from "./pb";
import { getESPdata } from "./routes/esp";

let updating = false;

/**
 * The last PocketBase entry ID retrieved at startup.
 * Updated after each successful sync cycle.
 */
let lastPocketEntry = await loadLastPocketEntry();

/**
 * Pads a number or string with leading zeros to produce a 15-character ID.
 * Used to generate PocketBase-friendly record IDs.
 *
 * @param x - Epoch value as a string
 * @returns A 15-character lowercase, zero-padded ID string
 */
const ToId = (x: string): string => {
  x = x.slice(0, 15);
  return "0".repeat(15 - x.length).toLowerCase() + x;
};

/**
 * Uploads a single row of sensor data to the PocketBase "wind" collection.
 *
 * Applies PocketBase-compatible formatting and temperature correction logic.
 *
 * @param row - A row of sensor data from the local MySQL database
 */
const uploadToPocketbase = async (row: RawReadings) => {
  const id = ToId(row.epoch.toString());
  const temperature =
    row.r_temp_count > 0 && row.r_temp_ref > 0
      ? (40.1 * row.r_temp_read) / row.r_temp_ref + 27.6
      : Math.max(row.s_temp_bmp, row.s_temp_dht);

  try {
    await pb
      .collection("wind")
      .create({
        id,
        speed: row.speed,
        direction: row.angle,
        temperature: Math.round(10 * temperature),
        humidity: row.s_count ? row.s_humidity : 0,
        pressure: row.s_pressure,
      })
      .catch((err: any) => {
        log("PocketBase", "Pocketbase Failed to insert record:", id, err.message);
        if (err.message.includes("already exists")) {
          log("PocketBase", "Record already exists, skipping:", id);
        }
      });
  } catch (err: any) {
    log("PocketBase", "Pocketbase Failed to insert record:", id, err.message);
  }
};

/**
 * Runs a full sync cycle:
 * - Ingests data from ESP
 * - Stores it in local SQL
 * - Pushes excess entries to PocketBase in batches of 100
 * - Notifies the server of new data
 *
 * Called every 15 seconds from `app.ts`.
 */
export const runSyncCycle = async () => {
  if (updating) {
    log("Interval", "waiting for previous update to finish");
    return;
  }

  const espData = getESPdata();
  log("runSyncCycle", "ESP data: ", JSON.stringify(espData));
  if (espData === null) return;

  const results = await insertRaw(espData);
  if (Array.isArray(results) && results.length > 0) {
    log("Interval", "added ", results[0].affectedRows, " row to local db");
  } else {
    log("Interval", "failed to add to local db: ", JSON.stringify(results));
  }

  const rawRows = await getRawRecordsFromDate(lastPocketEntry);
  if (!rawRows?.length) {
    return log("Interval", "No excess local reading to transfer");
  }

  log("Interval", "Excess local reading to transfer: " + rawRows.length + "  starting after: " + rawRows[0].epoch);

  updating = true;
  for (let i = 0; i < rawRows.length; i += 100) {
    const chunk = rawRows.slice(i, i + 100);
    await Promise.all(chunk.map(uploadToPocketbase));
  }

  lastPocketEntry = rawRows[rawRows.length - 1].epoch;

  // Notify server that new data is available
  //await axios.get("https://gpupdate.thilenius.com/fetchNewWind");
  await axios.get("https://tstupdate.thilenius.com/fetchNewWind");
  updating = false;
};
