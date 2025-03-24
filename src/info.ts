/**
 *
 * **This module manages the application's global debug information stored in the
 * PocketBase "status" collection. It defines and exports a `debugInfo` object
 * that holds various debugging metrics, such as timestamps, record counts,
 * hourly data, code history, open weather details, and notification history.**
 *
 * Key Responsibilities:
 * -----------------------
 * 1. **Debug Information Management:**
 *    - Defines the `debugInfo` object (of type DebugInfoData) to store debugging
 *      metrics and history that can be updated as new data is processed.
 *    - The data includes:
 *         - General timestamps (e.g., `tsLast`, `tsLastPre`)
 *         - Record counts and hourly data (e.g., `numberRecords`, `hourLength`, `hours`)
 *         - Code history information (e.g., `codeHistory` with fields like `length`,
 *           `date`, `tsLast`, `code`, `gpResults`, and `days`)
 *         - Open weather data (e.g., `openWeather` with `hours`, `start`, and `stop`)
 *         - Sent texts and other miscellaneous debugging data.
 *
 * 2. **Data Retrieval & Initialization:**
 *    - Provides the `getDebugInfo` function to retrieve the debug information
 *      from PocketBase using a unique debug ID ("0000000000debug").
 *    - If no debug record exists, it creates one and then retrieves it.
 *    - The global `debugInfo` variable is updated with the record from PocketBase.
 *
 * 3. **Data Persistence:**
 *    - Exports the `saveDebugInfo` function which updates the debug record in
 *      PocketBase, ensuring that any changes to `debugInfo` are persisted.
 *
 * Dependencies:
 * -------------
 * - **PocketBase (pb):** Used for interacting with the PocketBase backend,
 *   specifically the "status" collection.
 *
 * Usage:
 * ------
 * - Upon module load, `getDebugInfo()` is automatically called to initialize
 *   the global `debugInfo` object.
 * - The `debugInfo` object can be modified by other parts of the application
 *   as needed.
 * - Call `saveDebugInfo()` to persist any changes to the debug information back
 *   to PocketBase.
 *
 *
 * **This module provides functionality to assemble and serve system and gliderport
 * related information from various data sources such as global variables, a MySQL database,
 * and debug information.**
 * It performs the following tasks:
 *
 * 1. Gathers gliderport information from global state.
 * 2. Queries the hours table to build an overview of hourly data and counts of gliderport records.
 * 3. Retrieves and processes the server_sent record, including parsing sunrise/sunset data and computing time deltas.
 * 4. Queries the code_history table to assemble an overview and details of recent code changes.
 * 5. Prepares additional "Add Data" information from debug data.
 *
 * All dates and durations are formatted inline using Luxon.
 *
 * Exported Functions:
 *  - info: Asynchronously assembles all relevant information into an InfoResponse object.
 *  - infoRoutes: Returns an Express router with a /info endpoint for debugging and monitoring.
 *
 * @module info
 */

import express, { Request, Response } from "express";
import mysql from "mysql2";
import globals from "globals.js";
import { pb } from "pb.js";
import { connection } from "./SqlConnect";
import { DateTime, Duration } from "luxon"; // Luxon for date/time handling

export interface GliderportInfo {
  lastRecord: any;
  firstRecord: any;
  tdLast?: string | null;
  numberRecords?: any;
  latestHours: any;
  latestHoursString?: string | null;
}

export interface HourEntry {
  start: number;
  startString: string;
  hoursCount: number;
  gliderportCount: number;
}

export interface ServerSentData {
  now: number;
  record: any; // raw record from server_sent table
  // For sun data, we convert it into a key/value map:
  sun?: { [key: string]: string };
  // For keys like last_record, last_image, last_forecast, include computed delta info.
  computed?: { [key: string]: { original: number; display: string; delta: string } };
}

export interface CodeHistoryOverview {
  date: number;
  dateString: string;
  codeChanges: number;
}

export interface CodeHistoryDetails {
  date: number;
  dateString: string;
  limits: [number, number];
  codes: Array<{ time: number; timeHMS: string; description: string; code: number }>;
}

export interface AddDataInfo {
  lastCalled: number;
  lastCalledString: string;
  numberRecordsReceived: number;
  lastEntryInHours: number;
  lastEntryInHoursString: string;
  hoursInfo: any[]; // assuming array of objects with ts, resultsFound, l, etc.
  forecast: {
    nextUpdate: number;
    nextUpdateString: string;
    lastUpdate: number;
    lastUpdateString: string;
    forecastHours: number;
    forecastStart: number;
    forecastEnd: number;
  };
  codeHistoryUpdate: any; // structure from globals.debugInfo.codeHistory
}

export interface InfoResponse {
  gliderportInfo: GliderportInfo;
  hoursTable: {
    count: number;
    entries: HourEntry[];
  };
  serverSent: ServerSentData | null;
  codeHistory: {
    overview: CodeHistoryOverview[];
    latestDetails?: CodeHistoryDetails;
  };
  addData: AddDataInfo;
}

export type DebugInfoHours = {
  ts: number;
  resultsFound: number;
  l: number;
};

export type DebugCodeHistory = {
  length: number;
  date: number;
  tsLast: number;
  code: number;
  gpResults: number;
  days: {
    length: number;
    date: number;
    c: number;
  }[];
};

export type DebugOpenWeather = {
  hours: number;
  start: number;
  stop: number;
};

export type DebugSentTexts = {
  direction: number;
  duration: number;
  speed: number;
  to: string;
  when: number;
};

export type DebugInfoData = {
  tsLast: number;
  numberRecords: number;
  hourLength: number;
  hours: DebugInfoHours[];
  now: number;
  codeHistory: DebugCodeHistory;
  openWeather: DebugOpenWeather;
  latestHours: number;
  sentTexts: DebugSentTexts[];
  tsLastPre: number;
};

export let debugInfo: DebugInfoData = {
  tsLast: 0,
  numberRecords: 0,
  hourLength: 0,
  hours: [],
  now: 0,
  codeHistory: {
    length: 0,
    date: 0,
    tsLast: 0,
    code: 0,
    gpResults: 0,
    days: [],
  },
  openWeather: {
    hours: 0,
    start: 0,
    stop: 0,
  },
  latestHours: 0,
  sentTexts: [],

  tsLastPre: 0,
};

const debugInfoId: string = "0000000000debug";

export const getDebugInfo = async () => {
  //get debugInfo for modification
  //debugInfo is written each time addData is called
  //debugInfo is displayed in get info
  let statusResult = await pb.collection("status").getOne(debugInfoId);
  if (statusResult.length === 0) {
    console.log('No status record found with name "debug". Creating it now.');
    await pb.collection("status").create({ id: debugInfoId, name: "debug", record: {} });
    statusResult = await pb.collection("status").getOne(debugInfoId);
  }
  debugInfo = statusResult.record;
};
getDebugInfo();

export const saveDebugInfo = async () => {
  await pb.collection("status").update(debugInfoId, {
    record: debugInfo,
  });
};

/**
 * Assembles and returns comprehensive information about the gliderport system.
 * This includes gliderport info, hourly statistics, server_sent status, code history,
 * and additional debug/forecast data. Dates and times are formatted inline using Luxon.
 *
 * @param connection - A MySQL connection object.
 * @returns A Promise that resolves to an object conforming to the InfoResponse interface.
 */
export const info = async (connection: mysql.Connection): Promise<InfoResponse> => {
  // 1. Gather gliderport information from global variables.
  const gliderportInfo: GliderportInfo = {
    lastRecord: globals.lastRecord,
    firstRecord: globals.firstRecord,
    latestHours: globals.latestHours,
    // Format tdLast as a simple date string if firstRecord exists.
    tdLast: globals.firstRecord !== null ? globals.tdLast.toDateString() : null,
    numberRecords: globals.firstRecord !== null ? globals.numberRecords : null,
    // Convert latestHours (Unix timestamp in seconds) to a formatted string.
    latestHoursString: globals.latestHours
      ? DateTime.fromSeconds(globals.latestHours).toFormat("yyyy-MM-dd HH:mm:ss")
      : null,
  };

  // 2. Query the hours table and build an array of hourly entries.
  const [hoursResult] = await connection.promise().query("SELECT * FROM `hours` ORDER BY start DESC");
  const hrs = Array.isArray(hoursResult) ? (hoursResult as { start: number; data: string }[]) : [];

  // Build an array of tuples: [start, hoursCount] based on parsed JSON data.
  const l: [number, number][] = [];
  hrs.forEach((v) => {
    const d = JSON.parse(v.data) as { start: number; date: number[] };
    l.push([v.start, d.date.length]);
  });

  // For each hourly entry, query the count of gliderport records recorded within that hour.
  const hourEntries: HourEntry[] = [];
  for (const [start, hoursCount] of l) {
    // Format the start and end timestamps using Luxon.
    const startStr = DateTime.fromSeconds(start).toFormat("yyyy-MM-dd HH:mm:ss");
    const endStr = DateTime.fromSeconds(start + 3600).toFormat("yyyy-MM-dd HH:mm:ss");
    const [countResult] = await connection
      .promise()
      .query("SELECT COUNT(*) as count FROM gliderport WHERE recorded >= ? AND recorded < ?", [startStr, endStr]);
    const count =
      Array.isArray(countResult) && countResult[0] && (countResult[0] as { count: number }).count
        ? (countResult[0] as { count: number }).count
        : 0;
    hourEntries.push({
      start,
      // Replace "00:00" with "00" if desired for display.
      startString: startStr.replace("00:00", "00"),
      hoursCount,
      gliderportCount: count,
    });
  }
  const hoursTable = {
    count: hourEntries.length,
    entries: hourEntries,
  };

  // 3. Retrieve the server_sent record and process additional status information.
  let serverSent: ServerSentData | null = null;
  let [serverSentResults] = await connection.promise().query("SELECT * FROM `server_sent` WHERE `id`=1");
  if (Array.isArray(serverSentResults) && serverSentResults.length > 0) {
    const r = serverSentResults[0] as any;
    const tsNow = Math.floor(Date.now() / 1000);
    const baseData: ServerSentData = {
      now: tsNow,
      record: r,
    };

    // Process the "sun" field if it exists.
    if (r.sun) {
      try {
        baseData.sun = JSON.parse(r.sun);
      } catch (err) {
        baseData.sun = { error: "Invalid JSON in sun field" };
      }
    }
    // Compute delta information for keys: last_record, last_image, last_forecast.
    const computed: { [key: string]: { original: number; display: string; delta: string } } = {};
    ["last_record", "last_image", "last_forecast"].forEach((key) => {
      const value = r[key];
      if (typeof value === "number") {
        let delta = tsNow - value;
        let end = "ago";
        if (delta < 0) {
          delta = -delta;
          end = "from now";
        }
        let deltaStr = "";
        if (delta > 3600) {
          deltaStr += Math.floor(delta / 3600) + " hr, ";
          delta -= 3600 * Math.floor(delta / 3600);
        }
        if (delta > 60) {
          deltaStr += Math.floor(delta / 60) + " min, ";
          delta -= 60 * Math.floor(delta / 60);
        }
        deltaStr += Math.floor(delta) + " sec " + end;
        computed[key] = {
          original: value,
          // Format the timestamp using Luxon.
          display: DateTime.fromSeconds(value).toFormat("yyyy-MM-dd HH:mm:ss"),
          delta: deltaStr,
        };
      }
    });
    baseData.computed = computed;

    serverSent = baseData;
  }

  // 4. Query the code_history table to build an overview and detailed record of recent changes.
  const [codeHistoryResults] = await connection
    .promise()
    .query("SELECT * FROM code_history ORDER BY date DESC LIMIT 10");
  let codeHistoryOverview: CodeHistoryOverview[] = [];
  let codeHistoryDetails: CodeHistoryDetails | undefined = undefined;
  if (Array.isArray(codeHistoryResults) && codeHistoryResults.length > 0) {
    const res = codeHistoryResults as any[];
    // Build an overview array for code history entries.
    codeHistoryOverview = res.map((entry) => {
      const parsed = JSON.parse(entry.data);
      return {
        date: entry.date,
        dateString: DateTime.fromSeconds(entry.date).toFormat("yyyy-MM-dd HH:mm:ss"),
        codeChanges: parsed.codes.length,
      };
    });
    // Use the first record for detailed code history information.
    const latest = res[0];
    const parsedLatest = JSON.parse(latest.data);
    const s = parsedLatest.limits[0];
    // Map each code tuple to include formatted time (using Luxon Duration) and description.
    const codesMap = parsedLatest.codes.map((codeTuple: [number, number]) => {
      const codesDescriptions = [
        "It Is dark",
        "Sled ride, bad angle",
        "Sled ride, poor angle",
        "Sled ride",
        "Bad angle",
        "Poor angle",
        "Good",
        "Excellent",
        "Use Speed bar!",
        "Too windy",
        "No data",
      ];
      return {
        time: codeTuple[0],
        timeHMS: Duration.fromObject({ seconds: codeTuple[0] + 3600 * s }).toFormat("hh:mm:ss"),
        description: codesDescriptions[codeTuple[1]] || `Code ${codeTuple[1]}`,
        code: codeTuple[1],
      };
    });
    codeHistoryDetails = {
      date: latest.date,
      dateString: DateTime.fromSeconds(latest.date).toFormat("yyyy-MM-dd HH:mm:ss"),
      limits: parsedLatest.limits,
      codes: codesMap,
    };
  }

  // 5. Prepare additional "Add Data" information using debugInfo.
  const addData: AddDataInfo = {
    lastCalled: debugInfo.now,
    lastCalledString: DateTime.fromSeconds(debugInfo.now).toFormat("yyyy-MM-dd HH:mm:ss"),
    numberRecordsReceived: debugInfo.numberRecords,
    lastEntryInHours: debugInfo.latestHours,
    lastEntryInHoursString: DateTime.fromSeconds(debugInfo.latestHours).toFormat("yyyy-MM-dd HH:mm:ss"),
    hoursInfo: debugInfo.hours, // Assumes this data is already properly structured.
    forecast: {
      nextUpdate: debugInfo.tsLast + 3600,
      nextUpdateString: DateTime.fromSeconds(debugInfo.tsLast + 3600).toFormat("yyyy-MM-dd HH:mm:ss"),
      lastUpdate: debugInfo.tsLastPre,
      lastUpdateString: DateTime.fromSeconds(debugInfo.tsLastPre).toFormat("yyyy-MM-dd HH:mm:ss"),
      forecastHours: debugInfo.openWeather.hours,
      // Convert from milliseconds to seconds.
      forecastStart: debugInfo.openWeather.start / 1000,
      forecastEnd: debugInfo.openWeather.stop / 1000,
    },
    codeHistoryUpdate: debugInfo.codeHistory, // Already assumed to be formatted as needed.
  };

  // Assemble the final JSON response object.
  const response: InfoResponse = {
    gliderportInfo,
    hoursTable,
    serverSent,
    codeHistory: {
      overview: codeHistoryOverview,
      latestDetails: codeHistoryDetails,
    },
    addData,
  };

  return response;
};

/**
 * Creates and returns an Express router for the /info endpoint.
 * This endpoint is used for debugging purposes to display the latest assembled system information.
 *
 * @returns An Express Router configured with the /info route.
 */
export const infoRoutes = () => {
  const router = express.Router();

  // GET /info - Retrieves and returns the latest information assembled by the info() function.
  router.get("/info", async (req: Request, res: Response) => {
    if (connection) res.send(await info(connection));
    else res.send("<h1>No connection to database</h1>");
  });

  return router;
};

export default infoRoutes;
