import { app } from "./startExpress";
import express from "express";
import mysql from "mysql2";
import { timestampToString, timestampToLocalString, toHMS } from "./timeConversion";
import globals from "./globals";

// Define interfaces for the various data blocks if desired.
interface GliderportInfo {
  lastRecord: any;
  firstRecord: any;
  tdLast?: string | null;
  numberRecords?: any;
  latestHours: any;
  latestHoursString?: string | null;
}

interface HourEntry {
  start: number;
  startString: string;
  hoursCount: number;
  gliderportCount: number;
}

interface ServerSentData {
  now: number;
  record: any; // raw record from server_sent table
  // For sun data, we convert it into a key/value map:
  sun?: { [key: string]: string };
  // For keys like last_record, last_image, last_forecast, include computed delta info.
  computed?: { [key: string]: { original: number; display: string; delta: string } };
}

interface CodeHistoryOverview {
  date: number;
  dateString: string;
  codeChanges: number;
}

interface CodeHistoryDetails {
  date: number;
  dateString: string;
  limits: [number, number];
  codes: Array<{ time: number; timeHMS: string; description: string; code: number }>;
}

interface AddDataInfo {
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

interface InfoResponse {
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

export const info = async (connection: mysql.Connection): Promise<InfoResponse> => {
  // 1. Gather gliderport info from globals.
  const gliderportInfo: GliderportInfo = {
    lastRecord: globals.lastRecord,
    firstRecord: globals.firstRecord,
    latestHours: globals.latestHours,
    tdLast: globals.firstRecord !== null ? globals.tdLast.toDateString() : null,
    numberRecords: globals.firstRecord !== null ? globals.numberRecords : null,
    latestHoursString: globals.latestHours ? timestampToString(globals.latestHours) : null,
  };

  // 2. Query the hours table.
  const [hoursResult] = await connection.promise().query("SELECT * FROM `hours` ORDER BY start DESC");
  const hrs = Array.isArray(hoursResult) ? (hoursResult as { start: number; data: string }[]) : [];
  // We'll build an array of tuples: [start, hoursCount]
  const l: [number, number][] = [];
  hrs.forEach((v) => {
    const d = JSON.parse(v.data) as { start: number; date: number[] };
    l.push([v.start, d.date.length]);
  });

  // For each hour entry, run a query to count matching gliderport records.
  const hourEntries: HourEntry[] = [];
  for (const [start, hoursCount] of l) {
    const startStr = timestampToString(start);
    const endStr = timestampToString(start + 3600);
    const [countResult] = await connection
      .promise()
      .query("SELECT COUNT(*) as count FROM gliderport WHERE recorded >= ? AND recorded < ?", [startStr, endStr]);
    const count =
      Array.isArray(countResult) && countResult[0] && (countResult[0] as { count: number }).count
        ? (countResult[0] as { count: number }).count
        : 0;
    hourEntries.push({
      start,
      startString: startStr.replace("00:00", "00"),
      hoursCount,
      gliderportCount: count,
    });
  }

  const hoursTable = {
    count: hourEntries.length,
    entries: hourEntries,
  };

  // 3. Get server_sent record.
  let serverSent: ServerSentData | null = null;
  let [serverSentResults] = await connection.promise().query("SELECT * FROM `server_sent` WHERE `id`=1");
  if (Array.isArray(serverSentResults) && serverSentResults.length > 0) {
    const r = serverSentResults[0] as any;
    const tsNow = Math.floor(Date.now() / 1000);
    const baseData: ServerSentData = {
      now: tsNow,
      record: r,
    };

    // Process the "sun" field if it exists and is JSON.
    if (r.sun) {
      try {
        baseData.sun = JSON.parse(r.sun);
      } catch (err) {
        baseData.sun = { error: "Invalid JSON in sun field" };
      }
    }
    // For keys last_record, last_image, last_forecast, compute delta info.
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
        computed[key] = { original: value, display: timestampToString(value), delta: deltaStr };
      }
    });
    baseData.computed = computed;

    serverSent = baseData;
  }

  // 4. Query code_history table.
  const [codeHistoryResults] = await connection
    .promise()
    .query("SELECT * FROM code_history ORDER BY date DESC LIMIT 10");
  let codeHistoryOverview: CodeHistoryOverview[] = [];
  let codeHistoryDetails: CodeHistoryDetails | undefined = undefined;
  if (Array.isArray(codeHistoryResults) && codeHistoryResults.length > 0) {
    const res = codeHistoryResults as any[];
    // Build overview array.
    codeHistoryOverview = res.map((entry) => {
      const parsed = JSON.parse(entry.data);
      return {
        date: entry.date,
        dateString: timestampToString(entry.date).replace(/ .*/g, ""),
        codeChanges: parsed.codes.length,
      };
    });
    // For the latest details, use the first record.
    const latest = res[0];
    const parsedLatest = JSON.parse(latest.data);
    const s = parsedLatest.limits[0];
    // Map codes to include formatted time and description.
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
        timeHMS: toHMS(codeTuple[0] + 3600 * s),
        description: codesDescriptions[codeTuple[1]] || `Code ${codeTuple[1]}`,
        code: codeTuple[1],
      };
    });
    codeHistoryDetails = {
      date: latest.date,
      dateString: timestampToString(latest.date).replace(/ .*/g, ""),
      limits: parsedLatest.limits,
      codes: codesMap,
    };
  }

  // 5. Prepare "Add Data" information from globals.debugInfo.
  const addData: AddDataInfo = {
    lastCalled: globals.debugInfo.now,
    lastCalledString: timestampToString(globals.offset + globals.debugInfo.now),
    numberRecordsReceived: globals.debugInfo.numberRecords,
    lastEntryInHours: globals.debugInfo.latestHours,
    lastEntryInHoursString: timestampToString(globals.debugInfo.latestHours),
    hoursInfo: globals.debugInfo.hours, // assuming already structured appropriately
    forecast: {
      nextUpdate: globals.debugInfo.tsLast + globals.offset + 3600,
      nextUpdateString: timestampToString(globals.debugInfo.tsLast + globals.offset + 3600),
      lastUpdate: globals.debugInfo.tsLastPre,
      lastUpdateString: timestampToString(globals.debugInfo.tsLastPre + globals.offset),
      forecastHours: globals.debugInfo.openWeather.hours,
      forecastStart: globals.debugInfo.openWeather.start + globals.offset / 1000,
      forecastEnd: globals.debugInfo.openWeather.stop + globals.offset / 1000,
    },
    codeHistoryUpdate: globals.debugInfo.codeHistory, // assuming this object is already in the desired format
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
