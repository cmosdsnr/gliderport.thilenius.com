import express, { Request, Response, NextFunction, Router } from "express";
import fs from "fs";
import path from "path";

// --- Types for stats ---
type HourBucket = string; // e.g. "2025-05-29T22:00"
interface Stats {
  totalHitsByHour: Record<HourBucket, number>;
  hitsByIPByHour: Record<HourBucket, Record<string, number>>;
  fiveMinuteBitrate?: number; // Average bitrate in bytes per second over the last 5 minutes
}

type LastFiveMinutes = {
  [key: string]: {
    date: number; // Timestamp of the last hit
    size: number; // Size of the last hit in bytes
  };
};

const lastFiveMinutes: LastFiveMinutes = {};
// In-memory stats
const stats: Stats = { totalHitsByHour: {}, hitsByIPByHour: {} };

const STREAM_ROUTE = "/stream";
const STREAM_DIR = "/app/gliderport/stream";
const LOG_FILE = "/app/gliderport/stream/stream_access.log";

/**
 * Prune stats older than 24 hours to keep only the last day
 */
function pruneOldStats() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const hourKey of Object.keys(stats.totalHitsByHour)) {
    const hourDate = new Date(hourKey);
    if (hourDate.getTime() < cutoff) {
      delete stats.totalHitsByHour[hourKey];
      delete stats.hitsByIPByHour[hourKey];
    }
  }
}

export default function registerStreams(app: express.Application) {
  // Stats & logging middleware
  app.use(STREAM_ROUTE, (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.endsWith(".ts")) {
      return next();
    }

    pruneOldStats();

    // Extract client IP
    const fwd = req.headers["x-forwarded-for"];
    let ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
    ip = ip.replace(/^::ffff:/, "");

    // Bucket by UTC hour
    const now = new Date();
    const hourKey = now.toISOString().slice(0, 13) + ":00";

    // Increment counters
    stats.totalHitsByHour[hourKey] = (stats.totalHitsByHour[hourKey] || 0) + 1;
    stats.hitsByIPByHour[hourKey] = stats.hitsByIPByHour[hourKey] || {};
    stats.hitsByIPByHour[hourKey][ip] = (stats.hitsByIPByHour[hourKey][ip] || 0) + 1;

    lastFiveMinutes[req.path] = {
      date: Date.now(),
      size: fs.statSync(path.join(STREAM_DIR, req.path)).size,
    };
    //remove entries older than 5 minutes
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
    stats.fiveMinuteBitrate = Date.now() == oldestDate ? 0 : (sum / (Date.now() - oldestDate)) * 1000; // bytes per second
    // Log to file
    const logLine = `${now.toISOString()} ${ip} ${req.path}` + "\n";
    fs.appendFile(LOG_FILE, logLine, (err) => {
      if (err) console.error("Log write failed:", err);
    });

    next();
  });

  // Serve static files under /stream
  app.use(STREAM_ROUTE, express.static(STREAM_DIR));

  // Stats endpoint
  app.get("/stats", (_req: Request, res: Response) => {
    res.json(stats);
  });
}
