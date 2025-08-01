/**
 * @module hitCounter
 *
 * **This module is responsible for tracking, aggregating, and migrating hit data
 * from an SQL database into a PocketBase collection. It also provides an
 * in-memory cache to prevent duplicate hit recordings from the same IP address
 * within a 10-minute window, and it aggregates hit data into daily, weekly,
 * and monthly summaries.**
 *
 * ## Main Responsibilities
 *
 * 1. **Recent Hit Caching**
 *    - Maintains an in-memory cache (`recentHits`) of hit records from the last
 *      10 minutes to prevent duplicate hits from the same IP within that window.
 *    - The `initRecentHits` routine (invoked at startup) initializes this cache
 *      by scanning the PocketBase `"hitCounter"` collection for records in the
 *      last 10 minutes.
 *
 * 2. **Hit Recording**
 *    - The `hit` function extracts the caller’s IP from the Express request,
 *      checks the in-memory cache to determine if a hit from that IP has been
 *      recorded in the last 10 minutes, and if not, records the hit in the
 *      PocketBase `"hitCounter"` collection.
 *
 * 3. **SQL-PocketBase Migration**
 *    - The `sqlToPbHitCounter` routine queries the SQL database (using a
 *      baseline SQL datetime derived from the most recent PocketBase record)
 *      for new hit records, processes them (corrects timestamps, removes
 *      duplicate consecutive IPs/times), and migrates them into the PocketBase
 *      `"hitCounter"` collection.
 *
 * 4. **Aggregation**
 *    - The `updateAggregationRecord` function aggregates hit data into daily,
 *      weekly, and monthly buckets. It:
 *      - Loads an existing aggregation record from the PocketBase `"status"`
 *        collection.
 *      - Calculates boundaries for today, the current week, and the current
 *        month (using the `America/Los_Angeles` timezone).
 *      - Fills in any missing monthly or weekly aggregates that occur after
 *        the latest already recorded period (or, if none exist, starts from
 *        the oldest hit record).
 *      - For daily aggregates, aggregates missing data for days older than
 *        yesterday only if they don’t exist, and always updates today's entry.
 *
 * 5. **Express Routes & Cron Job**
 *    - The `hitRoutes` function creates an Express router with endpoints
 *      (e.g., `"/recreateSiteHits"`, `"/hitsReport"`) that can be used to test
 *      hit migration, aggregation routines, and reporting.
 *    - A cron job (using `node-cron`) runs every 10 minutes to trigger the
 *      `sqlToPbHitCounter` and `updateAggregationRecord` routines automatically.
 *
 * ## Dependencies
 * - `MySQL2`: For SQL database connectivity via `connection` (in `SqlConnect.js`).
 * - `Express`: For handling HTTP requests.
 * - `PocketBase (pb)`: For interacting with PocketBase backend.
 * - `Luxon`: For robust date/time handling and timezone management.
 * - `node-cron`: For scheduling periodic tasks.
 *
 * ## Usage
 * - At server startup, call `initRecentHits()` to populate the in-memory cache.
 * - Use the `hit` function whenever a user action (e.g., loading images) occurs.
 * - Mount the router returned by `hitRoutes()` on your Express app to enable
 *   testing endpoints (`/recreateSiteHits`, `/hitsReport`).
 * - Cron job runs automatically every 10 minutes, ensuring hit aggregation is up to date.
 */

import express, { Request, Response, Router } from "express";
import { pb } from "pb";
import { ToId } from "miscellaneous";
import { __logDir, logStr, writeLog, log } from "log";
import { DateTime } from "luxon";
import path from "path";

// Determine the log file path.
const __LogFile = path.join(__logDir, "gliderport.log");
//
// Load and validate the existing siteHits status record from PocketBase.
//

/**
 * Represents the PocketBase record for site-wide hit aggregates.
 */
const siteHitsRecord = await pb.collection("status").getOne(ToId("sitehits"));

if (!siteHitsRecord.record) {
  console.error("No siteHits record found in PocketBase. Please create it first.");
  throw new Error("Missing siteHits record");
}
const siteHits: any = siteHitsRecord.record;

if (!siteHits.months) throw new Error("Missing siteHits.months");
if (!siteHits.weeks) throw new Error("Missing siteHits.weeks");
if (!siteHits.days) throw new Error("Missing siteHits.days");

/**
 * The DateTime for the next month boundary (in America/Los_Angeles).
 */
let nextMonth = DateTime.fromMillis(siteHits.months.start, {
  zone: "America/Los_Angeles",
}).plus({ months: siteHits.months.total.length + 1 });

/**
 * The DateTime for the next week boundary (in America/Los_Angeles).
 */
let nextWeek = DateTime.fromMillis(siteHits.weeks.start, {
  zone: "America/Los_Angeles",
}).plus({ days: 7 * (siteHits.weeks.total.length + 1) });

/**
 * The DateTime for the next day boundary (in America/Los_Angeles).
 */
let nextDay = DateTime.fromMillis(siteHits.days.start, {
  zone: "America/Los_Angeles",
}).plus({ days: siteHits.days.total.length + 1 });

/**
 * Aggregates hits for the current day, updates `siteHits.days`, and advances `nextDay`.
 *
 * - Queries PocketBase `"hitCounter"` for records with `id` >= `nextDay - 1 day`.
 * - Counts total hits and unique IPs between `nextDay - 1 day` and `nextDay`.
 * - Pushes counts into `siteHits.days.total` and `siteHits.days.unique`.
 * - Updates `siteHits.timestamp` and saves changes back to PocketBase.
 * - Advances `nextDay` by 1 day, recalculating sunrise/sunset if needed.
 *
 * @throws If PocketBase queries or updates fail.
 */
const updateDay = async (): Promise<void> => {
  // Query hits from the previous day boundary up to nextDay boundary
  const hits = await pb.collection("hitCounter").getFullList({
    filter: `id >= "${ToId(nextDay.minus({ days: 1 }).toMillis().toString())}"`,
  });
  let count = hits.length;
  let unique = 0;
  let index = 0;
  const uniqueIPs = new Set<string>();

  while (index < hits.length && parseInt(hits[index].id, 10) < nextDay.toMillis()) {
    const ip = hits[index].ip as string;
    if (!uniqueIPs.has(ip)) unique++;
    uniqueIPs.add(ip);
    index++;
  }

  siteHits.days.total.push(count);
  siteHits.days.unique.push(unique);
  siteHits.timestamp = Date.now();
  nextDay = nextDay.plus({ days: 1 });
  await pb.collection("status").update(ToId("sitehits"), { record: siteHits });
};

/**
 * Aggregates hits for the current week, updates `siteHits.weeks`, and advances `nextWeek`.
 *
 * - Queries PocketBase `"hitCounter"` for records with `id` >= `nextWeek - 7 days`.
 * - Counts total hits and unique IPs between those boundaries.
 * - Pushes counts into `siteHits.weeks.total` and `siteHits.weeks.unique`.
 * - Updates `siteHits.timestamp` and saves changes back to PocketBase.
 * - Advances `nextWeek` by 7 days.
 *
 * @throws If PocketBase queries or updates fail.
 */
const updateWeek = async (): Promise<void> => {
  // Query hits from the previous week boundary up to nextWeek boundary
  const hits = await pb.collection("hitCounter").getFullList({
    filter: `id >= "${ToId(nextWeek.minus({ days: 7 }).toMillis().toString())}"`,
  });
  let count = hits.length;
  let unique = 0;
  let index = 0;
  const uniqueIPs = new Set<string>();

  while (index < hits.length && parseInt(hits[index].id, 10) < nextWeek.toMillis()) {
    const ip = hits[index].ip as string;
    if (!uniqueIPs.has(ip)) unique++;
    uniqueIPs.add(ip);
    index++;
  }

  siteHits.weeks.total.push(count);
  siteHits.weeks.unique.push(unique);
  siteHits.timestamp = Date.now();
  nextWeek = nextWeek.plus({ days: 7 });
  await pb.collection("status").update(ToId("sitehits"), { record: siteHits });
};

/**
 * Aggregates hits for the current month, updates `siteHits.months`, and advances `nextMonth`.
 *
 * - Queries PocketBase `"hitCounter"` for records with `id` >= `nextMonth - 1 month`.
 * - Counts total hits and unique IPs between those boundaries.
 * - Pushes counts into `siteHits.months.total` and `siteHits.months.unique`.
 * - Updates `siteHits.timestamp` and saves changes back to PocketBase.
 * - Advances `nextMonth` by 1 month.
 *
 * @throws If PocketBase queries or updates fail.
 */
const updateMonth = async (): Promise<void> => {
  // Query hits from the previous month boundary up to nextMonth boundary
  const hits = await pb.collection("hitCounter").getFullList({
    filter: `id >= "${ToId(nextMonth.minus({ months: 1 }).toMillis().toString())}"`,
  });
  let count = hits.length;
  let unique = 0;
  let index = 0;
  const uniqueIPs = new Set<string>();

  while (index < hits.length && parseInt(hits[index].id, 10) < nextMonth.toMillis()) {
    const ip = hits[index].ip as string;
    if (!uniqueIPs.has(ip)) unique++;
    uniqueIPs.add(ip);
    index++;
  }

  siteHits.months.total.push(count);
  siteHits.months.unique.push(unique);
  siteHits.timestamp = Date.now();
  nextMonth = nextMonth.plus({ months: 1 });
  await pb.collection("status").update(ToId("sitehits"), { record: siteHits });
};

/**
 * Recreates the entire `siteHits` record from the `"hitCounter"` collection.
 *
 * - Fetches all hitCounter records in batches (default 1000 per page).
 * - Finds the earliest record to determine `lastReset`.
 * - Builds fresh aggregation arrays for `months`, `weeks`, and `days`:
 *   - **Months**: Starting from the first full month after `lastReset`, counts total and unique IPs per month.
 *   - **Weeks**: Starting from the first week boundary after `lastReset`, counts total and unique IPs per week.
 *   - **Days**: Starting from the first day after `lastReset`, counts total and unique IPs per day.
 * - Updates and returns the rebuilt `siteHits` object.
 *
 * @returns {Promise<any>} The rebuilt `siteHits` record with new `lastReset`, `timestamp`, and aggregate arrays.
 * @throws If PocketBase queries fail.
 */
const recreateSiteHits = async (): Promise<any> => {
  const siteHits: any = {};
  const allRecords: any[] = [];
  let page = 1;
  const perPage = 1000;

  // Fetch all hitCounter records in pages
  while (true) {
    const batch = await pb.collection("hitCounter").getList(page, perPage);
    allRecords.push(...batch.items);
    if (batch.page >= batch.totalPages) break;
    if (page % 10 === 0)
      console.log(`Fetched page ${page} of hitCounter records.`, allRecords.length, "records so far.");
    page++;
  }

  console.log(`Recreating siteHits with ${allRecords.length} records from hitCounter.`);

  // Determine lastReset as the timestamp of the first record
  siteHits.lastReset = parseInt(allRecords[0].id);
  console.log(`Last reset timestamp: ${siteHits.lastReset}`);

  // Initialize structure
  siteHits.timestamp = Date.now();
  siteHits.weeks = { start: 0, total: [], unique: [] };
  siteHits.months = { start: 0, total: [], unique: [] };
  siteHits.days = { start: 0, total: [], unique: [] };

  // ****************** MONTHS ******************
  let monthStart = DateTime.fromMillis(siteHits.lastReset, { zone: "America/Los_Angeles" })
    .plus({ days: 10 })
    .startOf("month");
  siteHits.months.start = monthStart.toMillis();

  let index = allRecords.findIndex((record: any) => parseInt(record.id, 10) >= monthStart.toMillis());
  let monthEnd = monthStart.plus({ months: 1 }).toMillis();

  while (index < allRecords.length) {
    let count = 0;
    let unique = 0;
    const uniqueIPs = new Set<string>();

    while (index < allRecords.length && parseInt(allRecords[index].id, 10) < monthEnd) {
      count++;
      const ip = allRecords[index].ip as string;
      if (!uniqueIPs.has(ip)) unique++;
      uniqueIPs.add(ip);
      index++;
      if (index >= allRecords.length) break;
    }

    siteHits.months.total.push(count);
    siteHits.months.unique.push(unique);

    monthStart = monthStart.plus({ months: 1 });
    monthEnd = monthStart.plus({ months: 1 }).toMillis();
  }

  // ****************** WEEKS ******************
  let weekStart = DateTime.fromMillis(siteHits.lastReset, { zone: "America/Los_Angeles" })
    .plus({
      days: (5 - DateTime.fromMillis(siteHits.lastReset, { zone: "America/Los_Angeles" }).weekday + 7) % 7,
    })
    .plus({ days: 7 })
    .startOf("day");
  siteHits.weeks.start = weekStart.toMillis();

  index = allRecords.findIndex((record: any) => parseInt(record.id, 10) >= weekStart.toMillis());
  let weekEnd = weekStart.plus({ days: 7 }).toMillis();

  while (index < allRecords.length) {
    let count = 0;
    let unique = 0;
    const uniqueIPs = new Set<string>();

    while (index < allRecords.length && parseInt(allRecords[index].id, 10) < weekEnd) {
      count++;
      const ip = allRecords[index].ip as string;
      if (!uniqueIPs.has(ip)) unique++;
      uniqueIPs.add(ip);
      index++;
      if (index >= allRecords.length) break;
    }

    siteHits.weeks.total.push(count);
    siteHits.weeks.unique.push(unique);

    weekStart = weekStart.plus({ days: 7 });
    weekEnd = weekStart.plus({ days: 7 }).toMillis();
  }

  // ****************** DAYS ******************
  let dayStart = DateTime.fromMillis(siteHits.lastReset + 24 * 3600 * 1000, {
    zone: "America/Los_Angeles",
  }).startOf("day");
  siteHits.days.start = dayStart.toMillis();

  index = allRecords.findIndex((record: any) => parseInt(record.id, 10) >= dayStart.toMillis());
  let dayEnd = dayStart.plus({ days: 1 }).toMillis();

  while (index < allRecords.length) {
    let count = 0;
    let unique = 0;
    const uniqueIPs = new Set<string>();

    while (index < allRecords.length && parseInt(allRecords[index].id, 10) < dayEnd) {
      count++;
      const ip = allRecords[index].ip as string;
      if (!uniqueIPs.has(ip)) unique++;
      uniqueIPs.add(ip);
      index++;
      if (index >= allRecords.length) break;
    }

    siteHits.days.total.push(count);
    siteHits.days.unique.push(unique);

    dayStart = dayStart.plus({ days: 1 });
    dayEnd = dayStart.plus({ days: 1 }).toMillis();
  }

  await pb.collection("status").update(ToId("sitehits"), { record: siteHits });
  return siteHits;
};

/**
 * Records a hit from the request’s IP address.
 *
 * - Extracts caller’s IP (considering `x-forwarded-for` if behind a proxy).
 * - Checks PocketBase `"hitCounter"` for any record from that IP in the last 10 minutes.
 *   If found, logs and returns a duplicate-hit message.
 * - Otherwise, creates a new `hitCounter` record with `id = ToId(now)`.
 * - If `now` exceeds `nextDay`, `nextWeek`, or `nextMonth` boundaries, calls
 *   `updateDay()`, `updateWeek()`, or `updateMonth()` respectively.
 * - Logs the insertion and returns a success message.
 *
 * @param req - Express request (used to extract IP).
 * @returns A promise resolving to an object indicating success or duplicate.
 */
let lastReport = Date.now();
let recentHits = 0;
let duplicateHits = 0;

export const hit = async (req: Request): Promise<{ message?: string; error?: string }> => {
  //   const log: string[] = [""];
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress) || "unknown";
  const now = Date.now();
  const tenMinutesAgo = Date.now() - 10 * 60000;

  const records = await pb.collection("hitCounter").getFullList({
    filter: `id >= "${ToId(tenMinutesAgo.toString())}" && ip = "${ip}"`,
  });

  if (records.length > 0) {
    // log("hit", `Duplicate hit from IP ${ip} within last 10 minutes.`);
    duplicateHits++;
    return { message: "Duplicate hit within 10 minutes" };
  }

  // Create a new hitCounter record
  const id = ToId(now.toString());
  try {
    await pb.collection("hitCounter").create({ id, ip });
    if (now > nextDay.toMillis()) await updateDay();
    if (now > nextWeek.toMillis()) await updateWeek();
    if (now > nextMonth.toMillis()) await updateMonth();
    recentHits++;
    if (Date.now() - lastReport > 15 * 60 * 1000) {
      if (recentHits > 0) {
        log(__LogFile, `Recorded ${recentHits} hits and ${recentHits} duplicate hits in the past 15 minutes.`);
        recentHits = 0;
        duplicateHits = 0;
      }
      lastReport = Date.now();
    }

    return { message: "Hit recorded" };
  } catch (error: any) {
    log(__LogFile, "Error creating hitCounter record:", error);
    return { error: "Error recording hit" };
  }
};

/**
 * Generates a summary report of the current `siteHits` status.
 *
 * - Calculates human-readable first/last dates for months, weeks, and days.
 * - Logs the number of periods and the first/last dates for each granularity.
 * - Returns an object containing:
 *   - `months.count`, `months.first`, `months.last`
 *   - `weeks.count`, `weeks.first`, `weeks.last`
 *   - `days.count`, `days.first`, `days.last`
 *   - `log`: The array of log strings generated.
 *
 * @returns A promise resolving to an object containing aggregation counts and logs.
 */
const report = async (): Promise<any> => {
  const month = DateTime.fromMillis(siteHits.months.start, { zone: "America/Los_Angeles" });
  const week = DateTime.fromMillis(siteHits.weeks.start, { zone: "America/Los_Angeles" });
  const day = DateTime.fromMillis(siteHits.days.start, { zone: "America/Los_Angeles" });

  const res: any = {};
  res.months = {
    count: siteHits.months.total.length,
    first: month.toLocaleString(DateTime.DATE_SHORT),
    last: month.plus({ months: siteHits.months.total.length - 1 }).toLocaleString(DateTime.DATE_SHORT),
  };
  res.weeks = {
    count: siteHits.weeks.total.length,
    first: week.toLocaleString(DateTime.DATE_SHORT),
    last: week.plus({ days: 7 * (siteHits.weeks.total.length - 1) }).toLocaleString(DateTime.DATE_SHORT),
  };
  res.days = {
    count: siteHits.days.total.length,
    first: day.toLocaleString(DateTime.DATE_SHORT),
    last: day.plus({ days: siteHits.days.total.length - 1 }).toLocaleString(DateTime.DATE_SHORT),
  };

  const log: string[] = [""];
  logStr(log, "hitsReport", `Number of months: ${res.months.count}`);
  logStr(log, "hitsReport", `First recorded month: ${res.months.first}`);
  logStr(log, "hitsReport", `Last recorded month: ${res.months.last}`);

  logStr(log, "hitsReport", `Number of weeks: ${res.weeks.count}`);
  logStr(log, "hitsReport", `First recorded week: ${res.weeks.first}`);
  logStr(log, "hitsReport", `Last recorded week: ${res.weeks.last}`);

  logStr(log, "hitsReport", `Number of days: ${res.days.count}`);
  logStr(log, "hitsReport", `First recorded day: ${res.days.first}`);
  logStr(log, "hitsReport", `Last recorded day: ${res.days.last}`);

  logStr(
    log,
    "hitsReport",
    `Last Reset: ${new Date(siteHits.lastReset).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })}`
  );
  logStr(
    log,
    "hitsReport",
    `Current Timestamp: ${new Date(siteHits.timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })}`
  );
  writeLog(__LogFile, log);

  res.log = log;
  return res;
};

/**
 * Creates an Express router for handling hit counter aggregation and reporting.
 *
 * @returns A new Express `Router` that exposes:
 *   GET /recreateSiteHits → rebuilds the `siteHits` record from all "hitCounter" records.
 *   GET /hitsReport → returns the current aggregation summary (month/week/day counts and dates).
 *
 * Mount this on your app or a sub-route to provide hit counter endpoints.
 *
 * @returns A `Router` with the routes `/recreateSiteHits` and `/hitsReport`.
 */
export const hitRoutes = (): Router => {
  const router = express.Router();

  /**
   * GET /recreateSiteHits
   *
   * Manually triggers `recreateSiteHits()` to rebuild the entire `siteHits` record.
   *
   * @route GET /recreateSiteHits
   * @returns {Promise<void>} JSON of the new `siteHits` record or error status 500.
   */
  router.get("/recreateSiteHits", async (_req: Request, res: Response) => {
    try {
      const newSiteHits = await recreateSiteHits();
      res.status(200).json(newSiteHits);
    } catch (error) {
      console.error("Failed to recreate siteHits:", error);
      res.status(500).json({ error: "Unable to recreate siteHits" });
    }
  });

  /**
   * GET /hitsReport
   *
   * Returns a summary of the current hit aggregates (monthly, weekly, daily) along
   * with the associated logs.
   *
   * @route GET /hitsReport
   * @returns {Promise<void>} JSON containing counts, first/last dates, and logs.
   */
  router.get("/hitsReport", async (_req: Request, res: Response) => {
    try {
      const reportData = await report();
      res.status(200).json(reportData);
    } catch (error) {
      console.error("Failed to generate hits report:", error);
      res.status(500).json({ error: "Unable to generate hits report" });
    }
  });

  return router;
};
