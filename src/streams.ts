// streamRouter.ts
import express, { Request, Response, NextFunction, Router } from "express";
import fs from "fs";
import path from "path";

// --- Types for stats ---
type HourBucket = string; // e.g. "2025-05-29T22:00"
interface Stats {
  totalHitsByHour: Record<HourBucket, number>;
  hitsByIPByHour: Record<HourBucket, Record<string, number>>;
  fiveMinuteBitrate?: number; // bytes/sec over last 5 minutes
}

type LastFiveMinutes = {
  [key: string]: {
    date: number; // Timestamp of the last hit
    size: number; // Size of the last hit in bytes
  };
};

const lastFiveMinutes: LastFiveMinutes = {};
const stats: Stats = { totalHitsByHour: {}, hitsByIPByHour: {} };

const STREAM_ROUTE = "/stream";
const STREAM_DIR = "/app/gliderport/stream";
const LOG_FILE = "/app/gliderport/stream/stream_access.log";

/**
 * Prune stats older than 24 hours so we keep only the last day
 */
function pruneOldStats() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const hourKey of Object.keys(stats.totalHitsByHour)) {
    const hourDate = new Date(hourKey).getTime();
    if (hourDate < cutoff) {
      delete stats.totalHitsByHour[hourKey];
      delete stats.hitsByIPByHour[hourKey];
    }
  }
}

/**
 * Returns an Express.Router that:
 *  • Hooks a middleware on /stream to collect stats
 *  • Serves static files from STREAM_DIR under /stream
 *  • Exposes GET /stats (relative to wherever you mount this router)
 */
export function streamRoutes(): Router {
  const router = express.Router();

  // 1) Collect stats whenever a request comes into /stream/*.ts
  router.use(STREAM_ROUTE, (req: Request, res: Response, next: NextFunction) => {
    // Only count “.ts” files under /stream
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

    // Determine client IP (X-Forwarded-For or socket)
    const fwd = req.headers["x-forwarded-for"];
    let ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
    ip = ip.replace(/^::ffff:/, "");

    // Bucket by UTC hour
    const now = new Date();
    const hourKey = now.toISOString().slice(0, 13) + ":00";

    stats.totalHitsByHour[hourKey] = (stats.totalHitsByHour[hourKey] || 0) + 1;
    stats.hitsByIPByHour[hourKey] = stats.hitsByIPByHour[hourKey] || {};
    stats.hitsByIPByHour[hourKey][ip] = (stats.hitsByIPByHour[hourKey][ip] || 0) + 1;

    // Track last‐5‐minute bitrate
    lastFiveMinutes[req.path] = {
      date: Date.now(),
      size: fs.statSync(path.join(STREAM_DIR, req.path)).size,
    };
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let sum = 0;
    let oldestDate = Date.now();
    for (const key in lastFiveMinutes) {
      if (lastFiveMinutes[key].date < fiveMinutesAgo) {
        delete lastFiveMinutes[key];
      } else {
        sum += lastFiveMinutes[key].size;
        if (lastFiveMinutes[key].date < oldestDate) {
          oldestDate = lastFiveMinutes[key].date;
        }
      }
    }
    stats.fiveMinuteBitrate = oldestDate === Date.now() ? 0 : Math.round((sum / (Date.now() - oldestDate)) * 1000); // bytes/sec

    // Append log entry
    const logLine = `${now.toISOString()} ${ip} ${req.path}\n`;
    fs.appendFile(LOG_FILE, logLine, (err) => {
      if (err) console.error("Log write failed:", err);
    });

    next();
  });

  // 2) Serve all files under STREAM_DIR at /stream/*
  router.use(STREAM_ROUTE, express.static(STREAM_DIR));

  // 3) Expose a “/stats” endpoint (e.g. GET /stats)
  router.get("/stats", (_req: Request, res: Response) => {
    res.json(stats);
  });

  return router;
}
