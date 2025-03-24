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
import { connection } from "./SqlConnect.js";
import { DateTime } from "luxon";
import cron from "node-cron";
import { logStr, writeLog } from "log.js";

// Define the time window (10 minutes in milliseconds)
const RECENT_HIT_WINDOW = 10 * 60 * 1000; // 600,000 ms

// In-memory array to hold recent hit records
// Each entry is an object: { ip: string, timestamp: number }
const recentHits: any[] = [];

/**
 * Initializes the recentHits cache by scanning the hitCounter collection for records
 * within the last 10 minutes.
 */
async function initRecentHits() {
  const log: string[] = [""];
  const now = Date.now();
  const cutoff = now - RECENT_HIT_WINDOW;
  // Convert cutoff to the id format (assuming ToId produces a lexicographically ordered string)
  const cutoffId = ToId(cutoff.toString());

  try {
    // Query PocketBase for hitCounter records with id >= cutoffId.
    const records = await pb.collection("hitCounter").getFullList({ filter: `id >= "${cutoffId}"` });

    // Clear any existing entries
    recentHits.length = 0;
    // Populate recentHits with the ip and timestamp (parsed from id)
    records.forEach((record: any) => {
      const ts = parseInt(record.id, 10);
      recentHits.push({ ip: record.ip, timestamp: ts });
    });
    // Sort the array by timestamp in ascending order.
    recentHits.sort((a, b) => a.timestamp - b.timestamp);
    logStr(log, "initRecentHits", `Initialized recentHits with ${recentHits.length} records from the last 10 minutes.`);
  } catch (error) {
    logStr(log, "initRecentHits", "Error initializing recentHits:", error);
  }
  writeLog(log);
}
initRecentHits();

// currently called when a user loads 5 images from the server in ImageFiles.ts
export const hit = async (req: Request) => {
  const log: string[] = [""];
  // Get the caller's IP address.
  // If behind a proxy, x-forwarded-for may contain multiple addresses,
  // so you might want to split it and take the first one.
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket.remoteAddress) || "unknown";

  const now = Date.now();

  // Remove records older than 10 minutes.
  while (recentHits.length > 0 && now - recentHits[0].timestamp > RECENT_HIT_WINDOW) {
    recentHits.shift();
  }

  // Check if this IP is already in the last 10 minutes.
  const duplicateHit = recentHits.some((hitRecord) => hitRecord.ip === ip);
  if (duplicateHit) {
    logStr(log, "hit", `Duplicate hit from IP ${ip} within last 10 minutes.`);
    writeLog(log);
    return { message: "Duplicate hit within 10 minutes" };
  }

  // Generate an id using the current time.
  const id = ToId(now.toString());

  try {
    // Create the hitCounter record.
    await pb.collection("hitCounter").create({ id, ip });
    // Add the hit to the in-memory cache.
    recentHits.push({ ip, timestamp: now });
    logStr(log, "hit", `Recorded hit from IP ${ip}`);
    writeLog(log);
    return { message: "Hit recorded" };
  } catch (error: any) {
    logStr(log, "hit", "Error creating hitCounter record:", error);
    writeLog(log);
    return { error: "Error recording hit" };
  }
};

// Helper: Convert a timestamp (ms) to a SQL datetime string in UTC (format: "YYYY-MM-DD HH:mm:ss")
const toSQLDateString = (timestamp: number) => {
  return DateTime.fromMillis(timestamp, { zone: "utc" }).toFormat("yyyy-MM-dd HH:mm:ss");
};

// Get the most recent hitCounter record from PocketBase and return a SQL datetime string for filtering.
const getBaselineSQLDate = async () => {
  const log: string[] = [""];
  try {
    const list = await pb.collection("hitCounter").getList(1, 1, { sort: "-id" });
    if (list.items.length > 0) {
      const mostRecentRecord = list.items[0];
      // The id is generated from the corrected timestamp.
      const correctedTime = parseInt(mostRecentRecord.id, 10);
      // Reconstruct the LA DateTime using the corrected time.
      const dtLA = DateTime.fromMillis(correctedTime, { zone: "America/Los_Angeles" });
      // To get the original SQL time, subtract the LA offset (in ms).
      const offsetMillis = dtLA.offset * 60 * 1000;
      const originalSQLTimestamp = correctedTime - offsetMillis;
      // Convert that timestamp to a SQL datetime string.
      return toSQLDateString(originalSQLTimestamp);
    }
  } catch (error) {
    logStr(log, "getBaselineSQLDate", "Error fetching baseline from PocketBase:", error);
  }
  writeLog(log);
};

// Helper: Adjust each record's hit date to the "corrected" timestamp.
// For each SQL record, we assume r.hit is a Date object.
// We interpret r.hit as LA local time and add the offset (in ms) to get the intended UTC timestamp.
const createCorrectedTimestamp = (results: any) => {
  for (const r of results) {
    const dt = DateTime.fromJSDate(r.hit, { zone: "America/Los_Angeles" });
    const offsetMillis = dt.offset * 60 * 1000;
    // Correct the timestamp by adding the offset.
    r.time = r.hit.getTime() + offsetMillis;
  }
};

// Helper: Remove duplicate consecutive records that have the same IP.
// This version builds a new array via filtering.
const removeConsecutiveIPs = (results: any) => {
  const log: string[] = [""];
  if (results.length === 0) return results;
  const filtered = [results[0]];
  for (let i = 1; i < results.length; i++) {
    if (results[i].IP !== results[i - 1].IP) {
      filtered.push(results[i]);
    }
  }
  logStr(log, "removeConsecutiveIPs", `Removed ${results.length - filtered.length} duplicate consecutive IP records`);
  writeLog(log);
  return filtered;
};

// Helper: Ensure that each record's 'time' property is strictly increasing.
// If a record's time is less than or equal to the previous record's time, adjust it.
const removeConsecutiveTimes = (results: any) => {
  const log: string[] = [""];
  let lastTime = 0;
  let renumberedCount = 0;
  for (const r of results) {
    if (r.time <= lastTime) {
      r.time = lastTime + 1;
      renumberedCount++;
    }
    lastTime = r.time;
  }
  logStr(log, "removeConsecutiveTimes", `Renumbered ${renumberedCount} duplicate time records`);
  writeLog(log);
};

// Main routine: Query SQL for records newer than the baseline (if available),
// process them, and create new records in PocketBase hitCounter.
const sqlToPbHitCounter = async () => {
  const log: string[] = [""];
  // First, try to get the baseline SQL datetime from PocketBase.
  const baselineSQL = await getBaselineSQLDate();
  let query;
  let params = [];
  if (baselineSQL) {
    query = "SELECT * FROM hit_counter WHERE hit > ? ORDER BY hit ASC";
    params.push(baselineSQL);
    logStr(log, "sqlToPbHitCounter", "Querying SQL records newer than:", baselineSQL);
  } else {
    query = "SELECT * FROM hit_counter ORDER BY hit ASC";
    logStr(log, "sqlToPbHitCounter", "No baseline found in PocketBase, querying entire SQL table.");
  }

  connection?.query(query, params, async (err, results: any) => {
    if (err) {
      logStr(log, "sqlToPbHitCounter", "Error querying hit_counter:", err);
      return;
    }
    if (Array.isArray(results)) {
      logStr(log, "sqlToPbHitCounter", `Found ${results.length} new records in SQL hit_counter`);
      if (results.length === 0) return;
      // Adjust timestamps to get corrected values.
      createCorrectedTimestamp(results);
      // Remove duplicate consecutive IP records.
      results = removeConsecutiveIPs(results);
      // Ensure 'time' values are strictly increasing.
      removeConsecutiveTimes(results);

      // Process results in batches.
      const chunkSize = 1000;
      for (let i = 0; i < results.length; i += chunkSize) {
        const chunk = results.slice(i, i + chunkSize);
        try {
          // Insert each record in parallel.
          await Promise.all(
            chunk.map(async (record: any) => {
              // Use the corrected time (as string) to generate the id.
              const id = ToId(record.time.toString());
              try {
                await pb.collection("hitCounter").create({
                  id,
                  ip: record.IP,
                });
              } catch (createError: any) {
                logStr(log, "sqlToPbHitCounter", `Error creating record with id ${id}:`, createError.message);
              }
            })
          );
          logStr(log, "sqlToPbHitCounter", `Batch ${Math.floor(i / chunkSize) + 1} processed.`);
        } catch (batchError) {
          logStr(log, "sqlToPbHitCounter", "Error processing batch:", batchError);
          return;
        }
      }
    }
  });
  writeLog(log);
};

/**
 * Updates an aggregation record by ensuring that missing month and week aggregates are
 * created from the oldest record up to the previous boundaries. For daily aggregates:
 * - For days older than yesterday, only aggregate if they don't exist.
 * - If the aggregation record’s timestamp is older than today’s start, aggregate yesterday.
 * - Always aggregate today.
 *
 * The aggregation record structure is expected to be:
 * {
 *   weeks: { [weekStartTimestamp]: { count: number, uniqueIPs: number } },
 *   months: { [monthStartTimestamp]: { count: number, uniqueIPs: number } },
 *   days: { [dayStartTimestamp]: { count: number, uniqueIPs: number } },
 *   timestamp: number
 * }
 *
 * @returns {Promise<void>}
 */
async function updateAggregationRecord() {
  const log: string[] = [""];
  // Load the existing aggregation record.
  const aggregationRec = await pb.collection("status").getOne(ToId("sitehits"));
  const aggregation = aggregationRec.record;

  // Use Luxon in the America/Los_Angeles timezone.
  const now = DateTime.now().setZone("America/Los_Angeles");

  // Calculate boundaries.
  const todayStart = now.startOf("day").toMillis();
  const tomorrowStart = now.plus({ days: 1 }).startOf("day").toMillis();
  // For weeks, assume week starts on Sunday.
  // (Luxon: weekday 1 (Monday) ... 7 (Sunday); subtract (weekday % 7) days so that Sunday is 0 days subtracted)
  const currentWeekStart = now
    .minus({ days: now.weekday % 7 })
    .startOf("day")
    .toMillis();
  const currentMonthStart = now.startOf("month").toMillis();

  // Calculate previous week and previous month boundaries.
  const previousWeekStart = DateTime.fromMillis(currentWeekStart, { zone: "America/Los_Angeles" })
    .minus({ days: 7 })
    .toMillis();
  const previousMonthStart = now.minus({ months: 1 }).startOf("month").toMillis();

  // Ensure aggregation object structure exists.
  aggregation.weeks = aggregation.weeks || {};
  aggregation.months = aggregation.months || {};
  aggregation.days = aggregation.days || {};

  // Helper function: Query hitCounter with a filter and return count and unique IPs.
  async function aggregateRecords(filter: string) {
    const records = await pb.collection("hitCounter").getFullList({ filter });
    let count = 0;
    const ipSet = new Set();
    records.forEach((record: any) => {
      count++;
      ipSet.add(record.ip);
    });
    return { count, uniqueIPs: ipSet.size };
  }

  // ---------------------------
  // Update Monthly Aggregates
  // ---------------------------
  let earliestMonthStart;
  const monthKeys = Object.keys(aggregation.months).map(Number);
  if (monthKeys.length === 0) {
    const oldestRes = await pb.collection("hitCounter").getList(1, 1, { sort: "id" });
    if (oldestRes.items.length > 0) {
      const oldestTimestamp = parseInt(oldestRes.items[0].id, 10);
      earliestMonthStart = DateTime.fromMillis(oldestTimestamp, { zone: "America/Los_Angeles" })
        .startOf("month")
        .toMillis();
    } else {
      earliestMonthStart = currentMonthStart;
    }
  } else {
    // see which month the db is missing
    const month = DateTime.fromMillis(Math.max(...monthKeys), { zone: "America/Los_Angeles" })
      .plus({ months: 1 })
      .toMillis();
    earliestMonthStart = month < previousMonthStart ? month : previousMonthStart;
  }

  let m = earliestMonthStart;
  while (m <= previousMonthStart) {
    if (!aggregation.months[m]) {
      const nextMonthStart = DateTime.fromMillis(m, { zone: "America/Los_Angeles" })
        .plus({ months: 1 })
        .startOf("month")
        .toMillis();
      const monthFilter = `id >= "${ToId(m.toString())}" && id < "${ToId(nextMonthStart.toString())}"`;
      logStr(
        log,
        "updateAggregationRecord",
        `Aggregating month: ${DateTime.fromMillis(m).toLocaleString()} to ${DateTime.fromMillis(
          nextMonthStart
        ).toLocaleString()}`
      );
      aggregation.months[m] = await aggregateRecords(monthFilter);
    }
    m = DateTime.fromMillis(m, { zone: "America/Los_Angeles" }).plus({ months: 1 }).startOf("month").toMillis();
  }

  // ---------------------------
  // Update Weekly Aggregates
  // ---------------------------
  let earliestWeekStart;
  const weekKeys = Object.keys(aggregation.weeks).map(Number);
  if (weekKeys.length === 0) {
    const oldestRes = await pb.collection("hitCounter").getList(1, 1, { sort: "id" });
    if (oldestRes.items.length > 0) {
      const oldestTimestamp = parseInt(oldestRes.items[0].id, 10);
      earliestWeekStart = DateTime.fromMillis(oldestTimestamp, { zone: "America/Los_Angeles" })
        .minus({ days: DateTime.fromMillis(oldestTimestamp, { zone: "America/Los_Angeles" }).weekday % 7 })
        .startOf("day")
        .toMillis();
    } else {
      earliestWeekStart = currentWeekStart;
    }
  } else {
    earliestWeekStart = Math.max(...weekKeys);
  }

  let w = earliestWeekStart;
  while (w <= previousWeekStart) {
    if (!aggregation.weeks[w]) {
      const nextWeekStart = DateTime.fromMillis(w, { zone: "America/Los_Angeles" })
        .plus({ weeks: 1 })
        .startOf("day")
        .toMillis();
      const weekFilter = `id >= "${ToId(w.toString())}" && id < "${ToId(nextWeekStart.toString())}"`;
      logStr(
        log,
        "updateAggregationRecord",
        `Aggregating week: ${DateTime.fromMillis(w).toLocaleString(DateTime.DATETIME_MED)} to ${DateTime.fromMillis(
          nextWeekStart
        ).toLocaleString(DateTime.DATETIME_MED)}`
      );
      aggregation.weeks[w] = await aggregateRecords(weekFilter);
    }
    w = DateTime.fromMillis(w, { zone: "America/Los_Angeles" }).plus({ weeks: 1 }).startOf("day").toMillis();
  }

  // ---------------------------
  // Update Daily Aggregates
  // ---------------------------
  // If the aggregation record's timestamp is older than todayStart,
  // aggregate yesterday's data (if missing)
  if (aggregation.timestamp < todayStart) {
    const yesterdayStart = now.minus({ days: 1 }).startOf("day").toMillis();
    if (!aggregation.days[yesterdayStart]) {
      const yesterdayFilter = `id >= "${ToId(yesterdayStart.toString())}" && id < "${ToId(todayStart.toString())}"`;
      logStr(
        log,
        "updateAggregationRecord",
        `Aggregating yesterday: ${DateTime.fromMillis(yesterdayStart).toLocaleString()} to ${DateTime.fromMillis(
          todayStart
        ).toLocaleString()}`
      );
      aggregation.days[yesterdayStart] = await aggregateRecords(yesterdayFilter);
    }
  }
  // For days older than yesterday (i.e. from 2 days ago up to 7 days ago), aggregate only if missing.
  for (let d = 2; d < 7; d++) {
    const dayStart = now.minus({ days: d }).startOf("day").toMillis();
    if (!aggregation.days[dayStart]) {
      const nextDayStart = DateTime.fromMillis(dayStart, { zone: "America/Los_Angeles" })
        .plus({ days: 1 })
        .startOf("day")
        .toMillis();
      const dayFilter = `id >= "${ToId(dayStart.toString())}" && id < "${ToId(nextDayStart.toString())}"`;
      logStr(
        log,
        "updateAggregationRecord",
        `Aggregating day: ${DateTime.fromMillis(dayStart).toLocaleString()} to ${DateTime.fromMillis(
          nextDayStart
        ).toLocaleString()}`
      );
      aggregation.days[dayStart] = await aggregateRecords(dayFilter);
    }
  }
  // Always update today's entry.
  const todayFilter = `id >= "${ToId(todayStart.toString())}" && id < "${ToId(tomorrowStart.toString())}"`;
  logStr(
    log,
    "updateAggregationRecord",
    `Aggregating today: ${DateTime.fromMillis(todayStart).toLocaleString()} to ${DateTime.fromMillis(
      tomorrowStart
    ).toLocaleString()}`
  );
  aggregation.days[todayStart] = await aggregateRecords(todayFilter);

  // Update the aggregation record's timestamp.
  aggregation.timestamp = now.toMillis();

  // Save the updated aggregation record back to PocketBase.
  await pb.collection("status").update(ToId("sitehits"), { record: aggregation });
  writeLog(log);
}

// Schedule the job to run every 10 minutes.
// The cron expression "*/10 * * * *" means "every 10 minutes".
cron.schedule("*/10 * * * *", async () => {
  const log: string[] = [];
  try {
    await sqlToPbHitCounter();
    await updateAggregationRecord();
    logStr(log, "hitCounter cron", `Aggregation record updated at ${new Date().toISOString()}`);
    writeLog(log);
  } catch (error) {
    logStr(log, "hitCounter cron", "Error updating aggregation record:", error);
    writeLog(log);
  }
});

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

  // For testing, not usually called.
  router.get("/HandleHits", async (req: Request, res: Response) => {
    const log: string[] = [];
    try {
      await sqlToPbHitCounter();
      await updateAggregationRecord();
      logStr(log, "HandleHits", `Aggregation record updated at ${new Date().toISOString()}`);
      writeLog(log);
    } catch (error) {
      logStr(log, "HandleHits", "Error updating aggregation record:", error);
      writeLog(log);
    }
    res.json({ status: "Updated Aggregation" });
  });

  return router;
};
