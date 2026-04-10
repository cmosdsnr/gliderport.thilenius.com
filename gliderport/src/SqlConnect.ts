/**
 * @packageDocumentation
 *
 * **This module establishes a connection to a MySQL database using the `mysql2` package.**
 * It reads the database URL from environment variables and attempts to create and connect a database
 * connection. The connection is stored in the exported variable `connection`.
 *
 * ## Dependencies
 * - `mysql2`: MySQL client for Node.js.
 * - `dotenv`: Loads environment variables from a `.env` file.
 *
 * ## Usage
 * - Ensure that the environment variable `DATABASE_URL` is defined in your environment or `.env` file.
 * - This module automatically connects to the database upon import.
 *
 * @module SqlConnect
 */

import mysql from "mysql2";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * The active MySQL connection instance.
 *
 * Set to a `mysql2.Connection` object by {@link SqlConnect} upon a successful
 * `createConnection` call.  Remains `null` if `DATABASE_URL` is missing or
 * `createConnection` throws before the connection attempt.
 *
 * @example
 * ```ts
 * import { connection } from "SqlConnect";
 * connection?.query("SELECT 1", (err, rows) => { ... });
 * ```
 */
export let connection: mysql.Connection | null = null;

/**
 * Initializes and opens a MySQL database connection.
 *
 * Steps performed:
 * 1. Reads the `DATABASE_URL` environment variable (a mysql2-compatible
 *    connection string, e.g. `mysql://user:pass@host:3306/dbname`).
 * 2. Calls `mysql2.createConnection(dbUrl)` to create a connection object.
 * 3. Calls `connection.connect()` to open the socket to MySQL.
 * 4. Logs success or error to `console`.
 *
 * Error states:
 * - `DATABASE_URL` is undefined or empty → logs error, returns early, `connection` stays `null`.
 * - `mysql2.createConnection` returns falsy → logs error, returns early.
 * - `connection.connect` callback receives an error → logs the MySQL error message.
 *
 * Called automatically when this module is first imported.
 *
 * @returns `void` — connection result is communicated via the {@link connection} export.
 *
 * @throws Never throws; all errors are caught and logged internally.
 */
export const SqlConnect = (): void => {
  const dbUrl = process.env.DATABASE_URL;
  if (typeof dbUrl !== "string" || dbUrl.trim() === "") {
    console.error("SqlConnect: DATABASE_URL not defined or invalid:", dbUrl);
    return;
  }

  // Create the connection
  connection = mysql.createConnection(dbUrl);

  if (!connection) {
    console.error("SqlConnect: Failed to create connection for URL:", dbUrl);
    return;
  }

  // Attempt to connect
  connection.connect((err) => {
    if (err) {
      console.error("SqlConnect: Error connecting to MySQL:", err.message);
    } else {
      console.log("SqlConnect: MySQL Connected successfully!");
    }
  });
};

/**
 * Module initializer — invokes {@link SqlConnect} at import time so that
 * the {@link connection} export is ready for use by the time any importer
 * receives the module.
 */
SqlConnect();
