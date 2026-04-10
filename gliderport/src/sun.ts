/**
 * @packageDocumentation
 *
 * **This module calculates sun-related times (e.g., sunrise, sunset, and other events)
 * for La Jolla, CA using the SunCalc library, and updates this data in the PocketBase
 * "status" collection.**
 *
 * ## Key Responsibilities
 * - **Sun Times Calculation**: Computes sun times for a specific date at latitude 32.89, longitude -117.25.
 *   - On first run, calculates for today's 10 AM; on subsequent runs, for the next day at 10 AM.
 * - **Database Update**: Logs computed times and updates the PocketBase "status" record with UNIX timestamps.
 * - **Scheduled Updates**: Uses node-cron to run daily at 10:00 PM (America/Los_Angeles).
 * - **Manual Trigger Endpoint**: Exposes GET /UpdateSun to manually trigger and inspect current sun data.
 *
 * ## Dependencies
 * - `pocketbase` (`pb`): For updating status.
 * - `node-cron`: For scheduling daily updates.
 * - `suncalc`: For computing sun times.
 * - `miscellaneous` (`ToId`): For generating fixed-length IDs.
 * - `log.js` (`logStr`, `writeLog`): For logging operations.
 *
 * @module sun
 */

import { Request, Response, Router } from "express";
import { pb } from "pb";
import { registerEndpoint } from "endpointRegistry";
import cron from "node-cron";
import SunCalc from "suncalc";
import { ToId } from "miscellaneous";
import { logStr, writeLog, __logDir } from "log";
import path from "path";

const __LogFile = path.join(__logDir, "gliderport.log");

/**
 * The most recently computed sun-event times for La Jolla, CA.
 *
 * Populated on module load by the first call to {@link updateSunData} and refreshed
 * nightly at 22:00 America/Los_Angeles. Includes events such as `sunrise`, `sunset`,
 * `solarNoon`, `goldenHour`, etc., as defined by the SunCalc library.
 */
export let sunData: SunCalc.GetTimesResult;

/** `true` after the first call to {@link updateSunData}; controls whether the calculation
 *  targets today or the next day. */
let initialized = false;

/**
 * Computes sun times for a given date at La Jolla, CA.
 *
 * @param date - The target date for which to calculate sun times.
 * @returns SunCalc.GetTimesResult containing events like sunrise, sunset, solar noon, etc.
 */
export const getSun = (date: Date): SunCalc.GetTimesResult => {
  const LATITUDE = 32.89;
  const LONGITUDE = -117.25;
  return SunCalc.getTimes(date, LATITUDE, LONGITUDE);
};

/**
 * Calculates sun times at 10 AM local time and updates PocketBase with UNIX timestamps.
 *
 * - On first invocation: calculates for today at 10 AM.
 * - On subsequent invocations: increments to next day at 10 AM.
 * - Logs sunrise and sunset to the application log.
 * - Converts all sun event times to seconds since epoch and updates the `status` record.
 */
export const updateSunData = (): void => {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  if (initialized) {
    date.setDate(date.getDate() + 1);
  } else {
    initialized = true;
  }

  // Compute times and log
  sunData = getSun(date);
  const log: string[] = [""];
  logStr(
    log,
    "updateSunData",
    "Sunrise:",
    sunData.sunrise.toLocaleString(),
    "Sunset:",
    sunData.sunset.toLocaleString(),
  );
  writeLog(__LogFile, log);

  // Convert to UNIX seconds and prepare record
  const record: Record<string, number> = {};
  Object.entries(sunData).forEach(([event, time]) => {
    record[event] = Math.floor(time.getTime() / 1000);
  });

  // Update PocketBase status
  pb.collection("status").update(ToId("sun"), { record });
};

// Immediately perform an initial update on load
updateSunData();

// Schedule daily updates at 22:00 (10 PM) America/Los_Angeles time
cron.schedule("0 22 * * *", updateSunData, { timezone: "America/Los_Angeles" });

/**
 * Returns a new Express `Router` that exposes:
 *   GET /UpdateSun → manually triggers updateSunData() and returns the latest sunData.
 *
 * Mount this on your app or a sub-route to provide sun data endpoints.
 *
 * @returns A `Router` with the route `/UpdateSun`.
 */
export const sunRoutes = (): Router => {
  const router = Router();

  /**
   * GET /UpdateSun
   * Triggers a sun data recalculation and returns the current sunData JSON.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/UpdateSun",
    group: "Forecasts",
    signature: "UpdateSun: () => SunCalc.GetTimesResult",
    description:
      "Manually triggers a sun data recalculation for La Jolla, CA and returns the current sunrise/sunset times.",
    pathTemplate: "GET /gpapi/UpdateSun",
  });
  router.get("/UpdateSun", (_req: Request, res: Response) => {
    updateSunData();
    res.json(sunData);
  });

  return router;
};
