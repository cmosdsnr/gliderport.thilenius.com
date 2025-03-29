/**
 * ## Logging Utility
 *
 * Provides lightweight, file-based logging for use across the application.
 * - Logs messages to a daily log file with timestamped entries
 * - Automatically truncates the log file to prevent uncontrolled growth
 *
 * @module log
 */

import fs from "fs";
import cron from "node-cron";

/**
 * Checks if the given path is a directory.
 *
 * @param path - Path to check.
 * @returns True if it's a directory, false otherwise.
 */
export function isDirectory(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory();
  } catch (err) {
    return false;
  }
}

// Determine log file path based on available directories
const logsDir = isDirectory("/home/pi/logs/")
  ? "/home/pi/logs/"
  : "/Git/web/buddStServer/thilenius.com/gliderport/gp_pi3_server/";

let __logFile = logsDir + "gp_pi3_server.log";

/**
 * Logs a formatted message to a rotating file log.
 *
 * - Timestamped using MM-DD-YYYY HH:mm:ss
 * - First argument acts as a tag (left-aligned to 17 chars)
 *
 * @param args - Arguments to log. First is used as a label.
 */
export const log = (...args: any[]) => {
  const d = new Date();
  const date = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  const time = `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}:${d
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;

  args[0] += ":";
  args[0] = args[0].toString().padEnd(17, " ");
  const message = args.join(" ");
  fs.appendFileSync(__logFile, `${date} ${time} ${message}\n`);
  // Uncomment for console logging:
  // console.log(`${date} ${time} ${message}`);
};

const max = 5000;

/**
 * Truncates the log file to the most recent N lines (default: 5000).
 * Prevents excessive file size buildup.
 */
const limitLogLineNumbers = () => {
  const data = fs.readFileSync(__logFile, "utf8");
  const lines = data.split("\n");
  if (lines.length > max) {
    const newLines = lines.slice(lines.length - max).join("\n");
    fs.writeFileSync(__logFile, newLines);
  }
  log("Cron", `Log file trimmed to ${max} lines.`);
};
limitLogLineNumbers(); // Initial call to trim log file
/**
 * Cron job: Trims the log file twice every day at 2:00 AM/PM LA time.
 */
cron.schedule("0 2 * * *", limitLogLineNumbers, {
  timezone: "America/Los_Angeles",
});
cron.schedule("0 14 * * *", limitLogLineNumbers, {
  timezone: "America/Los_Angeles",
});

// Trigger a dummy log line to validate setup
log("", "");
