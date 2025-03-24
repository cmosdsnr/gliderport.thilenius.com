/**
 *
 * This module handles operations related to the code history for the Gliderport system.
 * It provides functionality for:
 *  - Converting SQL code history records to PocketBase records.
 *  - Generating a code based on wind speed, direction, and light conditions.
 *  - Managing and updating the current day's code history.
 *  - Providing Express endpoints to trigger code history updates and import SQL records.
 *
 * The module uses Luxon for date and time calculations and formatting.
 *
 * Exported Functions:
 *  - updateCodeHistory: Updates the code history record for the current day based on new wind data.
 *  - sqlToPbCodeHistory: Imports new SQL code history records into the PocketBase collection.
 *  - codeRoutes: Returns an Express router with endpoints for updating code history and importing SQL records.
 *
 * @module codes
 */

import { Request, Response, Router } from "express";
import { pb } from "pb.js";
import { ToId } from "miscellaneous.js";
import { connection } from "SqlConnect.js";
import { getSun } from "sun.js";
import { DateTime } from "luxon";
import { windTable } from "wind.js";
import { logStr, writeLog } from "log.js";

type CodeEntry = [number, number];

interface CodeHistoryData {
  codes: CodeEntry[]; // [timestampOffsetInSeconds, code]
  limits: [number, number]; // [startHour, endHour]
  sun: [number, number]; // [sunriseInSeconds, sunsetInSeconds]
}

type TodaysCodes = {
  date: number; // days since epoch
  data: CodeHistoryData;
};

// Define constant codes and their numeric values.
const c = {
  IT_IS_DARK: 0,
  SLED_RIDE_BAD_ANGLE: 1,
  SLED_RIDE_POOR_ANGLE: 2,
  SLED_RIDE: 3,
  BAD_ANGLE: 4,
  POOR_ANGLE: 5,
  GOOD: 6,
  EXCELLENT: 7,
  SPEED_BAR: 8,
  TOO_WINDY: 9,
  NO_DATA: 10,
};

// An array of string descriptions corresponding to each code.
export const codesMeaning = [
  "it is dark",
  "sled ride, bad angle",
  "sled ride, poor angle",
  "sled ride",
  "bad angle",
  "poor angle",
  "good",
  "excellent",
  "speed bar",
  "too windy",
  "no data",
];

// Timestamp of the last code history update.
let lastCodeHistory = 0;

// --------------------------------------------------------
// Function: sqlToPbCodeHistory
// Description:
//   - Fetches the latest codeHistory record ID from PocketBase.
//   - Converts that ID (stored as days since epoch) to a timestamp in seconds.
//   - Queries the SQL code_history table for records newer than that timestamp.
//   - Processes the results in chunks, converting and creating records in PocketBase.
//   - Logs detailed information about the process.
// --------------------------------------------------------
const sqlToPbCodeHistory = async () => {
  const log: string[] = [""];

  // Step 1: Get the largest (latest) id from the codeHistory collection.
  let lastIdDays = 0;
  try {
    const list = await pb.collection("codeHistory").getList(1, 1, { sort: "-id" });
    if (list.items.length > 0) {
      // The id is stored as days since epoch.
      lastIdDays = parseInt(list.items[0].id, 10);
      logStr(log, "sqlToPbCodeHistory", `Last recorded day (id) in codeHistory: ${lastIdDays}`);
    }
  } catch (error) {
    logStr(log, "sqlToPbCodeHistory", "Error fetching last codeHistory record:", error);
  }

  // Convert lastIdDays (days) to a timestamp in seconds.
  const lastTimestamp = lastIdDays * 24 * 3600;
  logStr(log, "sqlToPbCodeHistory", `Filtering SQL records with date > ${lastTimestamp} (seconds)`);

  // Step 2: Query the SQL table for code_history records with date greater than lastTimestamp.
  connection?.query(
    "SELECT * FROM code_history WHERE date > ? ORDER BY date ASC",
    [lastTimestamp],
    async (err, results: any) => {
      if (err) {
        logStr(log, "sqlToPbCodeHistory", "Error querying code_history:", err);
        return;
      }
      if (Array.isArray(results)) {
        logStr(log, "sqlToPbCodeHistory", `Found ${results.length} new records in code_history`);
        const chunkSize = 1000;
        for (let i = 0; i < results.length; i += chunkSize) {
          const chunk = results.slice(i, i + chunkSize);
          try {
            await Promise.all(
              chunk.map(async (record: any) => {
                // Validate the date is a whole day (divisible by 86400 seconds).
                if (parseInt(record.date, 10) % (24 * 3600) !== 0)
                  logStr(
                    log,
                    "sqlToPbCodeHistory",
                    `Invalid date format for record with date ${record.date} and hour ${
                      (parseInt(record.date, 10) % (24 * 3600)) / 3600
                    }`
                  );

                // Convert record.date (seconds) to days since epoch.
                const tsDays = Math.floor(parseInt(record.date, 10) / (24 * 3600));
                // Generate a unique id using the days value.
                const id = ToId(tsDays.toString());
                // Parse the data field to JSON.
                let jsonData;
                try {
                  jsonData = JSON.parse(record.data);
                } catch (parseError) {
                  logStr(
                    log,
                    "sqlToPbCodeHistory",
                    `Error parsing JSON for record with date ${record.date}:`,
                    parseError
                  );
                  jsonData = record.data;
                }
                // Create the record in the PocketBase "codeHistory" collection.
                try {
                  await pb.collection("codeHistory").create({
                    id,
                    data: jsonData,
                  });
                } catch (createError: any) {
                  logStr(
                    log,
                    "sqlToPbCodeHistory",
                    `Error creating codeHistory record with id ${id}:`,
                    createError.message
                  );
                }
              })
            );
            logStr(log, "sqlToPbCodeHistory", `Batch ${Math.floor(i / chunkSize) + 1} processed.`);
          } catch (batchError) {
            logStr(log, "sqlToPbCodeHistory", "Error processing batch:", batchError);
            return;
          }
        }
      }
    }
  );
  writeLog(log);
};

// --------------------------------------------------------
// Function: getCode
// Description: Determines the code value based on wind speed, direction, and light conditions.
// Returns a numeric code corresponding to the conditions.
// --------------------------------------------------------
const getCode = (speed: number, direction: number, isItDark: boolean = false): number => {
  if (isItDark) {
    return c.IT_IS_DARK;
  } else {
    if (speed < 60) {
      if (direction > 310 || direction < 230) {
        return c.SLED_RIDE_BAD_ANGLE;
      } else if (direction > 302 || direction < 236) {
        return c.SLED_RIDE_POOR_ANGLE;
      } else {
        return c.SLED_RIDE;
      }
    } else if (speed < 210) {
      if (direction > 310 || direction < 230) {
        return c.BAD_ANGLE;
      } else if (direction > 302 || direction < 236) {
        return c.POOR_ANGLE;
      } else {
        if (speed <= 110) {
          return c.GOOD;
        } else if (speed < 150) {
          return c.EXCELLENT;
        } else {
          return c.SPEED_BAR;
        }
      }
    } else {
      return c.TOO_WINDY;
    }
  }
};

// --------------------------------------------------------
// Global variable: todaysCodes
// Description: Stores the code history for the current day.
// --------------------------------------------------------
let todaysCodes: TodaysCodes = {
  date: 0,
  data: {
    codes: [],
    sun: [0, 0],
    limits: [0, 0],
  },
};

// --------------------------------------------------------
// Function: getSecondsIntoLocalDay
// Description: Computes the number of seconds into the local day for a given timestamp.
// Uses the Los Angeles timezone for local day calculation.
// --------------------------------------------------------
const getSecondsIntoLocalDay = (ts: number) => {
  const localMidnight = DateTime.fromSeconds(ts, {
    zone: "America/Los_Angeles",
  }).startOf("day");
  return ts - Math.floor(localMidnight.toSeconds());
};

// --------------------------------------------------------
// Function: createNewDay
// Description: Creates a new TodaysCodes record for a given day based on a timestamp.
// It calculates sunrise/sunset times using getSun and sets limits accordingly.
// --------------------------------------------------------
const createNewDay = (ts: number): TodaysCodes => {
  // 'ts' represents 12AM UTC of the day.
  // Convert ts into a DateTime in the Los Angeles timezone.
  const dayLA = DateTime.fromSeconds(ts, { zone: "America/Los_Angeles" }).startOf("day");
  const noonLA = dayLA.plus({ hours: 12 });
  const sunData = getSun(noonLA.toJSDate());

  // Compute seconds from the start of the local day to sunrise and sunset.
  const sunriseSec = Math.floor((sunData.sunrise.getTime() - dayLA.toMillis()) / 1000);
  const sunsetSec = Math.floor((sunData.sunset.getTime() - dayLA.toMillis()) / 1000);

  return {
    date: dayLA.toSeconds(),
    data: {
      codes: [],
      sun: [sunriseSec, sunsetSec],
      limits: [sunData.sunrise.getHours() - 1, sunData.sunset.getHours() + 2],
    },
  };
};

// --------------------------------------------------------
// Function: loadTodaysCodes
// Description: Loads today's codeHistory record from PocketBase or creates a new one if not found.
// --------------------------------------------------------
const loadTodaysCodes = async () => {
  const log: string[] = [""];

  // Get current time in Los Angeles.
  const nowLA = DateTime.now().setZone("America/Los_Angeles");
  const localDayMillis = nowLA.startOf("day").toMillis();
  const localDays = Math.floor(localDayMillis / (24 * 3600 * 1000));

  // Use the day count as the record id (converted via ToId).
  const todayId = ToId(localDays.toString());

  try {
    // Attempt to fetch today's codeHistory record.
    const record = await pb.collection("codeHistory").getOne(todayId);
    // Normalize the date to seconds.
    todaysCodes = { date: Math.floor(localDayMillis / 1000), data: record.data };
    // Remove the sunset point so new data can be appended.
    if (todaysCodes.data.codes && todaysCodes.data.codes.length > 0) {
      todaysCodes.data.codes.pop();
    }
    logStr(
      log,
      "loadTodaysCodes",
      "Loaded today's codeHistory record:",
      nowLA.toLocaleString(DateTime.DATETIME_MED),
      todaysCodes.date
    );
  } catch (error: any) {
    // If no record exists, create a new one for today.
    todaysCodes = createNewDay(localDays * 24 * 3600);
    logStr(log, "loadTodaysCodes", "No codeHistory record found for today; created a new one.");
  }
  writeLog(log);
};
await loadTodaysCodes();

// --------------------------------------------------------
// Function: updateCodeHistory
// Description: Updates today's code history record with new wind data.
// It creates a new record if a new day is detected and processes new wind entries.
// --------------------------------------------------------
export const updateCodeHistory = async () => {
  const log: string[] = [""];

  // Get the current time in Los Angeles and compute the start of the local day.
  const nowLA = DateTime.now().setZone("America/Los_Angeles");
  const localDayMillis = nowLA.startOf("day").toMillis();
  const localDays = Math.floor(localDayMillis / 1000);

  // If a new day is detected, create a new codeHistory record.
  if (localDays !== todaysCodes.date) {
    logStr(
      log,
      "updateCodeHistory",
      "New day detected. Creating new code history.",
      localDays,
      "!==",
      todaysCodes.date,
      localDays / (24 * 3600),
      "!==",
      todaysCodes.date / (24 * 3600)
    );
    todaysCodes = createNewDay(localDays);
    await pb.collection("codeHistory").update(ToId(Math.floor(todaysCodes.date / (24 * 3600)).toString()), {
      data: todaysCodes.data,
    });
  }

  // If the last code timestamp already matches the expected value, no update is needed.
  if (
    todaysCodes.data.codes[todaysCodes.data.codes.length - 1][0] ==
    todaysCodes.data.sun[1] - 3600 * todaysCodes.data.limits[0]
  ) {
    logStr(log, "updateCodeHistory", "codeHistory already updated for today");
    return;
  }

  // Step 1: Determine the last recorded timestamp and code for today.
  let lastSecondsIntoLocalDay = 0;
  let lastCode = 0;
  if (todaysCodes.data.codes.length === 0) {
    logStr(
      log,
      "updateCodeHistory",
      "ERROR: Found zero-length codes on",
      DateTime.fromSeconds(todaysCodes.date).toLocaleString(DateTime.DATETIME_MED)
    );
    lastCode = 0;
    lastSecondsIntoLocalDay = 3600 * todaysCodes.data.limits[0];
  } else {
    lastCode = todaysCodes.data.codes[todaysCodes.data.codes.length - 1][1];
    lastSecondsIntoLocalDay =
      todaysCodes.data.codes[todaysCodes.data.codes.length - 1][0] + 3600 * todaysCodes.data.limits[0];
  }

  // Find the index in windTable corresponding to the beginning of the day.
  let i = 0;
  logStr(
    log,
    "updateCodeHistory",
    "looking for",
    localDays + todaysCodes.data.sun[0],
    "in",
    windTable[i].timestamp,
    "to",
    windTable[windTable.length - 1].timestamp
  );
  while (windTable[i].timestamp <= localDays + todaysCodes.data.sun[0]) i++;

  logStr(
    log,
    "updateCodeHistory",
    "Since the last codeHistory record at",
    DateTime.fromSeconds(windTable[i].timestamp).toLocaleString(DateTime.DATETIME_MED),
    "with code",
    lastCode,
    ", there are",
    windTable.length - i,
    "new wind data points."
  );

  let changed = false;
  // Process new wind records starting from index i.
  for (; i < windTable.length; i++) {
    const v = windTable[i];
    const secondsIntoLocalDay = getSecondsIntoLocalDay(v.timestamp);

    // Only process wind data recorded after sunrise.
    if (secondsIntoLocalDay > todaysCodes.data.sun[0]) {
      // If no code has been recorded yet, add the sunrise point.
      if (todaysCodes.data.codes.length === 0) {
        lastCode = i > 0 ? getCode(windTable[i - 1].speed, windTable[i - 1].direction) : getCode(v.speed, v.direction);
        todaysCodes.data.codes.push([todaysCodes.data.sun[0] - 3600 * todaysCodes.data.limits[0], lastCode]);
      }

      // Before sunset, check if a new code should be added based on wind data.
      if (secondsIntoLocalDay < todaysCodes.data.sun[1]) {
        const lastSecondsIntoLocalDay =
          todaysCodes.data.codes[todaysCodes.data.codes.length - 1][0] + 3600 * todaysCodes.data.limits[0];
        const newCode = getCode(v.speed, v.direction);
        // Add a new code point if the code has changed and at least 2 minutes have passed.
        if (newCode !== lastCode && secondsIntoLocalDay - lastSecondsIntoLocalDay > 120) {
          changed = true;
          lastCode = newCode;
          todaysCodes.data.codes.push([secondsIntoLocalDay - 3600 * todaysCodes.data.limits[0], lastCode]);
        }
      }
    }
  }
  if (changed) {
    logStr(log, "updateCodeHistory", "codeHistory has a new code, saving it.");
    // Append the sunset point because the record may not update again.
    todaysCodes.data.codes.push([todaysCodes.data.sun[1] - 3600 * todaysCodes.data.limits[0], 0]);
    try {
      // Update the day's codeHistory record in PocketBase.
      await pb.collection("codeHistory").update(ToId(Math.floor(todaysCodes.date / (24 * 3600)).toString()), {
        data: todaysCodes.data,
      });
    } catch (updateError) {
      logStr(log, "updateCodeHistory", "Error updating codeHistory record:", updateError);
    }
    // If the day isn't finished yet, remove the sunset point so it can be updated later.
    const secondsIntoLocalDay = getSecondsIntoLocalDay(windTable[windTable.length - 1].timestamp);
    if (secondsIntoLocalDay < todaysCodes.data.sun[1]) todaysCodes.data.codes.pop();
  }
  writeLog(log);
};

/**
 * This module defines an Express router that exposes endpoints for managing and updating the code history.
 *
 * It provides the following endpoints:
 * - GET /updateCodeHistory: Triggers an update of the current day's code history based on new wind data.
 * - GET /sqlToPbCodeHistory: Imports SQL code history records into the PocketBase "codeHistory" collection.
 *
 * These endpoints are primarily used for administrative and debugging purposes to ensure that the
 * code history data remains synchronized between the SQL database and PocketBase.
 *
 * @returns {Router} An Express Router configured with the code history endpoints.
 *
 */
export const codeRoutes = (): Router => {
  const router = Router();

  // Endpoint to update the code history record based on new wind data.
  router.get("/updateCodeHistory", async (req: Request, res: Response) => {
    try {
      updateCodeHistory(); // Trigger updateCodeHistory when wind data updates.
      res.status(200).send("ok");
    } catch (error) {
      res.status(500).send("Error reading archive files.");
    }
  });

  // Endpoint to import SQL code history records into PocketBase.
  router.get("/sqlToPbCodeHistory", async (req: Request, res: Response) => {
    const log: string[] = [""]; // Initialize log for process details.
    try {
      logStr(log, "sqlToPbCodeHistory", "###############################################");
      logStr(log, "sqlToPbCodeHistory", "sqlToPbCodeHistory called");
      writeLog(log);
      await sqlToPbCodeHistory();
      res.status(200).json({ log });
    } catch (error) {
      res.status(500).send("Error reading archive files.");
    }
  });

  return router;
};
