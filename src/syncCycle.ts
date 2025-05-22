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
import { pb, checkConnection } from "./pb";
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

let temperature = 70;

const getTemperature = async () => {
  try {
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather?lat=32.889956&lon=-117.251632&units=imperial&appid=483c6b4301f7069cbf4e266bffa6d5ff"
    );
    if (response.status === 200) {
      const data = response.data;
      temperature = data.main.temp;
    } else {
      console.error("Error fetching temperature data:", response.statusText);
    }
  } catch (error) {
    console.error("Error fetching temperature data:", error);
  }
};

setInterval(() => {
  getTemperature();
}, 1000 * 60); // Update every 60s

/**
 * Uploads a single row of sensor data to the PocketBase "wind" collection.
 *
 * - Calculates corrected temperature using either sensor reference or fallback values.
 * - Uploads formatted data with an ID derived from the epoch.
 * - Logs errors and attempts to re-establish PocketBase connection on failure.
 *
 * @param row - A single row of sensor data from the local MySQL database.
 * @returns `true` if the record was successfully uploaded or already existed; `false` otherwise.
 */
export const uploadToPocketbase = async (row: RawReadings): Promise<boolean> => {
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
        // temperature: Math.round(10 * temperature),
        temperature,
        humidity: row.s_count ? row.s_humidity : 0,
        pressure: row.s_pressure,
      })
      .catch((err: any) => {
        log("PocketBase", "Pocketbase Failed to insert record:", id, err.message);
        if (err.message.includes("already exists")) {
          log("PocketBase", "Record already exists, skipping:", id);
        } else checkConnection();
        return false;
      });
    return true;
  } catch (err: any) {
    log("PocketBase", "Pocketbase Failed to insert record:", id, err.message);
    checkConnection();
    return false;
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

  const espData = await getESPdata();
  if (espData === null) return;

  // add to local SQL dB
  const results = await insertRaw(espData);
  if (Array.isArray(results) && results.length > 0) {
    log("Interval", "added ", results[0].affectedRows, " row to local db");
  } else {
    log("Interval", "failed to add to local db: ", JSON.stringify(results));
  }

  // get rows in SQL dB that are newer than lastPocketEntry
  const rawRows = await getRawRecordsFromDate(lastPocketEntry);
  if (!rawRows?.length) {
    return log("Interval", "No excess local reading to transfer");
  }
  log("Interval", "Excess local reading to transfer: " + rawRows.length + "  starting after: " + rawRows[0].epoch);

  //set the flag to prevent multiple sync cycles
  updating = true;

  for (let i = 0; i < rawRows.length; i += 100) {
    const chunk = rawRows.slice(i, i + 100);
    const results = await Promise.all(chunk.map(uploadToPocketbase));

    // If any upload failed, stop everything
    if (results.includes(false)) {
      log("❌ Upload failed in chunk. Halting further uploads.");
      // Update lastPocketEntry to the epoch of the last successful row in this chunk
      for (let j = results.length - 1; j >= 0; j--) {
        if (results[j]) {
          lastPocketEntry = chunk[j].epoch;
          break;
        }
      }
      break;
    } else lastPocketEntry = chunk[chunk.length - 1].epoch;
  }

  //   lastPocketEntry = rawRows[rawRows.length - 1].epoch;

  try {
    // Notify server that new data is available
    await axios.get("https://gpupdate.thilenius.com/fetchNewWind", { timeout: 5000 }); // 5-second timeout
    // await axios.get("https://tstupdate.thilenius.com/fetchNewWind", { timeout: 5000 }); // 5-second timeout
  } catch (err: any) {
    log("Interval", "Error notifying server: ", err.message);
  }
  updating = false;
};
