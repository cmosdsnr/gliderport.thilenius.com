/**
 *
 *
 * **This module calculates sun-related times (e.g., sunrise, sunset, and other events)
 * for La Jolla, CA using the SunCalc library, and updates this data in the PocketBase
 * "status" collection.**
 *
 * Key Responsibilities:
 * - Sun Times Calculation:
 *   - Computes sun-related times for a specific date and location (latitude: 32.89, longitude: -117.25).
 *   - On the first run, calculates for today's 10 AM; on subsequent runs, for the next day at 10 AM.
 *
 * - Database Update:
 *   - Converts the computed sun times to UNIX timestamps (seconds since epoch) and updates the
 *     PocketBase "status" collection using a unique ID generated via the ToId helper.
 *
 * - Scheduled Updates:
 *   - Uses node-cron to schedule a daily update of sun data at 10:00 PM.
 *
 * - Module Initialization & Debug Route:
 *   - Automatically updates sun data on module load.
 *   - Provides an Express route (/UpdateSun) for manually triggering the update and inspecting current sun data.
 *
 * Dependencies:
 * - PocketBase (pb): For interacting with the PocketBase backend.
 * - node-cron: For scheduling periodic updates.
 * - SunCalc: For computing sun times.
 * - ToId: For generating unique IDs from strings.
 * - log.js: For logging operations.
 *
 * Usage:
 * - Importing this module will automatically initialize and update the sun data.
 * - The cron job updates the sun data every day at 10:00 PM.
 * - The /UpdateSun endpoint can be used to manually trigger an update and view the current sun data.
 *
 * @module sun
 *
 */

import { Request, Response, Router } from "express";
import { pb } from "pb.js";
import cron from "node-cron";
import SunCalc from "suncalc";
import { ToId } from "miscellaneous.js";
import { logStr, writeLog } from "log.js";

export let sunData: SunCalc.GetTimesResult;
let initialized = false;

/**
 * Computes sun times for a given date at La Jolla, CA.
 *
 * @param {Date} y - The date for which to calculate sun times.
 * @returns {SunCalc.GetTimesResult} The sun times for the specified date and location.
 */
export const getSun = (y: Date): SunCalc.GetTimesResult => {
  // La Jolla latitude and longitude.
  const lat = 32.89;
  const long = -117.25;
  return SunCalc.getTimes(y, lat, long);
};

/**
 * Updates the sun data by computing sun times for a target date and updating the PocketBase "status" collection.
 *
 * On the first run, the target time is set to today's 10 AM. On subsequent runs, the target
 * time is set to 10 AM of the next day.
 *
 * The function logs the computed sunrise and sunset times, converts them to UNIX timestamps,
 * and updates the PocketBase "status" collection with the new sun data.
 *
 * @returns {void}
 */
export const updateSunData = (): void => {
  // Create a Date object for 10 AM.
  const d = new Date();
  d.setHours(10);
  // On the first run, use today's 10 AM; afterwards, use the next day.
  if (!initialized) {
    initialized = true;
  } else {
    d.setDate(d.getDate() + 1);
  }

  // Compute sun times for the specified date and location.
  sunData = getSun(d);
  const log: string[] = [];
  logStr(
    log,
    "updateSunData",
    "Sun Rise:",
    sunData.sunrise.toLocaleString(),
    "Sun Set:",
    sunData.sunset.toLocaleString()
  );
  writeLog(log);

  // Convert each sun event time to a UNIX timestamp (in seconds).
  const sd: Record<string, number> = {};
  for (const [k, v] of Object.entries(sunData)) {
    sd[k] = Math.floor(v.getTime() / 1000);
  }

  // Update the sun data in the PocketBase "status" collection.
  pb.collection("status").update(ToId("sun"), { record: sd });
};

// Immediately update sun data on module load.
updateSunData();

// Schedule updateSunData to run every day at 10:00 PM in Los Angeles time.
cron.schedule("0 22 * * *", updateSunData);

/**
 * Creates and returns an Express router for sun data update endpoints.
 *
 * Exposed Endpoints:
 * - GET /UpdateSun: Manually triggers a sun data update and returns the current sun data.
 *
 * @returns {Router} An Express router with the /UpdateSun endpoint.
 */
export const sunRoutes = (): Router => {
  const router = Router();

  // Debug endpoint to manually update sun data and return the current sunData.
  router.get("/UpdateSun", (req: Request, res: Response) => {
    updateSunData();
    res.json(sunData);
  });

  return router;
};
