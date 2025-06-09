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
 * Will be `null` if connection could not be established.
 */
export let connection: mysql.Connection | null = null;

/**
 * Initializes and establishes a connection to the MySQL database.
 *
 * - Reads the `DATABASE_URL` environment variable.
 * - Creates a MySQL connection using `mysql2.createConnection`.
 * - Attempts to connect and logs the outcome.
 *
 * If the `DATABASE_URL` is not defined or the connection fails, errors are logged,
 * and `connection` remains `null`.
 *
 * @returns `void`
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

// Immediately attempt to establish the connection when this module is imported
SqlConnect();
