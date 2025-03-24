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
export const SqlConnect = (): void => {
  if (typeof process.env.DATABASE_URL !== "string") {
    console.error("SqlConnect: DATABASE_URL not defined", process.env.DATABASE_URL);
    return;
  }
  connection = mysql.createConnection(process.env.DATABASE_URL);
  if (!connection) {
    console.error("SqlConnect: No connection to database at ", process.env.DATABASE_URL);
    return;
  }
  connection.connect(function (err) {
    if (err) throw err;
    console.log("SqlConnect: MySQL Connected!");
  });
};

// Immediately attempt to establish the connection.
SqlConnect();
