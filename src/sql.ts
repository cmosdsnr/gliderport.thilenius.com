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
import { log } from "./log";

// Load environment variables from .env file.
dotenv.config();

let sql;

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
      log("SqlConnect", "❌" + error.message);
      return reject(error);
    }

    log("top level", "SqlConnect: Connecting to database at", process.env.DATABASE_URL);
    connection = mysql.createConnection(process.env.DATABASE_URL);

    connection.connect((err) => {
      if (err) {
        log("SqlConnect", "❌ Connection failed", err.message);
        return reject(err);
      }

      log("SqlConnect", "✅ MySQL Connected!");
      resolve();
    });
  });
};

// Immediately attempt to establish the connection.
await SqlConnect();

/**
 * Inserts a raw data record into the `raw_data` table.
 *
 * @param row - An object containing all raw sensor values.
 * @returns A Promise resolving to the query result or null if no connection.
 */
export const insertRaw = async (row: any): Promise<any> => {
  if (connection === null) {
    log("insertRaw", "No connection to database");
    return null;
  }

  const { speed, angle, count, tc, t, tr, c, h, dt, bt, p } = row;
  const ts = Math.floor(Date.now() / 1000);

  const sql = `
    INSERT INTO \`raw_data\` (
      speed, angle, w_count, r_temp_count, r_temp_read, r_temp_ref,
      s_count, s_humidity, s_temp_dht, s_temp_bmp, s_pressure, epoch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    speed,
    angle,
    count,
    tc,
    t,
    tr,
    c,
    h,
    Math.round(10 * dt),
    Math.round(10 * bt),
    Math.round(p - 101325),
    ts,
  ];

  try {
    return await connection.promise().query(sql, values);
  } catch (err) {
    log("insertRaw", "Error inserting data:", err);
    return null;
  }
};

export const getRawRecordsFromDate = async (ts: number): Promise<any> => {
  if (connection === null) {
    log("getLatestRaw", "No connection to database");
    return null;
  }
  sql = "SELECT * FROM `raw_data` WHERE `epoch` > " + ts + " ORDER BY epoch ASC;";
  const [rawRows]: [any[], any[]] = await connection.promise().query(sql);
  return rawRows;
};
