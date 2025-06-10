/**
 * @packageDocumentation
 *
 * **This module provides streaming endpoints and statistics tracking for `.ts` segment files.**
 *
 * - Collects per-hour and per-IP request counts.
 * - Calculates 5-minute bitrate over recent requests.
 * - Logs access requests to a log file.
 * - Serves `.ts` video segments from disk under `/stream`.
 * - Exposes a `/stats` endpoint to retrieve current streaming metrics.
 *
 * @module streamRouter
 */
import express, { Request, Response, NextFunction, Router } from "express";
import fs from "fs";
import path from "path";
import { __dirname } from "miscellaneous";

// --- Types for stats ---
/**
 * ISO hour bucket, e.g. "2025-05-29T22:00"
 */
type HourBucket = string;

/**
 * Streaming statistics structure.
 */
interface Stats {
  /** Total requests per UTC hour */
  totalHitsByHour: Record<HourBucket, number>;
  /** Requests per IP per UTC hour */
  hitsByIPByHour: Record<HourBucket, Record<string, number>>;
  /** Calculated bytes/sec over the last 5 minutes */
  fiveMinuteBitrate?: number;
}

/**
 * Tracks the last request time and size for each segment path over 5 minutes.
 */
type LastFiveMinutes = {
  [key: string]: {
    /** Timestamp (ms) of the last hit */
    date: number;
    /** Size (bytes) of the last hit */
    size: number;
  };
};

const lastFiveMinutes: LastFiveMinutes = {};
const stats: Stats = { totalHitsByHour: {}, hitsByIPByHour: {} };

//Route prefix for streaming
const STREAM_ROUTE = "/stream";

// Directory on disk containing `.ts` segments
const STREAM_DIR = path.join(__dirname, "/gliderport/stream");
// Path to access log file for stream requests
const LOG_FILE = path.join(__dirname, "/gliderport/stream/stream_access.log");

/**
 * Prune stats older than 24 hours so only the last day is kept.
 */
function pruneOldStats(): void {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const hourKey in stats.totalHitsByHour) {
    const hourDate = new Date(hourKey).getTime();
    if (hourDate < cutoff) {
      delete stats.totalHitsByHour[hourKey];
      delete stats.hitsByIPByHour[hourKey];
    }
  }
}

/**
 * Creates and returns an Express Router with streaming and stats endpoints.
 *
 * - Middleware on `/stream` to collect `.ts` file access statistics.
 * - Serves static segment files from STREAM_DIR at `/stream/*`.
 * - Exposes GET `/stats` to return current streaming metrics.
 *
 * @returns {Router} Configured Express router for streaming.
 */
export function streamRoutes(): Router {
  const router = express.Router();

  /**
   * Middleware to track stats for `.ts` segment requests under STREAM_ROUTE.
   *
   * @param req Express request object
   * @param res Express response object
   * @param next Next middleware function
   */
  router.use(STREAM_ROUTE, (req: Request, res: Response, next: NextFunction) => {
    // Only track .ts file requests
    if (!req.path.endsWith(".ts")) {
      return next();
    }

    const fullPath = path.join(STREAM_DIR, req.path);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Requested stream file does not exist: ${fullPath}`);
      res.status(404).send("Stream file not found");
      return;
    }

    pruneOldStats();

    // Determine client IP (X-Forwarded-For or remote address)
    const fwd = req.headers["x-forwarded-for"];
    let ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
    ip = ip.replace(/^::ffff:/, "");

    // Bucket by UTC hour key
    const now = new Date();
    const hourKey = now.toISOString().slice(0, 13) + ":00";

    // Update total and per-IP counts
    stats.totalHitsByHour[hourKey] = (stats.totalHitsByHour[hourKey] || 0) + 1;
    stats.hitsByIPByHour[hourKey] = stats.hitsByIPByHour[hourKey] || {};
    stats.hitsByIPByHour[hourKey][ip] = (stats.hitsByIPByHour[hourKey][ip] || 0) + 1;

    // Track last 5-minute bitrate
    lastFiveMinutes[req.path] = {
      date: Date.now(),
      size: fs.statSync(fullPath).size,
    };
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let sumSize = 0;
    let oldest = Date.now();
    for (const key in lastFiveMinutes) {
      const rec = lastFiveMinutes[key];
      if (rec.date < fiveMinutesAgo) {
        delete lastFiveMinutes[key];
      } else {
        sumSize += rec.size;
        if (rec.date < oldest) {
          oldest = rec.date;
        }
      }
    }
    stats.fiveMinuteBitrate = oldest === Date.now() ? 0 : Math.round((sumSize / (Date.now() - oldest)) * 1000);

    // Append to access log file
    const logLine = `${now.toISOString()} ${ip} ${req.path}\n`;
    fs.appendFile(LOG_FILE, logLine, (err) => {
      if (err) console.error("Log write failed:", err);
    });

    next();
  });

  /**
   * GET /stats
   * Returns current in-memory streaming statistics.
   */
  router.get("/stats", (_req: Request, res: Response) => {
    res.json(stats);
  });

  return router;
}
