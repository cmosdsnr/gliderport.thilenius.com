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

export type TodaysCodes = {
  lastCode: number;
  timestamps: {
    dayStart: number;
    sunrise: number;
    sunset: number;
    start: number;
    stop: number;
    next: number;
  };
  id: string;
  data: CodeHistoryData;
};

// An array of string descriptions corresponding to each code.
// export const codesMeaning = [
//   "it is dark",
//   "sled ride, bad angle",
//   "sled ride, poor angle",
//   "sled ride",
//   "bad angle",
//   "poor angle",
//   "good",
//   "excellent",
//   "speed bar",
//   "too windy",
//   "no data",
// ];

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

                // overwrite todays data if this is for today
                if (todaysCodes.id === id) todaysCodes.data = jsonData;
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

/**
 * Enum representing various wind condition codes.
 */
export enum WindCode {
  IT_IS_DARK = 0,
  SLED_RIDE_BAD_ANGLE = 1,
  SLED_RIDE_POOR_ANGLE = 2,
  SLED_RIDE = 3,
  BAD_ANGLE = 4,
  POOR_ANGLE = 5,
  GOOD = 6,
  EXCELLENT = 7,
  SPEED_BAR = 8,
  TOO_WINDY = 9,
  NO_DATA = 10,
}

/**
 * Computes a wind condition code based on wind speed, wind direction, and ambient light.
 *
 * The function evaluates the provided wind speed and direction. If it is dark (isItDark is true),
 * it returns the corresponding dark condition code. Otherwise, it applies the following logic:
 *
 * - For low wind speeds (less than 60):
 *   - If the direction is very unfavorable (direction > 310 or direction < 230), return SLED_RIDE_BAD_ANGLE.
 *   - If the direction is slightly less extreme (direction > 302 or direction < 236), return SLED_RIDE_POOR_ANGLE.
 *   - Otherwise, return SLED_RIDE.
 *
 * - For moderate wind speeds (60 to less than 210):
 *   - If the direction is very unfavorable, return BAD_ANGLE.
 *   - If the direction is slightly less favorable, return POOR_ANGLE.
 *   - Otherwise, the wind speed determines:
 *       - If speed is less than or equal to 110, return GOOD.
 *       - If speed is less than 150, return EXCELLENT.
 *       - Otherwise, return SPEED_BAR.
 *
 * - For high wind speeds (210 and above), return TOO_WINDY.
 *
 * @param speed - The wind speed.
 * @param direction - The wind direction in degrees.
 * @param isItDark - Whether it is dark. Defaults to false.
 * @returns {WindCode} A numeric code (from the WindCode enum) corresponding to the wind conditions.
 */
export function getCode(speed: number, direction: number, isItDark: boolean = false): WindCode {
  if (isItDark) {
    return WindCode.IT_IS_DARK;
  }

  if (speed < 60) {
    if (direction > 310 || direction < 230) {
      return WindCode.SLED_RIDE_BAD_ANGLE;
    } else if (direction > 302 || direction < 236) {
      return WindCode.SLED_RIDE_POOR_ANGLE;
    } else {
      return WindCode.SLED_RIDE;
    }
  } else if (speed < 210) {
    if (direction > 310 || direction < 230) {
      return WindCode.BAD_ANGLE;
    } else if (direction > 302 || direction < 236) {
      return WindCode.POOR_ANGLE;
    } else {
      if (speed <= 110) {
        return WindCode.GOOD;
      } else if (speed < 150) {
        return WindCode.EXCELLENT;
      } else {
        return WindCode.SPEED_BAR;
      }
    }
  } else {
    return WindCode.TOO_WINDY;
  }
}

/**
 * Initializes and returns a new TodaysCodes record.
 *
 * This function performs the following steps:
 * 1. Determines the start of the current day in the "America/Los_Angeles" timezone.
 * 2. Computes a unique ID for today's record based on the number of days since epoch.
 * 3. Calculates sun-related times (sunrise and sunset) for 12 PM local time using getSun.
 * 4. Converts the sunrise and sunset times to UNIX timestamps (in seconds).
 * 5. Attempts to load an existing codeHistory record from PocketBase using the computed ID.
 *    - If found, extracts the stored data, computes the next update time, and retrieves the last recorded code.
 *    - If not found, initializes a new data object with empty codes and default sun times.
 *
 * The function returns a TodaysCodes object containing:
 * - lastCode: The last recorded wind code.
 * - timestamps: An object containing various time markers (dayStart, sunrise, sunset, start, stop, next).
 * - id: The unique identifier for today's codeHistory record.
 * - data: The existing or newly initialized code history data.
 *
 * @returns {Promise<TodaysCodes>} A promise that resolves to the initialized TodaysCodes record.
 */
export const initialize = async (): Promise<TodaysCodes> => {
  // Determine the start of the day (in LA timezone) and convert it to a UNIX timestamp (in seconds).
  const tsStartOfDay = DateTime.now().setZone("America/Los_Angeles").startOf("day");
  const dayStart = Math.floor(tsStartOfDay.toSeconds());

  // Generate a unique ID based on the day (days since epoch).
  const id = ToId(Math.floor(dayStart / (24 * 3600)).toString());

  // Compute sun times for 12 PM on the current day.
  const sunData = getSun(tsStartOfDay.plus({ hours: 12 }).toJSDate());
  // Convert sunrise and sunset to UNIX timestamps (in seconds).
  const sunrise = Math.floor(sunData.sunrise.getTime() / 1000);
  const sunset = Math.floor(sunData.sunset.getTime() / 1000);

  // Initialize the next update time to sunrise by default and set the last code to 0.
  let next = sunrise;
  let lastCode = 0;
  let data: any = {};

  // Attempt to load an existing codeHistory record for today from PocketBase.
  try {
    let record = await pb.collection("codeHistory").getOne(id);
    if (record) {
      data = record.data;
      // Compute the next update time based on the last code record.
      next = data.codes[data.codes.length - 1][0] + 3600 * data.limits[0] + dayStart + 120;
      // Retrieve the last recorded code.
      lastCode = data.codes[data.codes.length - 1][1];
    }
  } catch (error: any) {
    // If no record exists, initialize default data.
    const sunriseSec = Math.floor(sunrise - dayStart);
    const sunsetSec = Math.floor(sunset - dayStart);
    const sunriseLocalHour = DateTime.fromJSDate(sunData.sunrise).setZone("America/Los_Angeles").hour;
    const sunsetLocalHour = DateTime.fromJSDate(sunData.sunset).setZone("America/Los_Angeles").hour;

    data = {
      codes: [],
      sun: [sunriseSec, sunsetSec],
      limits: [sunriseLocalHour - 1, sunsetLocalHour + 2],
    };
  }

  // Return the initialized TodaysCodes object.
  return {
    lastCode,
    timestamps: {
      dayStart,
      sunrise,
      sunset,
      // 'start' and 'stop' are computed based on dayStart and the defined limits.
      start: dayStart + 3600 * data.limits[0],
      stop: dayStart + 3600 * data.limits[1],
      next,
    },
    id,
    data,
  };
};

let todaysCodes: TodaysCodes = await initialize();

/**
 *
 * Updates today's code history record with new wind data.
 *
 * This function performs the following steps:
 * 1. Checks if a new day has started by comparing the current timestamp with the day's start.
 *    - If a new day is detected, it reinitializes the daily code history record.
 * 2. Checks if the current time is past sunset (as recorded in today's timestamps).
 *    - If so, the function logs that no further updates are needed for today and returns.
 * 3. Verifies that there is new wind data available (i.e. the last wind record is more recent than the next expected update time).
 *    - If no new data is available, it logs this and returns early.
 * 4. Processes new wind records from the in-memory windTable:
 *    - If no code has been recorded yet, it uses the first wind record to generate an initial code (typically corresponding to sunrise).
 *    - For each subsequent wind record before sunset, it calculates a new code using `getCode` and, if the code changes and at least 2 minutes have passed since the last update, appends the new code.
 *    - It then advances the index past the current batch of records to skip over time intervals that have already been processed.
 * 5. If any changes were made, appends a final sunset point, and updates the PocketBase "codeHistory" record.
 *    - In case the update fails, it attempts to create a new record.
 *    - Finally, if the day isn’t finished yet, it removes the appended sunset point so that further updates are possible.
 * 6. Writes the accumulated log for debugging.
 *
 * @returns {Promise<void>} A promise that resolves when the update process is complete.
 */

export const updateCodeHistory = async (): Promise<void> => {
  // Initialize log array to record process details.
  const log: string[] = [""];
  // Get the current time in seconds.
  const now = DateTime.now().toSeconds();

  // Check if a new day has started; if so, reinitialize the day's code history record.
  if (now > todaysCodes.timestamps.dayStart + 24 * 3600) {
    todaysCodes = await initialize();
  }

  // If the current time is past today's sunset, log that no update is needed and exit.
  if (now > todaysCodes.timestamps.sunset) {
    logStr(log, "updateCodeHistory", "codeHistory already updated for today");
    return;
  }

  // If the most recent wind data is not newer than the expected next update time, skip the update.
  if (windTable[windTable.length - 1].timestamp < todaysCodes.timestamps.next) {
    logStr(log, "updateCodeHistory", "No wind data of interest, skipping update.");
    return;
  }

  // Find the index in windTable for the first record with a timestamp greater than the next expected update time.
  let i = 0;
  while (windTable[i].timestamp <= todaysCodes.timestamps.next) i++;

  let changed = false; // Flag to indicate if any new code has been recorded.

  // Process each new wind record from index i.
  for (; i < windTable.length; i++) {
    const v = windTable[i];

    // If no code has been recorded yet, use the current record to create the initial code.
    if (todaysCodes.data.codes.length === 0) {
      todaysCodes.lastCode = getCode(v.speed, v.direction);
      // Record the sunrise code entry at a time offset calculated from the sunrise time.
      todaysCodes.data.codes.push([todaysCodes.data.sun[0] - 3600 * todaysCodes.data.limits[0], todaysCodes.lastCode]);
      changed = true;
    }

    // If the current record is before sunset, determine if a new code should be added.
    if (v.timestamp < todaysCodes.timestamps.sunset) {
      const newCode = getCode(v.speed, v.direction);
      // If the new code is different and at least 2 minutes have passed since the last code entry, record the new code.
      if (newCode !== todaysCodes.lastCode) {
        todaysCodes.lastCode = newCode;
        todaysCodes.data.codes.push([
          v.timestamp - todaysCodes.timestamps.dayStart - 3600 * todaysCodes.data.limits[0],
          todaysCodes.lastCode,
        ]);
        changed = true;
      }
    }

    if (changed) {
      // Update the next expected update time to 2 minutes after the current record's timestamp.
      todaysCodes.timestamps.next = windTable[i].timestamp + 120;
      // Skip ahead in the wind table to the next record past the update threshold.
      while (i < windTable.length - 1 && windTable[i].timestamp <= todaysCodes.timestamps.next) i++;
    }
  }

  // If any new code was recorded, proceed to update the code history record in PocketBase.
  if (changed) {
    logStr(log, "updateCodeHistory", "codeHistory has a new code, saving it.");
    // Append a sunset point because the record may not be updated again later.
    todaysCodes.data.codes.push([todaysCodes.data.sun[1] - 3600 * todaysCodes.data.limits[0], 0]);
    try {
      // Attempt to update the day's codeHistory record.
      await pb.collection("codeHistory").update(todaysCodes.id, { data: todaysCodes.data });
    } catch (updateError) {
      logStr(log, "updateCodeHistory", "Error updating codeHistory record:", updateError);
      try {
        // If updating fails, attempt to create a new codeHistory record.
        await pb.collection("codeHistory").create({
          id: todaysCodes.id,
          data: todaysCodes.data,
        });
        logStr(log, "updateCodeHistory", "Created the record instead");
      } catch (updateError) {
        logStr(log, "updateCodeHistory", "Error creating codeHistory record:", updateError);
      }
    }
    // If the day hasn't ended (i.e., latest wind data is before sunset), remove the sunset point to allow further updates.
    if (windTable[windTable.length - 1].timestamp < todaysCodes.timestamps.sunset) todaysCodes.data.codes.pop();
  }
  // Write the accumulated log.
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

  router.get("/TodaysCodes", async (req: Request, res: Response) => {
    res.status(200).json(todaysCodes);
  });

  return router;
};
