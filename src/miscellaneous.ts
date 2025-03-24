/**
 *
 * Provides utility functions for file system checks and string formatting.
 * It includes functions to determine if a given path is a directory and to convert a string
 * into a fixed-length ID with leading zeros.
 *
 * @module miscellaneous
 */

import fs from "fs"; // Synchronous methods.
import fsPromises from "fs/promises"; // Asynchronous, promise-based methods.

import { logStr, writeLog } from "log.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Checks whether the specified file system path is a directory.
 *
 * @param {string} path - The path to check.
 * @returns {boolean} True if the path is a directory; otherwise, false.
 */
export function isDirectory(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory();
  } catch (err) {
    // If an error occurs (e.g., the path does not exist), return false.
    return false;
  }
}

/**
 * Converts a given string to a fixed-length ID by prepending leading zeros.
 * The resulting string will be exactly 15 characters long. If the input string is longer
 * than 15 characters, it will be truncated. If it is shorter, it will be padded with zeros.
 * All letters must be lowercase, and caps will be converted.
 *
 * @param {string} x - The input string.
 * @returns {string} A 15-character string with leading zeros.
 */
export const ToId = (x: string): string => {
  x = x.slice(0, 15);
  return "0".repeat(15 - x.length).toLowerCase() + x;
};

export let __dirname = "";

const setDir = async () => {
  // Initialize logging and determine the archive directory.
  const log: string[] = [""];

  // Determine current file's directory using fileURLToPath.
  const __f = fileURLToPath(import.meta.url);

  try {
    // Check for a local "../bin" directory.
    await fsPromises.access(dirname(__f) + "/..");
    __dirname = dirname(__f) + "/..";
    logStr(log, "top path", __dirname, "Path exists!");
  } catch (err) {
    try {
      // Fall back to "/app/gliderport/bin" if local directory is not available.
      await fsPromises.access("/app/gliderport");
      __dirname = "/app/gliderport";
      logStr(log, "top path", __dirname, "Path exists!");
    } catch (err) {
      logStr(log, "top path", "Path does not exist.");
    }
  }
  writeLog(log);
};
setDir();
