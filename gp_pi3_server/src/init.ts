/**
 * ## Initialization Utilities
 *
 * This module handles early-stage setup tasks such as:
 * - Logging the modification time of the built `dist/app.js` file (if it exists)
 * - Exporting a generic `delay` utility for async pauses
 *
 * @module init
 */

import fs from "fs";
import { log } from "log";

/**
 * Logs the last modified time of the compiled output file (if available).
 * Intended for debugging or build verification.
 */
fs.stat("dist/app.js", (err, stats) => {
  if (err) {
    log("top level", "Error reading file stats:", err.message);
    return;
  }
  log("top level", "dist/app.js last modified:", stats.mtime);
});

/**
 * Delays async execution by a given number of milliseconds.
 *
 * @param ms Milliseconds to wait
 * @returns Promise that resolves after the delay
 */
export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
