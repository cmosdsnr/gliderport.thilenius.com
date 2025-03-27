/**
 *
 * **This module establishes a connection to a MySQL database using the mysql2 package.**
 * It reads the database URL from environment variables and attempts to create and connect a database
 * connection. The connection is stored in the exported variable `connection`.
 *
 * Dependencies:
 * - mysql2: MySQL client for Node.js.
 * - dotenv: Loads environment variables from a .env file.
 *
 * Usage:
 * - Ensure that the environment variable DATABASE_URL is defined.
 * - This module automatically connects to the database upon import.
 *
 * @module SqlConnect
 */

import mysql from "mysql2";
import dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

// Export the MySQL connection, initially null.
export let connection: mysql.Connection | null = null;

/**
 * Establishes a connection to the MySQL database.
 *
 * Reads the DATABASE_URL environment variable and attempts to create a connection.
 * If the connection is successfully created, it connects and logs a success message.
 * If the DATABASE_URL is not defined or a connection cannot be established, errors are logged.
 *
 * @returns {void}
 */
/**
 * Establishes a MySQL database connection.
 * Waits until the connection is fully established.
 *
 * @returns {Promise<void>} Resolves when connected, rejects on error.
 */
export const SqlConnect = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof process.env.DATABASE_URL !== "string") {
      const error = new Error("SqlConnect: DATABASE_URL not defined");
      console.error(error.message);
      return reject(error);
    }

    console.log("SqlConnect: Connecting to database at", process.env.DATABASE_URL);
    connection = mysql.createConnection(process.env.DATABASE_URL);

    connection.connect((err) => {
      if (err) {
        console.error("SqlConnect: Connection failed", err.message);
        return reject(err);
      }

      console.log("SqlConnect: ✅ MySQL Connected!");
      resolve();
    });
  });
};

// Immediately attempt to establish the connection.
await SqlConnect();
