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
import { __dirname } from "miscellaneous.js";
import { DateTime } from "luxon";

// Determine the log file path.
let __logFile = `${__dirname}/gliderport/logs/gpUpdate.log`;

/**
 * Appends a formatted log entry to the log file.
 *
 * - Prepends the message with the current date and time in `MM-DD-YYYY HH:mm:ss` format.
 * - Pads the first argument (label) to 17 characters for alignment.
 * - Joins all arguments into a single string and writes it to the file.
 *
 * @param args - The message components to log. The first element is used as a label.
 */
export const log = (...args: any[]): void => {
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
export const writeLog = (logArray: string[]): void => {
  if (!Array.isArray(logArray) || logArray.length === 0) {
    console.log("Bad LogArray.", logArray, logArray.length);
    return;
  }
  if (logArray.length === 1 && logArray[0] === "") {
    console.log("Empty LogArray.", logArray, logArray.length);
    return;
  }
  fs.appendFileSync(__logFile, logArray.join("\n") + "\n");
};
