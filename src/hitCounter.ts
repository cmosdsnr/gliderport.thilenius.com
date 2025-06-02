/**
 *
 * **This module is responsible for tracking, aggregating, and migrating hit data
 * from an SQL database into a PocketBase collection. It also provides an
 * in-memory cache to prevent duplicate hit recordings from the same IP address
 * within a 10-minute window, and it aggregates hit data into daily, weekly,
 * and monthly summaries.**
 *
 * Main Responsibilities:
 * ------------------------
 * 1. **Recent Hit Caching:**
 *    - Maintains an in-memory cache (`recentHits`) of hit records from the last
 *      10 minutes. This is used to prevent recording duplicate hits from the same
 *      IP within the 10-minute window.
 *    - The `initRecentHits` routine initializes this cache by scanning the
 *      PocketBase "hitCounter" collection for records in the last 10 minutes.
 *
 * 2. **Hit Recording:**
 *    - The `hit` function extracts the caller’s IP from the Express request,
 *      checks the in-memory cache to determine if a hit from that IP has been
 *      recorded in the last 10 minutes, and if not, records the hit in the
 *      PocketBase "hitCounter" collection.
 *
 * 3. **SQL-PocketBase Migration:**
 *    - The `sqlToPbHitCounter` routine queries the SQL database (using a
 *      baseline SQL datetime derived from the most recent PocketBase record)
 *      for new hit records, processes them (corrects timestamps, removes duplicate
 *      consecutive IPs/times), and migrates them into the PocketBase "hitCounter"
 *      collection.
 *
 * 4. **Aggregation:**
 *    - The `updateAggregationRecord` function aggregates hit data into daily,
 *      weekly, and monthly buckets. It:
 *         - Loads an existing aggregation record from the PocketBase "status"
 *           collection.
 *         - Calculates boundaries for today, the current week, and the current
 *           month (using the America/Los_Angeles timezone).
 *         - Fills in any missing monthly or weekly aggregates that occur after
 *           the latest already recorded period (or, if none exist, starts from
 *           the oldest hit record).
 *         - For daily aggregates, aggregates missing data for days older than
 *           yesterday only if they don’t exist, and always updates today's entry.
 *
 * 5. **Express Routes & Cron Job:**
 *    - The `hitRoutes` function creates an Express router with an endpoint
 *      ("/HandleHits") that can be used for testing the hit migration and aggregation
 *      routines.
 *    - A cron job is scheduled (using node-cron) to run every 10 minutes, which
 *      triggers the `sqlToPbHitCounter` and `updateAggregationRecord` routines.
 *
 * Dependencies:
 * -------------
 * - **MySQL2:** For SQL database connectivity.
 * - **Express:** For handling HTTP requests.
 * - **PocketBase (pb):** For interacting with the PocketBase backend.
 * - **Luxon:** For robust date/time handling and timezone management.
 * - **node-cron:** For scheduling periodic tasks.
 *
 * Usage:
 * ------
 * - The module is initialized at server startup by calling `initRecentHits()`.
 * - The `hit` function is invoked whenever a user action (e.g., loading images)
 *   triggers a hit.
 * - The Express router returned by `hitRoutes()` can be mounted in the main
 *   application to provide testing endpoints.
 * - The cron job runs automatically every 10 minutes to ensure that the hit
 *   aggregation records are kept up to date.
 *
 * @module hitCounter
 */

import express, { Request, Response } from "express";
import { pb } from "pb.js";
import { ToId } from "miscellaneous.js";
import { DateTime } from "luxon";
import { logStr, writeLog } from "log.js";

const siteHitsRecord = await pb.collection("status").getOne(ToId("sitehits"));

if (!siteHitsRecord.record) {
  console.error("No siteHits record found in PocketBase. Please create it first.");
  throw new Error("Missing siteHits record");
}
const siteHits: any = siteHitsRecord.record;
console.log("siteHits record loaded from PocketBase:", siteHits);
if (!siteHits.months) throw new Error("Missing siteHits.months");
if (!siteHits.weeks) throw new Error("Missing siteHits.weeks");
if (!siteHits.days) throw new Error("Missing siteHits.days");

let nextMonth = DateTime.fromMillis(siteHits.months.start, { zone: "America/Los_Angeles" }).plus({
  months: siteHits.months.total.length + 1,
});

let nextWeek = DateTime.fromMillis(siteHits.weeks.start, { zone: "America/Los_Angeles" }).plus({
  days: 7 * (siteHits.weeks.total.length + 1),
});

let nextDay = DateTime.fromMillis(siteHits.days.start, { zone: "America/Los_Angeles" }).plus({
  days: siteHits.days.total.length + 1,
});

const updateDay = async () => {
  const hits = await pb
    .collection("hitCounter")
    .getFullList({ filter: `id >= "${ToId(nextDay.minus({ days: 1 }).toMillis().toString())}"` });
  let count = hits.length;
  let unique = 0;
  let index = 0;
  const uniqueIPs = new Set();
  while (parseInt(hits[index].id, 10) < nextDay.toMillis()) {
    if (!uniqueIPs.has(hits[index].ip)) unique++;
    uniqueIPs.add(hits[index].ip);
    index++;
  }
  siteHits.days.total.push(count);
  siteHits.days.unique.push(unique);
  siteHits.timestamp = Date.now();
  nextDay = nextDay.plus({ days: 1 });
  pb.collection("status").update(ToId("sitehits"), { record: siteHits });
};

const updateWeek = async () => {
  const hits = await pb
    .collection("hitCounter")
    .getFullList({ filter: `id >= "${ToId(nextWeek.minus({ days: 7 }).toMillis().toString())}"` });
  let count = hits.length;
  let unique = 0;
  let index = 0;
  const uniqueIPs = new Set();
  while (parseInt(hits[index].id, 10) < nextWeek.toMillis()) {
    if (!uniqueIPs.has(hits[index].ip)) unique++;
    uniqueIPs.add(hits[index].ip);
    index++;
  }
  siteHits.weeks.total.push(count);
  siteHits.weeks.unique.push(unique);
  siteHits.timestamp = Date.now();
  nextWeek = nextWeek.plus({ days: 7 });
  pb.collection("status").update(ToId("sitehits"), { record: siteHits });
};

const updateMonth = async () => {
  const hits = await pb
    .collection("hitCounter")
    .getFullList({ filter: `id >= "${ToId(nextMonth.minus({ months: 1 }).toMillis().toString())}"` });
  let count = hits.length;
  let unique = 0;
  let index = 0;
  const uniqueIPs = new Set();
  while (parseInt(hits[index].id, 10) < nextMonth.toMillis()) {
    if (!uniqueIPs.has(hits[index].ip)) unique++;
    uniqueIPs.add(hits[index].ip);
    index++;
  }
  siteHits.months.total.push(count);
  siteHits.months.unique.push(unique);
  siteHits.timestamp = Date.now();
  nextWeek = nextMonth.plus({ months: 1 });
  pb.collection("status").update(ToId("sitehits"), { record: siteHits });
};

const recreateSiteHits = async () => {
  const siteHits: any = {};
  const allRecords = [];
  let page = 1;
  const perPage = 1000; // Adjust based on your needs

  while (true) {
    const batch = await pb.collection("hitCounter").getList(page, perPage);
    allRecords.push(...batch.items);

    if (batch.page >= batch.totalPages) {
      break;
    }
    if (page % 10 == 0)
      console.log(`Fetched page ${page} of hitCounter records.`, allRecords.length, "records so far.");
    page++;
  }
  console.log(`Recreating siteHits with ${allRecords.length} records from hitCounter.`);
  siteHits.lastReset = parseInt(allRecords[0].id);
  console.log(`Last reset timestamp: ${siteHits.lastReset}`);

  siteHits.timestamp = Date.now();
  siteHits.weeks = { start: 0, total: [], unique: [] };
  siteHits.months = { start: 0, total: [], unique: [] };
  siteHits.days = { start: 0, total: [], unique: [] };

  // ****************** MONTHS ******************
  let monthStart = DateTime.fromMillis(siteHits.lastReset, { zone: "America/Los_Angeles" })
    .plus({ days: 10 })
    .startOf("month");
  siteHits.months.start = monthStart.toMillis();
  // find first index of allRecords where the timestamp is greater than or equal to monthStart
  let index = allRecords.findIndex((record: any) => parseInt(record.id, 10) >= monthStart.toMillis());
  let monthEnd = monthStart.plus({ months: 1 }).toMillis();
  while (1) {
    let count = 0;
    let unique = 0;
    const uniqueIPs = new Set();
    while (parseInt(allRecords[index].id, 10) < monthEnd) {
      count++;
      if (!uniqueIPs.has(allRecords[index].ip)) unique++;
      uniqueIPs.add(allRecords[index].ip);

      index++;
      if (index >= allRecords.length) {
        console.log("No more records found for monthStart.");
        break;
      }
    }
    if (index >= allRecords.length) {
      console.log("No more records found");
      break;
    }
    siteHits.months.total.push(count);
    siteHits.months.unique.push(unique);
    monthStart = monthStart.plus({ months: 1 });
    monthEnd = monthStart.plus({ months: 1 }).toMillis();
  }

  // ****************** WEEKS ******************
  let weekStart = DateTime.fromMillis(siteHits.lastReset, { zone: "America/Los_Angeles" })
    .plus({ days: (5 - DateTime.fromMillis(siteHits.lastReset, { zone: "America/Los_Angeles" }).weekday + 7) % 7 })
    .plus({ days: 7 })
    .startOf("day");
  siteHits.weeks.start = weekStart.toMillis();
  // find first index of allRecords where the timestamp is greater than or equal to weekStart
  index = allRecords.findIndex((record: any) => parseInt(record.id, 10) >= weekStart.toMillis());
  let weekEnd = weekStart.plus({ days: 7 }).toMillis();

  while (1) {
    let count = 0;
    let unique = 0;
    const uniqueIPs = new Set();
    while (parseInt(allRecords[index].id, 10) < weekEnd) {
      count++;
      if (!uniqueIPs.has(allRecords[index].ip)) unique++;
      uniqueIPs.add(allRecords[index].ip);

      index++;
      if (index >= allRecords.length) {
        console.log("No more records found for weekStart.");
        break;
      }
    }
    if (index >= allRecords.length) {
      console.log("No more records found");
      break;
    }
    siteHits.weeks.total.push(count);
    siteHits.weeks.unique.push(unique);
    weekStart = weekStart.plus({ days: 7 });
    weekEnd = weekStart.plus({ days: 7 }).toMillis();
  }

  // ****************** DAYS ******************
  let dayStart = DateTime.fromMillis(siteHits.lastReset + 24 * 3600 * 1000, { zone: "America/Los_Angeles" }).startOf(
    "day"
  );
  siteHits.days.start = dayStart.toMillis();
  // find first index of allRecords where the timestamp is greater than or equal to dayStart
  index = allRecords.findIndex((record: any) => parseInt(record.id, 10) >= dayStart.toMillis());
  let dayEnd = dayStart.plus({ days: 1 }).toMillis();

  while (1) {
    let count = 0;
    let unique = 0;
    const uniqueIPs = new Set();
    while (parseInt(allRecords[index].id, 10) < dayEnd) {
      count++;
      if (!uniqueIPs.has(allRecords[index].ip)) unique++;
      uniqueIPs.add(allRecords[index].ip);

      index++;
      if (index >= allRecords.length) {
        console.log("No more records found for dayStart.");
        break;
      }
    }
    if (index >= allRecords.length) {
      console.log("No more records found");
      break;
    }
    siteHits.days.total.push(count);
    siteHits.days.unique.push(unique);
    dayStart = dayStart.plus({ days: 1 });
    dayEnd = dayStart.plus({ days: 1 }).toMillis();
  }

  pb.collection("status").update(ToId("sitehits"), { record: siteHits });
  return siteHits;
};

// currently called when a user loads 5 images from the server in ImageFiles.ts
export const hit = async (req: Request) => {
  const log: string[] = [""];
  // Get the caller's IP address.
  // If behind a proxy, x-forwarded-for may contain multiple addresses,
  // so you might want to split it and take the first one.
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress) || "unknown";
  const now = Date.now();
  const tenMinutesAgo = new Date(now - 10 * 60000).toISOString();

  const records = await pb.collection("hitCounter").getFullList({
    filter: `created >= "${tenMinutesAgo}" && ip = "${ip}"`,
  });
  if (records.length > 0) {
    logStr(log, "hit", `Duplicate hit from IP ${ip} within last 10 minutes.`);
    writeLog(log);
    return { message: "Duplicate hit within 10 minutes" };
  }

  // Generate an id using the current time.
  const id = ToId(now.toString());

  try {
    // Create the hitCounter record.
    await pb.collection("hitCounter").create({ id, ip });
    if (now > nextDay.toMillis()) await updateDay();
    if (now > nextWeek.toMillis()) await updateWeek();
    if (now > nextMonth.toMillis()) await updateMonth();
    // Add the hit to the in-memory cache.
    logStr(log, "hit", `Recorded hit from IP ${ip}`);
    writeLog(log);
    return { message: "Hit recorded" };
  } catch (error: any) {
    logStr(log, "hit", "Error creating hitCounter record:", error);
    writeLog(log);
    return { error: "Error recording hit" };
  }
};

const report = async () => {
  const log: string[] = [""];

  let month = DateTime.fromMillis(siteHits.months.start, { zone: "America/Los_Angeles" });
  
  let lastMonth = month.plus({ months: siteHits.months.total.length - 1 });
  logStr(log, "hitsReport", `Number of months ${siteHits.months.total.length}`);
  logStr(log, "hitsReport", `Last recorded month starts at ${month.toLocaleString(DateTime.DATE_SHORT)}`);
  logStr(log, "hitsReport", `Next month starts at ${lastMonth..toLocaleString(DateTime.DATE_SHORT)}`);

  let week = DateTime.fromMillis(siteHits.weeks.start, { zone: "America/Los_Angeles" });
  let lastWeek = week.plus({ days: 7 * (siteHits.weeks.total.length - 1) });
  logStr(log, "hitsReport", `Number of weeks ${siteHits.weeks.total.length}`);
  logStr(log, "hitsReport", `Last recorded week starts at ${week.toLocaleString(DateTime.DATE_SHORT)}`);
  logStr(log, "hitsReport", `Next week starts at ${lastWeek.toLocaleString(DateTime.DATE_SHORT)}`);

  let day = DateTime.fromMillis(siteHits.days.start, { zone: "America/Los_Angeles" });
  let lastDay = day.plus({ days: siteHits.days.total.length - 1 });
  logStr(log, "hitsReport", `Number of days ${siteHits.days.total.length}`);
  logStr(log, "hitsReport", `Last recorded day starts at ${day.toLocaleString(DateTime.DATE_SHORT)}`);
  logStr(log, "hitsReport", `Next day starts at ${lastDay.toLocaleString(DateTime.DATE_SHORT)}`);

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
  writeLog(log);
  return log;
};
/**
 * Creates an Express router for handling hit counter aggregation.
 *
 * This router exposes a single endpoint:
 * - GET /HandleHits: For testing purposes, this endpoint triggers the process of updating
 *   the hit counter aggregation by calling `sqlToPbHitCounter` and `updateAggregationRecord`.
 *   It logs the update time and returns a JSON response indicating the aggregation has been updated.
 *
 * @returns {import("express").Router} An Express router with the hit counter endpoint.
 */
export const hitRoutes = () => {
  const router = express.Router();

  router.get("/recreateSiteHits", async (req: Request, res: Response) => {
    const siteHits = await recreateSiteHits();
    res.json(siteHits);
  });

  router.get("/hitsReport", async (req: Request, res: Response) => {
    const log = await report();
    res.json(log);
  });

  return router;
};
