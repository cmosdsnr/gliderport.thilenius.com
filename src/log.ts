/**
 *
 * This module provides logging utilities for the application.
 * It includes functions to log messages to a file, append messages to an in-memory log array,
 * and output the log array to the console.
 *
 * The module determines the log directory by checking if "/app/gliderport/logs" exists.
 * If it does, logs are written there; otherwise, it falls back to "/public/logs/".
 *
 *
 * @module log
 */
import fs from "fs";
import { __dirname } from "miscellaneous.js";

let __logFile = `${__dirname}/gliderport/logs/gpUpdate.log`;

/**
 * Logs a message to a file.
 *
 * Prepends the message with the current date and time in the format MM-DD-YYYY HH:mm:ss.
 * The first argument is padded to a fixed width for alignment.
 *
 * @param {...any} args - The message components to log. The first element is used as a label.
 */
export const log = (...args: any[]) => {
  const d = new Date();
  const date = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  // Format the current time with leading zeros.
  const time = `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}:${d
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
  // Append a colon to the first argument and pad it to 17 characters.
  args[0] += ":";
  args[0] = args[0].toString().padEnd(17, " ");
  // Join all arguments into a single string.
  const message = args.join(" ");
  // Append the formatted log entry to the log file.
  fs.appendFileSync(__logFile, `${date} ${time} ${message}\n`);
};

/**
 * Appends a formatted log message to a provided log array.
 *
 * The log message is constructed similarly to the `log` function,
 * with the first argument padded to 25 characters.
 *
 * @param {...any} args - The message components to log. The first element is used as a label.
 */
export const logStr = (...args: any[]) => {
  const logArray: string[] = args[0];
  // Remove the log array from the arguments.
  args.shift();
  const d = new Date();
  const date = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  // Format the current time with leading zeros.
  const time = `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}:${d
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
  // Append a colon to the first argument and pad it to 25 characters.
  args[0] += ":";
  args[0] = args[0].toString().padEnd(25, " ");
  // Join all arguments into a single string.
  const message = args.join(" ");
  // Append the formatted message to the provided log array.
  logArray.push(`${date} ${time} ${message}`);
};

/**
 * Outputs the log array to the console.
 *
 * @param {string[]} log - The log array to output.
 */
export const writeLog = (log: string[]) => {
  //   console.log(log.join("\n"));
  // Uncomment the following line to also append the log to the file:
  fs.appendFileSync(__logFile, log.join("\n") + "\n");
};
