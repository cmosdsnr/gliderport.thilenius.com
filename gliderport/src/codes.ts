/**
 * @packageDocumentation
 *
 * Manages code history for the Gliderport system by:
 * - Converting SQL records to PocketBase (`sqlToPbCodeHistory`)
 * - Generating wind condition codes (`getCode`)
 * - Initializing and updating today’s codes (`initialize`, `updateCodeHistory`)
 * - Exposing Express endpoints for manual triggers and querying codes (`codeRoutes`)
 *
 * Uses Luxon and sun.js for date/time and sunrise/sunset calculations.
 *
 * @module codes
 */

import { Request, Response, Router } from "express";
import { getSun } from "sun.js";
import { DateTime } from "luxon";
import { WindTable } from "wind.js";

/**
 * A single wind code entry.
 * @typedef CodeEntry
 * @type {[number, number]}
 * @property {number} 0 – Seconds since local midnight (UNIX seconds).
 * @property {number} 1 – Code value (see {@link WindCode}).
 */
export type CodeEntry = [number, number];

/**
 * A full day of wind code entries.
 * @typedef DayOfCodes
 * @type {CodeEntry[]}
 */
export type DayOfCodes = CodeEntry[];

/**
 * Complete history: an array of per-day code sequences.
 */
export let codes: DayOfCodes[] = [];

// Internal state tracking current processing day boundaries:
let dayTs = 0; // Local midnight (UNIX seconds).
let sunriseTs = 0; // Sunrise time (UNIX seconds).
let sunsetTs = 0; // Sunset time (UNIX seconds).

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
 * @param ts - UTC timestamp in seconds.
 * @returns Local midnight timestamp (seconds).
 */
export function getLastMidnightLA(ts: number): number {
  const dtLA = DateTime.fromSeconds(ts, { zone: "America/Los_Angeles" });
  const midnightLA = dtLA.startOf("day");
  return Math.floor(midnightLA.toSeconds());
}

/**
 * Computes a wind condition code based on wind speed, wind direction, and ambient light.
 *
 * - If `isItDark` is true, returns {@link WindCode.IT_IS_DARK}.
 * - Otherwise, applies thresholds:
 *   - **Low speed (< 60)**:
 *     - direction > 310 or < 230 → `SLED_RIDE_BAD_ANGLE`
 *     - direction > 302 or < 236 → `SLED_RIDE_POOR_ANGLE`
 *     - else → `SLED_RIDE`
 *   - **Moderate speed (60 ≤ speed < 210)**:
 *     - direction > 310 or < 230 → `BAD_ANGLE`
 *     - direction > 302 or < 236 → `POOR_ANGLE`
 *     - else:
 *       - speed ≤ 110 → `GOOD`
 *       - speed < 150 → `EXCELLENT`
 *       - otherwise → `SPEED_BAR`
 *   - **High speed (≥ 210)**:
 *     - → `TOO_WINDY`
 *
 * @param speed     - Wind speed.
 * @param direction - Wind direction in degrees.
 * @param isItDark  - Whether it is dark. Defaults to `false`.
 * @returns A {@link WindCode} corresponding to the wind conditions.
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
 * Updates the code history for the current day based on a new wind table.
 * - Finds the most recent code entry and processes new windTable entries until sunset.
 * - Appends code changes at 2-minute intervals.
 * - When sunset is reached, pushes a `IT_IS_DARK` entry at sunset, then advances to next day.
 * - Continues processing until windTable is exhausted.
 * - Finally, prunes history older than 15 days.
 *
 * @param windTable - Sorted array of `{ timestamp: number; speed: number; direction: number; }`.
 */
export const updateCodes = (windTable: WindTable): void => {
  if (codes.length === 0) {
    console.log("codes not initialized");
    return;
  }
  const lastDay = codes[codes.length - 1];
  if (lastDay.length === 0) {
    console.log("last Day is empty");
    return;
  }

  let lastTs = lastDay[lastDay.length - 1][0];
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
    let day: CodeEntry[] = [];
    while (idx < windTable.length && windTable[idx].timestamp < sunriseTs) idx++;
    if (idx >= windTable.length) break;

    if (windTable[idx].timestamp > sunsetTs) {
      // No data points for this day
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

  // Prune days older than 15 days
  let fTs = codes[0][0][0];
  const lTs = codes[codes.length - 1][codes[codes.length - 1].length - 1][0];
  while (lTs - fTs > 15 * 24 * 3600) {
    codes.shift();
    fTs = codes[0][0][0];
  }
};

/**
 * Converts an entire wind table into daily code sequences and populates `codes`.
 * - Initializes `dayTs` at local midnight of the first wind record.
 * - Retrieves sunrise/sunset times for that day.
 * - Iterates through windTable:
 *   - Skips until sunrise, then captures first code at sunrise.
 *   - Records code changes every 2 minutes until sunset.
 *   - Pushes a `IT_IS_DARK` entry at sunset, advances to next day, and repeats.
 *
 * @param windTable - Sorted array of `{ timestamp: number; speed: number; direction: number; }`.
 */
export const convertToCodes = (windTable: WindTable): void => {
  if (windTable.length === 0) {
    console.warn("convertToCodes called with empty windTable");
    return;
  }
  dayTs = getLastMidnightLA(windTable[0].timestamp);
  let sunData = getSun(DateTime.fromSeconds(dayTs).toJSDate());
  sunriseTs = Math.floor(sunData.sunrise.getTime() / 1000);
  sunsetTs = Math.floor(sunData.sunset.getTime() / 1000);

  let idx = 0;
  let day: CodeEntry[] = [];

  while (windTable.length > idx) {
    while (windTable[idx]?.timestamp < sunriseTs) idx++;
    // if windTable[idx] doesn't have keys timestamp, speed, direction, skip it
    if (
      !windTable[idx] ||
      !("timestamp" in windTable[idx]) ||
      !("speed" in windTable[idx]) ||
      !("direction" in windTable[idx])
    ) {
      console.warn(`Skipping invalid windTable entry at index ${idx}:`, windTable[idx], " length:", windTable.length);
      idx++;
      continue;
    }
    if (windTable[idx]?.timestamp > sunsetTs) {
      // No data points for this day
      day.push([sunriseTs, WindCode.NO_DATA]);
    } else {
      const code = getCode(windTable[idx].speed, windTable[idx].direction);
      day.push([sunriseTs, code]);

      while (idx < windTable.length && windTable[idx]?.timestamp < day[day.length - 1][0] + 120) idx++;
      while (idx < windTable.length && windTable[idx]?.timestamp < sunsetTs) {
        const v = windTable[idx];
        const code = getCode(v.speed, v.direction);
        if (code !== day[day.length - 1][1]) {
          day.push([v.timestamp, code]);
          while (idx < windTable.length && windTable[idx]?.timestamp < v.timestamp + 120) idx++;
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
    } else {
      codes.push(day);
    }
  }
};

/**
 * Handler for GET `/getWindTableCodes`.
 * Responds with the current `codes` array, containing arrays of
 * `[timestamp: number, code: number]` entries for each day.
 *
 * @param req - Express request (unused).
 * @param res - Express response.
 */
async function getWindTableCodesHandler(req: Request, res: Response): Promise<void> {
  res.status(200).json({ codes });
}

/**
 * Returns a new Express `Router` that exposes:
 *   GET /getWindTableCodes → returns the entire `codes` array.
 *
 * Mount this on your app or a sub-route to provide code history endpoints.
 *
 * @returns A `Router` with the route `/getWindTableCodes`.
 */
export const codeRoutes = (): Router => {
  const router = Router();

  /**
   * Retrieves the current wind-table code history.
   *
   * @route GET /getWindTableCodes
   * @returns JSON object with the `codes` array.
   */
  router.get("/getWindTableCodes", getWindTableCodesHandler);

  return router;
};
