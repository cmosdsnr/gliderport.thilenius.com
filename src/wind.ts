/**
 * ### This module handles the processing, aggregation, and API exposure of wind sensor data.
 *
 * It performs the following tasks:
 *  - Loads the last 14 days of wind data from the PocketBase "wind" collection into an in-memory windTable.
 *  - Adds new wind data received via an HTTP POST request and updates the windTable.
 *  - Processes new wind records from a SQL database and inserts them into PocketBase.
 *  - Computes average wind speed and direction over 5-minute and 15-minute durations.
 *  - Exposes several API endpoints to add new wind data, retrieve the last entry,
 *    trigger SQL-based wind data processing, and fix save errors.
 *
 * Dependencies:
 * - express: For creating HTTP endpoints.
 * - mysql2: For SQL database connectivity.
 * - luxon: For date/time handling.
 * - PocketBase (pb): For accessing the PocketBase backend.
 * - ToId: For generating fixed-length IDs.
 * - sun.js: Provides sun data.
 * - sendTextMessage.js: Contains functions to send text alerts.
 * - codes.js: Provides code history update functionality.
 * - log.js: Logging utilities.
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

export let windTable: WindTable = [];

/**
 * @typedef {Object} WindTableRecord
 * @property {number} timestamp - The record timestamp (in seconds).
 * @property {number} speed - The wind speed.
 * @property {number} direction - The wind direction (in degrees).
 * @property {number} humidity - The humidity percentage.
 * @property {number} pressure - The atmospheric pressure.
 * @property {number} temperature - The temperature.
 */

/**
 * @typedef {WindTableRecord[]} WindTable
 * An array of WindTableRecord objects.
 */
export type WindTableRecord = {
  timestamp: number;
  speed: number;
  direction: number;
  humidity: number;
  pressure: number;
  temperature: number;
};
export type WindTable = WindTableRecord[];

/**
 * Loads the last 14 days of wind data from PocketBase into the in-memory windTable.
 *
 * It queries the "wind" collection for records with an id greater than a computed threshold
 * based on the current time minus 14 days, then populates the windTable array.
 *
 * @returns {Promise<void>} A promise that resolves when the wind table is loaded.
 */
export const loadWindTable = async (): Promise<void> => {
  const log: string[] = [""];

  logStr(log, "loadWindTable", "Loading wind table...");
  windTable = [];
  try {
    const now = DateTime.now();
    const fourteenDaysAgo = Math.floor(now.minus({ days: 14 }).toSeconds());
    logStr(log, "loadWindTable", "looking for records with id >", ToId(fourteenDaysAgo.toString()));

    const result = await pb.collection("wind").getFullList(10000, {
      filter: `id > "${ToId(fourteenDaysAgo.toString())}"`,
      sort: "id",
    });

    // Update the in-memory wind table with the fetched records.
    windTable.length = 0;
    result.forEach((r: any) => {
      windTable.push({
        timestamp: parseInt(r.id, 10),
        speed: r.speed,
        direction: r.direction,
        humidity: r.humidity,
        pressure: r.pressure,
        temperature: r.temperature,
      });
    });

    logStr(log, "loadWindTable", "Wind table loaded with", result.length, "records.");
    // Log first and last record timestamps for debugging.
    logStr(
      log,
      "loadWindTable",
      "First record: ",
      windTable[0].timestamp,
      " ",
      DateTime.fromSeconds(windTable[0].timestamp).toLocaleString()
    );
    logStr(
      log,
      "loadWindTable",
      "Last record: ",
      windTable[windTable.length - 1].timestamp,
      " ",
      DateTime.fromSeconds(windTable[windTable.length - 1].timestamp).toLocaleString()
    );
  } catch (error: any) {
    logStr(log, "loadWindTable", "Error loading wind table:", error.message);
    windTable = []; // Clear table on failure.
  }
  convertToCodes(windTable);
  writeLog(log);
};
loadWindTable();

/**
 * update in-memory windTable with newly added records.
 *
 * It queries the "wind" collection for records newer than what is in the windTable.
 * 🚨 Called from the pi3 at the gliderport to update the in-memory windTable through the /fetchNewWind route.
 *
 * @returns {Promise<void>} A promise that resolves when the wind table is loaded.
 */
export const UpdateWindTable = async (): Promise<void> => {
  const log: string[] = [""];

  logStr(log, "UpdateWindTable", "Update wind table...");
  try {
    logStr(
      log,
      "UpdateWindTable",
      "looking for records with id >",
      ToId(windTable[windTable.length - 1].timestamp.toString())
    );

    const result = await pb.collection("wind").getFullList(10000, {
      filter: `id > "${ToId(windTable[windTable.length - 1].timestamp.toString())}"`,
      sort: "id",
    });
    const last = windTable.length;
    // Update the in-memory wind table with the fetched records.
    result.forEach((r: any) => {
      windTable.push({
        timestamp: parseInt(r.id, 10),
        speed: r.speed,
        direction: r.direction,
        humidity: r.humidity,
        pressure: r.pressure,
        temperature: r.temperature,
      });
    });
    // transmit newly added records
    transmitNewRecords(windTable.slice(last));

    const ts = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60;
    while (windTable.length > 0 && windTable[0].timestamp < ts) windTable.shift();
    logStr(log, "UpdateWindTable", "Wind table loaded with", result.length, "records.");
    // Log first and last record timestamps for debugging.
    logStr(
      log,
      "UpdateWindTable",
      "First record: ",
      windTable[0].timestamp,
      " ",
      DateTime.fromSeconds(windTable[0].timestamp).toLocaleString()
    );
    logStr(
      log,
      "UpdateWindTable",
      "Last record: ",
      windTable[windTable.length - 1].timestamp,
      " ",
      DateTime.fromSeconds(windTable[windTable.length - 1].timestamp).toLocaleString()
    );
  } catch (error: any) {
    logStr(log, "UpdateWindTable", "Error loading wind table:", error.message);
    windTable = []; // Clear table on failure.
  }
  updateCodes(windTable);
  writeLog(log);
};

/**
 * Processes new wind records by querying the SQL database for records
 * that are newer than the latest record in PocketBase, converting them to the
 * PocketBase format, and inserting them.
 *
 * @returns {Promise<void>} A promise that resolves when new wind records have been processed.
 */
export async function processNewWindRecords(): Promise<void> {
  const log: string[] = [""];
  try {
    // Step 1: Get the latest wind record from PocketBase.
    const pbResponse = await pb.collection("wind").getList(1, 1, { sort: "-id" });
    let highestTimestamp = 0;

    if (pbResponse?.items?.length > 0) {
      const highestId = pbResponse.items[0].id;
      highestTimestamp = parseInt(highestId, 10);
    }

    // Convert the highest timestamp to LA local time for logging.
    const highestLA = DateTime.fromSeconds(highestTimestamp, {
      zone: "America/Los_Angeles",
    });
    const highestDateLA = highestLA.toFormat("yyyy-MM-dd HH:mm:ss");

    logStr(log, "processNewWindRecords", "Querying for SQL records newer than:", highestDateLA);

    // Step 2: Query SQL for records recorded after highestDateLA.
    const sqlQuery = "SELECT * FROM gliderport WHERE recorded > ? ORDER BY recorded ASC";
    const sqlResult = await connection?.promise().query<any[]>(sqlQuery, [highestDateLA]);
    const newSqlRecords = sqlResult ? sqlResult[0] : [];

    logStr(log, "processNewWindRecords", `Found ${newSqlRecords.length} new records in SQL.`);

    // Step 3: Convert SQL records to the PocketBase wind record format.
    const recordsToInsert: any[] = [];
    for (const row of newSqlRecords) {
      const recordedLA = DateTime.fromJSDate(row.recorded, {
        zone: "America/Los_Angeles",
      });
      const timestamp = Math.floor(recordedLA.toUTC().toSeconds());
      if (isNaN(timestamp)) {
        logStr(log, "processNewWindRecords", "Invalid timestamp for record:", row, "Aborting.");
        return;
      }
      const record: any[] = [
        timestamp,
        Math.min(row.speed, 511),
        Math.min(row.direction, 359),
        Math.min(row.temperature, 1023),
        row.humidity,
        Math.max(-4090, Math.min(row.pressure, 4090)),
      ];
      recordsToInsert.push(record);
    }

    logStr(log, "processNewWindRecords", `Inserting ${recordsToInsert.length} records into PocketBase.`);

    // Step 4: Insert each new record into PocketBase.
    for (const record of recordsToInsert) {
      const [timestamp, speed, direction, temperature, humidity, pressure] = record;
      const id = ToId(timestamp.toString());
      try {
        await pb.collection("wind").create({ id, speed, direction, temperature, humidity, pressure });
      } catch (err: any) {
        logStr(log, "processNewWindRecords", `Failed to insert record with id ${id}:`, err.message);
      }
    }

    logStr(log, "processNewWindRecords", "✅ New wind records synced.");
  } catch (error: any) {
    logStr(log, "processNewWindRecords", "❌ Error processing wind records:", error.message);
  }
  writeLog(log);
}

/**
 * Calculates average wind speed and direction over specified durations.
 *
 * This function computes:
 *  - The most recent wind record's speed and direction.
 *  - A 5-minute average (weighted by duration) of wind speed and direction.
 *  - A 15-minute average (weighted by duration) of wind speed and direction.
 *
 * Averages are computed using weighted sums based on the time differences between records,
 * and the average direction is normalized between 0 and 359 degrees.
 *
 * @returns {Array<{ speed: number; direction: number }>} An array containing three objects:
 *  - Index 0: The most recent record's speed (divided by 10) and direction.
 *  - Index 1: The 5-minute average speed (divided by 10) and average direction.
 *  - Index 2: The 15-minute average speed (divided by 10) and average direction.
 */
export const getWindAverage = () => {
  const log: string[] = [];
  const response: any[] = [];
  const now = DateTime.now().toSeconds();

  if (windTable.length === 0)
    return [
      { speed: 0, direction: 0 },
      { speed: 0, direction: 0 },
      { speed: 0, direction: 0 },
    ];

  // Use the most recent wind record as the base value.
  response[0] = {
    speed: windTable[windTable.length - 1].speed / 10,
    direction: windTable[windTable.length - 1].direction,
  };

  logStr(log, "getWindAverage", "windTable", windTable.length);

  // Compute weighted averages over 5 and 15 minute durations.
  for (const duration of [5 * 60, 15 * 60]) {
    const startTime = now - duration;
    let i = windTable.length - 1;
    while (i >= 0 && windTable[i].timestamp > startTime) {
      i--;
    }
    if (i > 0) i--;
    logStr(log, "getWindAverage", "windTable focus records:", windTable.length - i, "for duration", duration);

    let speedSum = 0;
    let totalDuration = 0;
    let sumX = 0;
    let sumY = 0;

    // Process the contribution from the last record.
    const last = windTable[windTable.length - 1];
    const endDuration = now - last.timestamp;
    speedSum += last.speed * endDuration;
    totalDuration += endDuration;
    sumX += Math.cos((last.direction * Math.PI) / 180) * last.speed * endDuration;
    sumY += Math.sin((last.direction * Math.PI) / 180) * last.speed * endDuration;

    // Process records between the last record and the determined start time.
    for (let j = windTable.length - 1; j > i; j--) {
      const dt = windTable[j].timestamp - windTable[j - 1].timestamp;
      const s = windTable[j].speed;
      const d = windTable[j].direction;
      speedSum += s * dt;
      totalDuration += dt;
      sumX += Math.cos((d * Math.PI) / 180) * s * dt;
      sumY += Math.sin((d * Math.PI) / 180) * s * dt;
    }

    // Process the record at index i.
    const firstDuration = windTable[i].timestamp - startTime;
    const s = windTable[i].speed;
    const d = windTable[i].direction;
    speedSum += s * firstDuration;
    totalDuration += firstDuration;
    sumX += Math.cos((d * Math.PI) / 180) * s * firstDuration;
    sumY += Math.sin((d * Math.PI) / 180) * s * firstDuration;

    const avgSpeed = speedSum / totalDuration;
    const avgDirection = (Math.atan2(sumY, sumX) * 180) / Math.PI;
    const directionNormalized = (avgDirection + 360) % 360;
    if (duration === 5 * 60) {
      response[1] = { speed: Math.round(avgSpeed) / 10, direction: Math.round(directionNormalized) };
    } else {
      response[2] = { speed: Math.round(avgSpeed) / 10, direction: Math.round(directionNormalized) };
    }
  }
  writeLog(log);
  return response;
};

/**
 * Creates an Express router for handling wind data related endpoints.
 *
 * Exposed Endpoints:
 * - POST /addData: Adds new wind data from the request to the wind table and PocketBase.
 * - GET /getLastEntry: Returns the timestamp of the most recent wind data record.
 * - GET /addWindFromSQL: Processes and inserts new wind records from the SQL database into PocketBase.
 * - GET /fixSaveErrors: Corrects errors in saved wind data by swapping temperature, pressure, and humidity values.
 * - GET /getData: gets the last h hours of windData.
 *
 * @returns {Router} An Express Router with the defined wind data endpoints.
 */
export const windRoutes = (): Router => {
  const router = Router();

  // Endpoint: GET /getData: gets the last h hours of windData.
  router.get("/getData", async (req: Request, res: Response) => {
    try {
      const hours = parseInt(req.query.hours as string);
      const now = DateTime.now().toSeconds();
      const startTime = now - hours * 60 * 60;
      const filteredData = windTable.filter((record) => record.timestamp > startTime);
      res.status(200).json(filteredData);
    } catch (error: any) {
      res.status(500).send("Error in getData: " + error.message);
    }
  });

  // Endpoint: GET /getLastEntry - Returns the timestamp of the latest wind data record.
  router.get("/getLastEntry", (req: Request, res: Response) => {
    if (windTable.length === 0) res.send("Error");
    else res.send(windTable[windTable.length - 1].timestamp.toString());
  });

  // Endpoint: GET /fetchNewWind - tells the server there are new records in the pb database. Called from the pi3 at teh gliderport.
  // It will update the in-memory windTable with the latest records from PocketBase.
  router.get("/fetchNewWind", (req: Request, res: Response) => {
    UpdateWindTable();
    res.send("ok");
  });

  // Endpoint: GET /addWindFromSQL - Processes new wind records from the SQL database and inserts them into PocketBase.
  router.get("/addWindFromSQL", async (req: Request, res: Response) => {
    try {
      const log: string[] = [""];
      logStr(log, "addWindFromSQL", "###############################################");
      console.log(log.join("\n"));
      await processNewWindRecords();
      res.status(200).json({ log });
      //   setInterval(simulateAddData, 1000 * 30);
    } catch (error) {
      res.status(500).send("Error reading archive files.");
    }
  });

  // Endpoint: GET /fixSaveErrors - Corrects save errors by updating wind records with swapped values.
  router.get("/fixSaveErrors", async (req: Request, res: Response) => {
    try {
      const result = await pb.collection("wind").getFullList(10000, {
        filter: `temperature < 0`,
        sort: "id",
      });
      result.forEach((r: any) => {
        const id = r.id;
        const temperature = r.humidity;
        const pressure = r.temperature;
        const humidity = r.pressure;
        pb.collection("wind").update(id, { temperature, pressure, humidity });
      });
      res.status(200).json({});
    } catch (error) {
      res.status(500).send("Error reading archive files.");
    }
  });

  return router;
};
