/**
 * @packageDocumentation
 *
 * This module provides logging utilities for the application.
 * It includes functions to log messages to a file, append messages to an in-memory log array,
 * and output the log array to the console or file.
 *
 * The module determines the log directory by checking if "/app/gliderport/logs" exists.
 * If it does, logs are written there; otherwise, it falls back to "/public/logs/".
 *
 * @module log
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DateTime } from "luxon";
import cron from "node-cron";

/**
 * Absolute path to the source file of this module.
 * Derived from `import.meta.url` to replicate CommonJS `__filename` in ESM.
 */
const __filename = fileURLToPath(import.meta.url);

/**
 * Absolute path to the project root directory (two levels above this file).
 * Re-exported so that other modules (e.g. `app.ts`) can resolve paths
 * relative to the deployment root without duplicating the ESM `__dirname` shim.
 *
 * @example
 * ```ts
 * import { __dirname } from "log";
 * const frontendPath = path.join(__dirname, "/gliderport/frontend");
 * ```
 */
export const __dirname = path.dirname(path.dirname(__filename));

/**
 * Absolute path to the directory where all `.log` files are written.
 *
 * Resolves to `<project-root>/gliderport/logs/`.
 * Used by {@link log}, {@link writeLog}, and the daily truncation cron job.
 */
export const __logDir = path.join(__dirname, "/gliderport/logs/");

/**
 * Appends a single formatted entry to a log file on disk.
 *
 * Format: `MM-dd-yyyy HH:mm:ss  <label padded to 17 chars>  <rest of args>`
 *
 * The timestamp is generated in the `America/Los_Angeles` timezone.
 * The first variadic argument is treated as a label: a colon is appended
 * and the result is left-padded to 17 characters for columnar alignment.
 *
 * @param __logFile - Absolute path to the target `.log` file.
 *   The file is created automatically if it does not exist.
 * @param args      - One or more values to log.  The first is used as the
 *   label/category; subsequent values are joined with spaces.
 *
 * @example
 * ```ts
 * log("/path/to/app.log", "Wind", "speed=12 dir=270");
 * // → "04-10-2026 14:22:05   Wind:             speed=12 dir=270"
 * ```
 */
export const log = (__logFile: string, ...args: any[]): void => {
  const date = DateTime.fromMillis(Date.now(), { zone: "America/Los_Angeles" })
    .toFormat("MM-dd-yyyy HH:mm:ss")
    .padEnd(20, " ");

  // Label formatting: append colon and pad to 17 characters.
  args[0] = args[0].toString() + ":";
  args[0] = args[0].padEnd(17, " ");

  // Join all arguments into one message string.
  const message = args.join(" ");

  // Append to log file with newline.
  fs.appendFileSync(__logFile, `${date} ${message}\n`);
};

/**
 * Appends a formatted log entry to an in-memory string array.
 *
 * Identical in format to {@link log} but targets an in-memory `string[]`
 * instead of a file.  The label column is padded to **25** characters
 * (wider than {@link log}'s 17) to accommodate longer category names.
 *
 * Use this function to collect log lines during a request or job, then
 * flush them to disk in one call via {@link writeLog}.
 *
 * @param logArray - The in-memory array to which the formatted entry is pushed.
 * @param args     - One or more values to log.  The first is used as the
 *   label/category; subsequent values are joined with spaces.
 *
 * @example
 * ```ts
 * const lines: string[] = [];
 * logStr(lines, "HttpReq", "GET /wind 200");
 * logStr(lines, "HttpReq", "GET /sun  304");
 * writeLog("/path/to/app.log", lines);
 * ```
 */
export const logStr = (logArray: string[], ...args: any[]): void => {
  const date = DateTime.fromMillis(Date.now(), { zone: "America/Los_Angeles" })
    .toFormat("MM-dd-yyyy HH:mm:ss")
    .padEnd(20, " ");

  // Label formatting: append colon and pad to 25 characters.
  args[0] = args[0].toString() + ":";
  args[0] = args[0].padEnd(25, " ");

  // Join remaining arguments into one message string.
  const message = args.join(" ");

  // Append to the provided log array with timestamp.
  logArray.push(`${date} ${message}`);
};

/**
 * Flushes an in-memory log array to a log file on disk.
 *
 * Each element of `logArray` is written as a separate line.  The content is
 * **appended** to the file (not overwritten).  Empty or invalid arrays are
 * silently ignored (with a console warning for truly malformed input).
 *
 * Typical usage: build `logArray` with {@link logStr} throughout a job,
 * then call `writeLog` once at the end to minimise file I/O.
 *
 * @param __logFile - Absolute path to the target `.log` file.
 * @param logArray  - Array of pre-formatted log strings produced by {@link logStr}.
 *   Must be a non-empty array; a single-element array containing only `""`
 *   is treated as empty and skipped.
 *
 * @example
 * ```ts
 * const lines: string[] = [];
 * logStr(lines, "Cron", "job started");
 * logStr(lines, "Cron", "job finished");
 * writeLog("/path/to/cron.log", lines);
 * ```
 */
export const writeLog = (__logFile: string, logArray: string[]): void => {
  if (!Array.isArray(logArray) || logArray.length === 0) {
    console.log("Bad LogArray.", logArray, logArray.length);
    return;
  }
  if (logArray.length === 1 && logArray[0] === "") {
    // console.log("Empty LogArray.", logArray, logArray.length);
    return;
  }
  fs.appendFileSync(__logFile, logArray.join("\n") + "\n");
};

/** Maximum number of lines retained per log file after truncation. */
const max = 5000;

/** Absolute path to the cron/maintenance log file used by {@link limitLogLineNumbers}. */
const __LogFile = path.join(__logDir, "cron.log");

/**
 * Scans every `.log` file in {@link __logDir} and truncates any file that
 * exceeds {@link max} lines, keeping only the most recent `max` lines.
 *
 * Called once at module load and then daily at 02:00 LA time via a `node-cron`
 * schedule, ensuring log files never grow unboundedly in production.
 *
 * Each truncation or no-op is recorded to {@link __LogFile} via {@link log}.
 * If the log directory does not exist the function logs to console and returns
 * immediately without throwing.
 */
const limitLogLineNumbers = () => {
  if (!fs.existsSync(__logDir)) {
    console.log("Log directory does not exist:", __logDir);
    return;
  }
  //scan __logDir for log files
  const logFiles = fs.readdirSync(__logDir).filter((file) => file.endsWith(".log"));
  if (logFiles.length === 0) {
    log(__LogFile, "No log files found in directory:", __logDir);
    return;
  }
  // Process each log file
  logFiles.forEach((file) => {
    const filePath = path.join(__logDir, file);
    const data = fs.readFileSync(filePath, "utf8");
    const lines = data.split("\n");
    if (lines.length > max) {
      const newLines = lines.slice(lines.length - max).join("\n");
      fs.writeFileSync(filePath, newLines);
      log(__LogFile, "Cron", `Log file ${file} trimmed to ${max} lines.`);
    } else {
      log(__LogFile, "Cron", `Log file ${file} has ${lines.length} lines, no truncation needed.`);
    }
  });
};

/** Run once at startup to trim any logs that grew oversized while offline. */
limitLogLineNumbers();

/**
 * Daily cron job — trims all log files at **02:00 America/Los_Angeles**.
 * Schedule expression: `"0 2 * * *"` (once per day at 2 AM).
 */
cron.schedule("0 2 * * *", limitLogLineNumbers, {
  timezone: "America/Los_Angeles",
});
