/**
 * @packageDocumentation
 *
 * Provides utility functions for file system checks and string formatting.
 * It includes functions to determine if a given path is a directory and to convert a string
 * into a fixed-length ID with leading zeros.
 *
 * @module miscellaneous
 */

import fs from "fs"; // Synchronous file system methods

/**
 * Checks whether the specified file system path is a directory.
 *
 * @param pathToCheck - The file system path to verify.
 * @returns `true` if the path exists and is a directory; otherwise, `false`.
 *
 * @remarks
 * Uses synchronous `fs.statSync`. Any error (e.g., path does not exist, permission denied)
 * is silently caught and results in `false`.
 *
 * @example
 * ```ts
 * isDirectory("/var/log");        // true
 * isDirectory("/var/log/syslog"); // false (regular file)
 * isDirectory("/does/not/exist"); // false
 * ```
 */
export function isDirectory(pathToCheck: string): boolean {
  try {
    return fs.statSync(pathToCheck).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Converts a string into a fixed-length 15-character PocketBase-compatible ID.
 *
 * The input is lower-cased and truncated to 15 characters; if shorter than 15 characters
 * it is left-padded with `'0'` so the result is always exactly 15 characters long.
 *
 * @param x - The input string to convert into an ID.
 * @returns A 15-character lowercase string, zero-padded on the left as needed.
 *
 * @example
 * ```ts
 * ToId("hello")    // "0000000000hello"  (10 zeros + 5 chars = 15)
 * ToId("online")   // "000000000online"  (9 zeros + 6 chars = 15)
 * ToId("abcdefghijklmnopqrstuvwxyz") // "abcdefghijklmno"  (truncated to first 15, lowercased)
 * ```
 */
export const ToId = (x: string): string => {
  const truncated = x.slice(0, 15).toLowerCase();
  return "0".repeat(15 - truncated.length) + truncated;
};
