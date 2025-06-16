/**
 * @packageDocumentation
 *
 * **This module manages the application's global debug information stored in the
 * PocketBase "status" collection. It defines and exports a `debugInfo` object
 * that holds various debugging metrics, such as timestamps, record counts,
 * hourly data, code history, open weather details, and notification history.**
 *
 * ## Key Responsibilities
 * 1. **Debug Information Management**
 *    - Defines the `debugInfo` object (of type `DebugInfoData`) to store debugging
 *      metrics and history that can be updated as new data is processed.
 *    - The data includes:
 *      - General timestamps (`tsLast`, `tsLastPre`)
 *      - Record counts and hourly data (`numberRecords`, `hourLength`, `hours`)
 *      - Code history information (`codeHistory` with fields `length`, `date`, `tsLast`, `code`, `gpResults`, and `days`)
 *      - Open weather data (`openWeather` with `hours`, `start`, and `stop`)
 *      - Sent texts and other miscellaneous debugging data (`sentTexts`)
 *
 * 2. **Data Retrieval & Initialization**
 *    - Provides the `getDebugInfo` function to retrieve the debug information
 *      from PocketBase using a unique debug ID (`"0000000000debug"`).
 *    - If no debug record exists, it creates one and then retrieves it.
 *    - The global `debugInfo` variable is updated with the record from PocketBase.
 *
 * 3. **Data Persistence**
 *    - Exports the `saveDebugInfo` function which updates the debug record in
 *      PocketBase, ensuring that any changes to `debugInfo` are persisted.
 *
 * 4. **Info Assembly & Routing**
 *    - Defines the `info` function to assemble system, database, and debug data
 *      into an `InfoResponse` object, including:
 *      - Gliderport info (`GliderportInfo`)
 *      - Hourly statistics (`HourEntry`)
 *      - Server-sent status (`ServerSentData`)
 *      - Code history overview and details (`CodeHistoryOverview` and `CodeHistoryDetails`)
 *      - Additional debug/forecast data (`AddDataInfo`)
 *    - Exports the `infoRoutes` function to create an Express router exposing
 *      a `/info` endpoint for debugging and monitoring.
 *
 * ## Dependencies
 * - `express`: For HTTP routing.
 * - `mysql2`: For SQL database connectivity.
 * - `globals.js`: For shared global state.
 * - `pb.js`: For interacting with PocketBase.
 * - `SqlConnect`: For MySQL connection.
 * - `luxon`: For date/time formatting and manipulation.
 *
 * @module info
 */

import express, { Request, Response } from "express";
import mysql from "mysql2";
import globals from "globals.js";
import { pb } from "pb.js";
import { connection } from "./SqlConnect";
import { DateTime, Duration } from "luxon";

export interface GliderportInfo {
  /** The most recent gliderport data record (raw) */
  lastRecord: any;
  /** The earliest gliderport data record (raw) */
  firstRecord: any;
  /** Formatted date string of the first record, or null if none */
  tdLast?: string | null;
  /** Total number of gliderport records, or null if none */
  numberRecords?: any;
  /** Latest hour timestamp (UNIX seconds) */
  latestHours: any;
  /** Formatted string of the latestHours timestamp, or null if none */
  latestHoursString?: string | null;
}

export interface HourEntry {
  /** UNIX timestamp (seconds) marking the start of the hour */
  start: number;
  /** Formatted string for display (e.g., "yyyy-MM-dd HH") */
  startString: string;
  /** Number of entries found in the 'hours' table for that hour */
  hoursCount: number;
  /** Number of gliderport records recorded in that hour */
  gliderportCount: number;
}

export interface ServerSentData {
  /** Current UNIX timestamp (seconds) when assembled */
  now: number;
  /** Raw record data from the server_sent SQL table */
  record: any;
  /** Parsed sunrise/sunset data (if present) */
  sun?: { [key: string]: string };
  /**
   * Computed delta information for keys such as last_record, last_image, last_forecast.
   * Each entry contains:
   * - original: the original UNIX timestamp
   * - display: formatted timestamp string
   * - delta: human-readable difference (e.g., "1 hr, 5 min ago")
   */
  computed?: { [key: string]: { original: number; display: string; delta: string } };
}

export interface CodeHistoryOverview {
  /** UNIX timestamp (seconds) of the code history entry */
  date: number;
  /** Formatted date string (e.g., "yyyy-MM-dd HH:mm:ss") */
  dateString: string;
  /** Number of code changes contained in that entry */
  codeChanges: number;
}

export interface CodeHistoryDetails {
  /** UNIX timestamp (seconds) of the latest code history entry */
  date: number;
  /** Formatted date string for the latest entry */
  dateString: string;
  /** Start/end limits for interpreting code times */
  limits: [number, number];
  /**
   * Array of code changes:
   * - time: seconds since day start
   * - timeHMS: formatted "hh:mm:ss"
   * - description: human-readable description
   * - code: numeric code value
   */
  codes: Array<{ time: number; timeHMS: string; description: string; code: number }>;
}

export interface AddDataInfo {
  /** UNIX timestamp (seconds) when addData was last called */
  lastCalled: number;
  /** Formatted string of `lastCalled` */
  lastCalledString: string;
  /** Number of records received since last call */
  numberRecordsReceived: number;
  /** Last entry timestamp in 'hours' (seconds) */
  lastEntryInHours: number;
  /** Formatted string of `lastEntryInHours` */
  lastEntryInHoursString: string;
  /** Array of hourly debug data entries */
  hoursInfo: any[];
  /** Forecast metadata */
  forecast: {
    /** Next forecast update timestamp (seconds) */
    nextUpdate: number;
    /** Formatted string of `nextUpdate` */
    nextUpdateString: string;
    /** Last forecast update timestamp (seconds) */
    lastUpdate: number;
    /** Formatted string of `lastUpdate` */
    lastUpdateString: string;
    /** Number of forecast hours requested */
    forecastHours: number;
    /** Forecast start time (UTC seconds) */
    forecastStart: number;
    /** Forecast end time (UTC seconds) */
    forecastEnd: number;
  };
  /** Latest code history update data from `debugInfo.codeHistory` */
  codeHistoryUpdate: any;
}

export interface InfoResponse {
  /** Aggregated gliderport information */
  gliderportInfo: GliderportInfo;
  /** Hourly statistics and counts */
  hoursTable: {
    count: number;
    entries: HourEntry[];
  };
  /** Processed server_sent status, or null if unavailable */
  serverSent: ServerSentData | null;
  /** Code history overview and optional latest details */
  codeHistory: {
    overview: CodeHistoryOverview[];
    latestDetails?: CodeHistoryDetails;
  };
  /** Additional data assembled from `debugInfo` */
  addData: AddDataInfo;
}

export type DebugInfoHours = {
  /** UNIX timestamp (seconds) */
  ts: number;
  /** Number of results found for that hour */
  resultsFound: number;
  /** Length or count of some hourly metric */
  l: number;
};

export type DebugCodeHistory = {
  /** Total number of code entries */
  length: number;
  /** UNIX timestamp (seconds) of this code history record */
  date: number;
  /** Last timestamp (seconds) when code history was updated */
  tsLast: number;
  /** Numeric code value */
  code: number;
  /** Number of gliderport results at time of code update */
  gpResults: number;
  /**
   * Array of per-day code history entries:
   * - length: number of entries that day
   * - date: UNIX timestamp (seconds) of day boundary
   * - c: code count for that day
   */
  days: {
    length: number;
    date: number;
    c: number;
  }[];
};

export type DebugOpenWeather = {
  /** Number of forecast hours */
  hours: number;
  /** UNIX timestamp (ms) of forecast start */
  start: number;
  /** UNIX timestamp (ms) of forecast stop */
  stop: number;
};

export type DebugSentTexts = {
  /** Direction parameter used in sent text */
  direction: number;
  /** Duration parameter */
  duration: number;
  /** Speed parameter */
  speed: number;
  /** Recipient number or identifier */
  to: string;
  /** UNIX timestamp (ms) when text was sent */
  when: number;
};

export type DebugInfoData = {
  /** Last processed timestamp (seconds) */
  tsLast: number;
  /** Total number of records processed */
  numberRecords: number;
  /** Length of an hour bucket */
  hourLength: number;
  /** Array of hourly debug entries */
  hours: DebugInfoHours[];
  /** Current UNIX timestamp (seconds) */
  now: number;
  /** Code history data */
  codeHistory: DebugCodeHistory;
  /** Open weather forecast metadata */
  openWeather: DebugOpenWeather;
  /** Latest hours timestamp (seconds) */
  latestHours: number;
  /** Array of sent text debug entries */
  sentTexts: DebugSentTexts[];
  /** Previous timestamp for some operation (seconds) */
  tsLastPre: number;
};

/**
 * Global in-memory debug information. Populated via `getDebugInfo()`.
 */
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

/**
 * Retrieves or creates the debug information record in PocketBase and updates
 * the global `debugInfo` variable.
 *
 * - Attempts to fetch the record with ID `debugInfoId` from the "status" collection.
 * - If not found, creates a new record with empty data.
 * - Updates the in-memory `debugInfo` object with the fetched record.
 *
 * @returns A promise that resolves once `debugInfo` is populated.
 */
export const getDebugInfo = async (): Promise<void> => {
  let statusResult = await pb.collection("status").getOne(debugInfoId);
  if (!statusResult || !statusResult.record) {
    console.log('No status record found with name "debug". Creating it now.');
    await pb.collection("status").create({ id: debugInfoId, name: "debug", record: {} });
    statusResult = await pb.collection("status").getOne(debugInfoId);
  }
  debugInfo = statusResult.record as DebugInfoData;
};
getDebugInfo();

/**
 * Persists the current in-memory `debugInfo` object back to PocketBase.
 *
 * @returns A promise that resolves once the update completes.
 */
export const saveDebugInfo = async (): Promise<void> => {
  await pb.collection("status").update(debugInfoId, {
    record: debugInfo,
  });
};

/**
 * Assembles and returns comprehensive information about the gliderport system.
 *
 * This includes:
 *  1. Gliderport info from global state (`globals`).
 *  2. Hourly statistics from the `hours` SQL table (with gliderport record counts).
 *  3. Server-sent status from the `server_sent` SQL table (sun data, deltas).
 *  4. Code history overview and detailed data from the `code_history` SQL table.
 *  5. Additional "Add Data" information from `debugInfo` (formatted using Luxon).
 *
 * @param connection - A MySQL connection object from `mysql2`.
 * @returns A promise that resolves to an `InfoResponse` object containing all assembled data.
 */
export const info = async (connection: mysql.Connection): Promise<InfoResponse> => {
  // 1. Gather gliderport information from globals.
  const gliderportInfo: GliderportInfo = {
    lastRecord: globals.lastRecord,
    firstRecord: globals.firstRecord,
    latestHours: globals.latestHours,
    tdLast: globals.firstRecord !== null ? globals.tdLast.toDateString() : null,
    numberRecords: globals.firstRecord !== null ? globals.numberRecords : null,
    latestHoursString: globals.latestHours
      ? DateTime.fromSeconds(globals.latestHours).toFormat("yyyy-MM-dd HH:mm:ss")
      : null,
  };

  // 2. Query the 'hours' table and build HourEntry array.
  const [hoursResult] = await connection.promise().query("SELECT * FROM `hours` ORDER BY start DESC");
  const hrs = Array.isArray(hoursResult) ? (hoursResult as { start: number; data: string }[]) : [];

  const hourEntries: HourEntry[] = [];
  // Parse each row and query gliderport count for that hour
  for (const row of hrs) {
    const d = JSON.parse(row.data) as { start: number; date: number[] };
    const startTs = row.start;
    const startStr = DateTime.fromSeconds(startTs).toFormat("yyyy-MM-dd HH:mm:ss");
    const endStr = DateTime.fromSeconds(startTs + 3600).toFormat("yyyy-MM-dd HH:mm:ss");

    const [countResult] = await connection
      .promise()
      .query("SELECT COUNT(*) as count FROM gliderport WHERE recorded >= ? AND recorded < ?", [startStr, endStr]);
    const count =
      Array.isArray(countResult) && countResult[0] && (countResult[0] as { count: number }).count
        ? (countResult[0] as { count: number }).count
        : 0;

    hourEntries.push({
      start: startTs,
      startString: startStr.replace("00:00", "00"),
      hoursCount: d.date.length,
      gliderportCount: count,
    });
  }

  const hoursTable = {
    count: hourEntries.length,
    entries: hourEntries,
  };

  // 3. Retrieve the server_sent record and compute additional data.
  let serverSent: ServerSentData | null = null;
  const [serverSentResults] = await connection.promise().query("SELECT * FROM `server_sent` WHERE `id`=1");
  if (Array.isArray(serverSentResults) && serverSentResults.length > 0) {
    const r = serverSentResults[0] as any;
    const tsNow = Math.floor(Date.now() / 1000);
    const baseData: ServerSentData = {
      now: tsNow,
      record: r,
    };

    if (r.sun) {
      try {
        baseData.sun = JSON.parse(r.sun);
      } catch {
        baseData.sun = { error: "Invalid JSON in sun field" };
      }
    }
    const computed: {
      [key: string]: { original: number; display: string; delta: string };
    } = {};
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
          display: DateTime.fromSeconds(value).toFormat("yyyy-MM-dd HH:mm:ss"),
          delta: deltaStr,
        };
      }
    });
    baseData.computed = computed;
    serverSent = baseData;
  }

  // 4. Query the code_history table for overview and details.
  const [codeHistoryResults] = await connection
    .promise()
    .query("SELECT * FROM code_history ORDER BY date DESC LIMIT 10");
  let codeHistoryOverview: CodeHistoryOverview[] = [];
  let codeHistoryDetails: CodeHistoryDetails | undefined = undefined;
  if (Array.isArray(codeHistoryResults) && codeHistoryResults.length > 0) {
    const res = codeHistoryResults as any[];
    codeHistoryOverview = res.map((entry) => {
      const parsed = JSON.parse(entry.data);
      return {
        date: entry.date,
        dateString: DateTime.fromSeconds(entry.date).toFormat("yyyy-MM-dd HH:mm:ss"),
        codeChanges: parsed.codes.length,
      };
    });
    const latest = res[0];
    const parsedLatest = JSON.parse(latest.data);
    const s = parsedLatest.limits[0];
    const codesMap = parsedLatest.codes.map((codeTuple: [number, number]) => {
      const descriptions = [
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
        description: descriptions[codeTuple[1]] || `Code ${codeTuple[1]}`,
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

  // 5. Prepare additional "Add Data" info from debugInfo.
  const addData: AddDataInfo = {
    lastCalled: debugInfo.now,
    lastCalledString: DateTime.fromSeconds(debugInfo.now).toFormat("yyyy-MM-dd HH:mm:ss"),
    numberRecordsReceived: debugInfo.numberRecords,
    lastEntryInHours: debugInfo.latestHours,
    lastEntryInHoursString: DateTime.fromSeconds(debugInfo.latestHours).toFormat("yyyy-MM-dd HH:mm:ss"),
    hoursInfo: debugInfo.hours,
    forecast: {
      nextUpdate: debugInfo.tsLast + 3600,
      nextUpdateString: DateTime.fromSeconds(debugInfo.tsLast + 3600).toFormat("yyyy-MM-dd HH:mm:ss"),
      lastUpdate: debugInfo.tsLastPre,
      lastUpdateString: DateTime.fromSeconds(debugInfo.tsLastPre).toFormat("yyyy-MM-dd HH:mm:ss"),
      forecastHours: debugInfo.openWeather.hours,
      forecastStart: debugInfo.openWeather.start / 1000,
      forecastEnd: debugInfo.openWeather.stop / 1000,
    },
    codeHistoryUpdate: debugInfo.codeHistory,
  };

  return {
    gliderportInfo,
    hoursTable,
    serverSent,
    codeHistory: {
      overview: codeHistoryOverview,
      latestDetails: codeHistoryDetails,
    },
    addData,
  };
};

/**
 * Returns a new Express `Router` that exposes:
 *   GET /info → retrieves and returns the assembled information from `info()`.
 *
 * Mount this on your app or a sub-route to provide system and gliderport info endpoints.
 *
 * @returns A `Router` with the route `/info`.
 */
export const infoRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * GET /info
   *
   * Retrieves the latest system and gliderport information, aggregated from various sources.
   *
   * @param req  - The Express request object.
   * @param res  - The Express response object.
   * @returns    JSON containing the assembled `InfoResponse`, or an error message if no DB connection.
   */
  router.get("/info", async (req: Request, res: Response) => {
    if (connection) {
      const response = await info(connection);
      res.json(response);
    } else {
      res.status(500).send("<h1>No connection to database</h1>");
    }
  });

  return router;
};

export default infoRoutes;
