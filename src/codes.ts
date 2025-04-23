/**
 *
 * Manages code history for the Gliderport system by:
 *  - Converting SQL records to PocketBase (sqlToPbCodeHistory)
 *  - Generating wind condition codes (getCode)
 *  - Initializing and updating today's codes (initialize, updateCodeHistory)
 *  - Exposing Express endpoints for manual triggers and querying codes (codeRoutes)
 *
 * Uses Luxon and sun.js for date/time and sunrise/sunset calculations.
 *
 * @module codes
 */

import { Request, Response, Router } from "express";
import { getSun } from "sun.js";
import { DateTime } from "luxon";
import { WindTable } from "wind.js";
import { forecast } from "./openWeather";

/**
 * A single wind code entry: [secondsSinceLocalMidnight, codeValue].
 */
export type CodeEntry = [number, number];

/**
 * A full day of wind code entries.
 */
export type DayOfCodes = CodeEntry[];

/**
 * Complete history: an array of per-day code sequences.
 */
export let codes: DayOfCodes[] = [];

// Internal state tracking current processing day boundaries
let dayTs = 0; // Local midnight (UNIX seconds)
let sunriseTs = 0; // Sunrise time (UNIX seconds)
let sunsetTs = 0; // Sunset time (UNIX seconds)

/**
 * Discrete wind condition codes.
 */
export enum WindCode {
  IT_IS_DARK = 0,
  SLED_RIDE_BAD_ANGLE,
  SLED_RIDE_POOR_ANGLE,
  SLED_RIDE,
  BAD_ANGLE,
  POOR_ANGLE,
  GOOD,
  EXCELLENT,
  SPEED_BAR,
  TOO_WINDY,
  NO_DATA,
}

/**
 * Returns the UNIX timestamp of local midnight in America/Los_Angeles
 * for the given UTC timestamp.
 *
 * @param ts - UTC timestamp in seconds
 * @returns Local midnight timestamp (seconds)
 */
export function getLastMidnightLA(ts: number): number {
  // 1) Build a Luxon DateTime in the America/Los_Angeles zone
  const dtLA = DateTime.fromSeconds(ts, { zone: "America/Los_Angeles" });
  // 2) Snap to the start of that local day (i.e. midnight)
  const midnightLA = dtLA.startOf("day");
  // 3) Convert back to a UNIX timestamp (seconds)
  return Math.floor(midnightLA.toSeconds());
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
 * Computes a WindCode based on wind speed, wind direction, and light conditions.
 * Returns IT_IS_DARK if `isItDark` is true; otherwise applies thresholds.
 *
 * @param speed - Wind speed in appropriate units
 * @param direction - Wind direction in degrees
 * @param isItDark - True if timestamp is before sunrise or after sunset
 * @returns Corresponding WindCode enum value
 */
export const updateCodes = (windTable: WindTable) => {
  if (codes.length == 0) {
    console.log("codes not initialized");
    return;
  }
  const lastDay = codes[codes.length - 1];
  if (lastDay.length == 0) {
    console.log("last Day is empty");
    return;
  }
  let lastTs = lastDay[lastDay.length - 1][0];
  // search for first timestamp in the windTable that is greater than lastTs
  let idx = windTable.length - 1;
  while (idx > 0 && windTable[idx].timestamp > lastTs) idx--;
  while (idx < windTable.length && windTable[idx].timestamp < lastDay[lastDay.length - 1][0] + 120) idx++;
  while (idx < windTable.length && windTable[idx].timestamp < sunsetTs) {
    const v = windTable[idx];
    const code = getCode(v.speed, v.direction);
    if (code !== lastDay[lastDay.length - 1][1]) {
      lastDay.push([v.timestamp, code]);
      while (idx < windTable.length && windTable[idx].timestamp < v.timestamp + 120) idx++;
    } else idx++;
  }
  if (idx < windTable.length && windTable[idx].timestamp >= sunsetTs) {
    lastDay.push([sunsetTs, WindCode.IT_IS_DARK]);
    dayTs += 24 * 3600;
    const sunData = getSun(DateTime.fromSeconds(dayTs).toJSDate());
    sunriseTs = Math.floor(sunData.sunrise.getTime() / 1000);
    sunsetTs = Math.floor(sunData.sunset.getTime() / 1000);
  }

  while (windTable.length > idx) {
    let day: any = [];
    while (idx < windTable.length && windTable[idx].timestamp < sunriseTs) idx++;
    if (idx >= windTable.length) break;

    if (windTable[idx].timestamp > sunsetTs) {
      //we have no data points for this day
      day.push([sunriseTs, WindCode.NO_DATA]);
    } else {
      const code = getCode(windTable[idx].speed, windTable[idx].direction);
      day.push([sunriseTs, code]);

      while (idx < windTable.length && windTable[idx].timestamp < day[day.length - 1][0] + 120) idx++;
      while (idx < windTable.length && windTable[idx].timestamp < sunsetTs) {
        const v = windTable[idx];
        const code = getCode(v.speed, v.direction);
        if (code !== day[day.length - 1][1]) {
          day.push([v.timestamp, code]);
          while (idx < windTable.length && windTable[idx].timestamp < v.timestamp + 120) idx++;
        } else idx++;
      }
    }
    day.push([sunsetTs, WindCode.IT_IS_DARK]);
    codes.push(day);
    day = [];
    dayTs += 24 * 3600;
    const sunData = getSun(DateTime.fromSeconds(dayTs).toJSDate());
    sunriseTs = Math.floor(sunData.sunrise.getTime() / 1000);
    sunsetTs = Math.floor(sunData.sunset.getTime() / 1000);
  }

  // Remove days older than 15 days
  let fTs = codes[0][0][0];
  const lTs = codes[codes.length - 1][codes[codes.length - 1].length - 1][0];
  while (lTs - fTs > 15 * 24 * 3600) {
    codes.shift();
    fTs = codes[0][0][0];
  }
};

/**
 * Converts the entire windTable into daily code sequences and populates the `codes` array.
 * Iterates through each day, seeding at sunrise, tracking changes until sunset,
 * then closing out and moving to the next day.
 *
 * @param windTable - Sorted array of { timestamp, speed, direction }
 */
export const convertToCodes = (windTable: WindTable) => {
  dayTs = getLastMidnightLA(windTable[0].timestamp);
  const dt = DateTime.fromSeconds(dayTs).toJSDate();
  let sunData = getSun(dt);
  sunriseTs = Math.floor(sunData.sunrise.getTime() / 1000);
  sunsetTs = Math.floor(sunData.sunset.getTime() / 1000);

  let idx = 0;
  let day: any[] = [];

  while (windTable.length > idx) {
    while (windTable[idx].timestamp < sunriseTs) idx++;
    if (windTable[idx].timestamp > sunsetTs) {
      //we have no data points for this day
      day.push([sunriseTs, WindCode.NO_DATA]);
    } else {
      const code = getCode(windTable[idx].speed, windTable[idx].direction);
      day.push([sunriseTs, code]);

      while (idx < windTable.length && windTable[idx].timestamp < day[day.length - 1][0] + 120) idx++;
      while (idx < windTable.length && windTable[idx].timestamp < sunsetTs) {
        const v = windTable[idx];
        const code = getCode(v.speed, v.direction);
        if (code !== day[day.length - 1][1]) {
          day.push([v.timestamp, code]);
          while (idx < windTable.length && windTable[idx].timestamp < v.timestamp + 120) idx++;
        } else idx++;
      }
    }
    if (idx < windTable.length) {
      day.push([sunsetTs, WindCode.IT_IS_DARK]);
      codes.push(day);
      day = [];
      dayTs += 24 * 3600;
      sunData = getSun(DateTime.fromSeconds(dayTs).toJSDate());
      sunriseTs = Math.floor(sunData.sunrise.getTime() / 1000);
      sunsetTs = Math.floor(sunData.sunset.getTime() / 1000);
    } else codes.push(day);
  }
};

/**
 * Handler for GET /getWindTableCodes
 * Calculates wind codes for each windTable entry, including darkness based on sunrise/sunset.
 * Returns a list of timestamps (in seconds), ISO date strings, and their corresponding code whenever it changes.
 *
 * @route GET /getWindTableCodes
 * @returns Array<{ timestamp: number; date: string; code: WindCode }>
 */
async function getWindTableCodesHandler(req: Request, res: Response) {
  res.status(200).json({ codes });
}

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

  // New route: code changes in the windTable
  router.get("/getWindTableCodes", getWindTableCodesHandler);

  return router;
};
