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
 * Uses synchronous `fs.statSync` to check. If any error occurs (e.g., path does not exist),
 * the function catches it and returns `false`.
 */
export function isDirectory(pathToCheck: string): boolean {
  try {
    return fs.statSync(pathToCheck).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Converts a given string into a fixed-length ID by prepending leading zeros.
 *
 * The resulting string will be exactly 15 characters long. If the input string exceeds 15
 * characters, it is truncated to the first 15. If shorter, it is left-padded with zeros.
 * All characters are converted to lowercase.
 *
 * @param x - The input string to convert.
 * @returns A 15-character lowercase string with leading zeros if necessary.
 *
 * @example
 * ```ts
 * ToId("Hello")       // "000000000000hello"
 * ToId("abcdefghijklmnopqrstuvwxyz") // "000000000abcdefghijkl"
 * ```
 */
export const ToId = (x: string): string => {
  const truncated = x.slice(0, 15).toLowerCase();
  return "0".repeat(15 - truncated.length) + truncated;
};
