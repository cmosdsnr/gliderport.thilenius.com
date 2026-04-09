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
 * The directory name of the parent folder containing this module.
 *
 * Calculates `__dirname` based on the `import.meta.url` to support ES modules.
 */
const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(path.dirname(__filename));
export const __logDir = path.join(__dirname, "/gliderport/logs/");

/**
 * Appends a formatted log entry to the log file.
 *
 * - Prepends the message with the current date and time in `MM-DD-YYYY HH:mm:ss` format.
 * - Pads the first argument (label) to 17 characters for alignment.
 * - Joins all arguments into a single string and writes it to the file.
 *
 * @param args - The message components to log. The first element is used as a label.
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
 * Appends a formatted log entry to an in-memory log array.
 *
 * - The first argument is the log array to which to append.
 * - The next arguments form the log message, with the first of those padded to 25 characters.
 * - Prepends date and time in `MM-DD-YYYY HH:mm:ss` format.
 *
 * @param logArray - The in-memory array of log strings to which the entry will be appended.
 * @param args     - The message components to log. The first message component is treated as a label.
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
 * Writes the contents of a log array to the log file, each entry on a new line.
 *
 * @param logArray - The array of log strings to write to the file.
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

const max = 5000;
const __LogFile = path.join(__logDir, "cron.log");

/**
 * Truncates the log file to the most recent N lines (default: 5000).
 * Prevents excessive file size buildup.
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

limitLogLineNumbers(); // Initial call to trim log file
/**
 * Cron job: Trims the log file twice every day at 2:00 AM/PM LA time.
 */
cron.schedule("0 2 * * *", limitLogLineNumbers, {
  timezone: "America/Los_Angeles",
});
