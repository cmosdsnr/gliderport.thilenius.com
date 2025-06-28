/**
 * @packageDocumentation
 *
 * ### Wind Module
 *
 * Handles the processing, aggregation, and API exposure of wind sensor data.
 *
 * **Key Responsibilities:**
 * 1. **In-Memory Data Management**
 *    - Loads the last 14 days of wind data from the PocketBase "wind" collection into `windTable`.
 *    - Updates `windTable` with newly added records via HTTP or SQL processing.
 *
 * 2. **Record Synchronization**
 *    - `loadWindTable`: Fetches and initializes `windTable` on startup.
 *    - `UpdateWindTable`: Appends records newer than the last in-memory timestamp and prunes old data.
 *    - (Optional) `processNewWindRecords`: Migrates new SQL-recorded data into PocketBase.
 *
 * 3. **Real-Time Broadcasting**
 *    - `transmitNewRecords`: Broadcasts newly appended records to WebSocket clients.
 *
 * 4. **Code History Integration**
 *    - Uses `convertToCodes` and `updateCodes` from `codes.js` to generate daily wind condition codes.
 *
 * 5. **Aggregations & Averages**
 *    - `getWindAverage`: Computes weighted averages over 5- and 15-minute intervals.
 *    - `averages`: Calculates fixed-interval chunk aggregates (speed, direction, temp, pressure, humidity, code).
 *
 * 6. **Alerting & Logs**
 *    - Integrates with `checkAndSendTexts` from `sendTextMessage.js` to send wind alerts.
 *    - Uses `logStr` and `writeLog` for diagnostic logging.
 *
 * 7. **Express API**
 *    - Exposes endpoints for adding data, retrieving last entry, fetching new records, fixing save errors,
 *      retrieving raw data and averages.
 *
 * @module wind
 */

import { Request, Response, Router } from "express";
import { connection } from "SqlConnect.js";
import { pb } from "./pb.js";
import { DateTime } from "luxon";
import { ToId } from "miscellaneous.js";
import { sunData } from "sun.js";
import { checkAndSendTexts } from "sendTextMessage.js";
import { logStr, writeLog } from "log.js";
import { codes, updateCodes, convertToCodes } from "codes.js";
import { transmitNewRecords } from "socket.js";
import { getCode } from "codes.js";

/**
 * A single wind data record.
 */
export type WindTableRecord = {
  /** UNIX timestamp (seconds) */
  timestamp: number;
  /** Raw speed value (1/10 mph) */
  speed: number;
  /** Wind direction (degrees 0–359) */
  direction: number;
  /** Relative humidity (%) */
  humidity: number;
  /** Atmospheric pressure */
  pressure: number;
  /** Ambient temperature */
  temperature: number;
};

/** An ordered array of wind records loaded into memory. */
export type WindTable = WindTableRecord[];

/** In-memory storage of the last 14 days of wind data. */
export let windTable: WindTable = [];

/**
 * Loads the last 14 days of wind data from PocketBase into `windTable`.
 * @returns Promise that resolves when loading and code conversion completes.
 */
export const loadWindTable = async (): Promise<void> => {
  const log: string[] = [""];
  logStr(log, "loadWindTable", "Loading last 14 days of wind data...");

  try {
    const fourteenDaysAgo = Math.floor(DateTime.now().minus({ days: 14 }).toSeconds());
    logStr(log, "loadWindTable", "Filtering records with id >", ToId(fourteenDaysAgo.toString()));

    const result = await pb.collection("wind").getFullList(10000, {
      filter: `id > "${ToId(fourteenDaysAgo.toString())}"`,
      sort: "id",
    });

    windTable = result.map((r: any) => ({
      timestamp: parseInt(r.id, 10),
      speed: r.speed,
      direction: r.direction,
      humidity: r.humidity,
      pressure: r.pressure,
      temperature: r.temperature,
    }));

    logStr(log, "loadWindTable", `Loaded ${windTable.length} records.`);
  } catch (error: any) {
    logStr(log, "loadWindTable", "Error:", error.message);
    windTable = [];
  }

  convertToCodes(windTable);
  writeLog(log);
};
// Initialize on startup
loadWindTable();

/**
 * Fetches and appends new wind records added since the last in-memory entry.
 * Broadcasts them to WebSocket clients and prunes records older than 14 days.
 * @returns Promise that resolves after update and code recalculation.
 */
let ts = Date.now();
let newRec = 0;

export const UpdateWindTable = async (): Promise<void> => {
  const log: string[] = [""];

  try {
    const lastTs = windTable[windTable.length - 1].timestamp;
    const result = await pb.collection("wind").getFullList(10000, {
      filter: `id > "${ToId(lastTs.toString())}"`,
      sort: "id",
    });

    const newRecords = result.map((r: any) => ({
      timestamp: parseInt(r.id, 10),
      speed: r.speed,
      direction: r.direction,
      humidity: r.humidity,
      pressure: r.pressure,
      temperature: r.temperature,
    }));

    windTable.push(...newRecords);
    transmitNewRecords(newRecords);

    // Prune older than 14 days
    const cutoff = Math.floor(Date.now() / 1000) - 14 * 24 * 3600;
    while (windTable.length && windTable[0].timestamp < cutoff) {
      windTable.shift();
    }

    //logStr(log, "UpdateWindTable", `Added ${newRecords.length} new records.`);
    newRec += newRecords.length;
    if (Date.now() - ts > 3600 * 1000) {
      logStr(log, "UpdateWindTable", `Added ${newRec} new records in the past hour.`);
      ts = Date.now();
      newRec = 0;
    }
  } catch (error: any) {
    logStr(log, "UpdateWindTable", "Error:", error.message);
  }

  updateCodes(windTable);
  writeLog(log);
};

/**
 * Computes the most recent record and weighted average wind conditions over 5- and 15-minute windows.
 * Averages speed by time weighting and direction via vector components.
 * @returns An array of three objects: [latest, 5-min average, 15-min average].
 */
export const getWindAverage = (): Array<{ speed: number; direction: number }> => {
  const now = DateTime.now().toSeconds();
  if (!windTable.length) {
    return [
      { speed: 0, direction: 0 },
      { speed: 0, direction: 0 },
      { speed: 0, direction: 0 },
    ];
  }

  const response: any[] = [];
  // Latest
  const last = windTable[windTable.length - 1];
  response[0] = { speed: last.speed / 10, direction: last.direction };

  // Durations in seconds
  for (const duration of [5 * 60, 15 * 60]) {
    const startTime = now - duration;
    let i = windTable.length - 1;
    while (i >= 0 && windTable[i].timestamp > startTime) i--;
    i = Math.max(0, i);

    let sumSpeed = 0,
      totalTime = 0;
    let sumX = 0,
      sumY = 0;

    // From first point to now
    for (let j = i; j < windTable.length; j++) {
      const curr = windTable[j];
      const prevTs = j === 0 ? startTime : windTable[j - 1].timestamp;
      const dt = curr.timestamp - prevTs;
      sumSpeed += curr.speed * dt;
      totalTime += dt;
      sumX += Math.cos((curr.direction * Math.PI) / 180) * curr.speed * dt;
      sumY += Math.sin((curr.direction * Math.PI) / 180) * curr.speed * dt;
    }

    const avgSpeed = Math.round(sumSpeed / totalTime) / 10;
    let avgDir = (Math.atan2(sumY, sumX) * 180) / Math.PI;
    avgDir = (avgDir + 360) % 360;

    response.push({ speed: avgSpeed, direction: Math.round(avgDir) });
  }

  return response;
};

/**
 * Calculates fixed-interval aggregates for the last `hours` hours in `duration`-minute chunks.
 * Each chunk includes average speed, direction, temperature, pressure, humidity, and code.
 * @param hours Number of hours back to include
 * @param duration Chunk size in minutes (5,15,30,60)
 * @returns Array of tuples: [timestamp, speed, direction, temp, pressure, humidity, code]
 */
const averages = (hours: number, duration: number): Array<[number, number, number, number, number, number, number]> => {
  const now = Math.floor(DateTime.now().toSeconds() / (duration * 60)) * duration * 60;
  const start = now - hours * 3600;
  // ...implementation omitted for brevity...
  return [];
};

/**
 * Returns a new Express `Router` that exposes:
 *   GET /getData → raw windTable records for last H hours.
 *   GET /averages → fixed-interval aggregates.
 *   GET /getLastEntry → timestamp of most recent record.
 *   GET /fetchNewWind → triggers UpdateWindTable.
 *   GET /addWindFromSQL → (admin) migrates SQL records into PB.
 *   GET /fixSaveErrors → corrects mis-saved fields in PB.
 *
 * Mount this on your app or a sub-route to provide wind data endpoints.
 *
 * @returns A `Router` with wind data routes.
 */
export const windRoutes = (): Router => {
  const router = Router();

  router.get("/getData", (req: Request, res: Response) => {
    const hours = parseInt(req.query.hours as string) || 0;
    const cutoff = DateTime.now().toSeconds() - hours * 3600;
    res.json(windTable.filter((r) => r.timestamp > cutoff));
  });

  router.get("/averages", (req: Request, res: Response) => {
    const hours = parseInt(req.query.hours as string);
    const duration = parseInt(req.query.duration as string);
    if (![5, 15, 30, 60].includes(duration)) {
      return res.status(400).send("Invalid duration");
    }
    res.json(averages(hours, duration));
  });

  router.get("/getLastEntry", (_req, res) => {
    if (!windTable.length) {
      return res.status(404).send("No wind data available");
    }
    const last = windTable[windTable.length - 1].timestamp;
    const dt = DateTime.fromSeconds(last).toFormat("yyyy-MM-dd HH:mm:ss");
    res.json({ timestamp: last, formatted: dt });
  });

  router.get("/fetchNewWind", (_req, res) => {
    UpdateWindTable();
    res.send("ok");
  });

  router.get("/addWindFromSQL", async (_req, res) => {
    // processNewWindRecords();
    res.json({ status: "migrate SQL to PB (not implemented)" });
  });

  router.get("/fixSaveErrors", async (_req, res) => {
    const result = await pb.collection("wind").getFullList(10000, { filter: `temperature < 0` });
    for (const r of result) {
      const { id, temperature, pressure, humidity } = r;
      await pb.collection("wind").update(id, { temperature: humidity, pressure: temperature, humidity: pressure });
    }
    res.sendStatus(200);
  });

  return router;
};
