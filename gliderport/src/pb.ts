/**
 * @packageDocumentation
 *
 * ## This module initializes the connection to the PocketBase backend service.
 * It performs the following tasks:
 *  - Sets up a global EventSource so that the PocketBase client can use it.
 *  - Loads environment variables from a `.env` file.
 *  - Defines a delay helper for retry logic.
 *  - Implements `testConnection` to verify if PocketBase is reachable.
 *  - Defines `pbInit`, which:
 *      * Tries to connect to a primary PocketBase URL.
 *      * If the connection fails, retries with a fallback URL.
 *      * Once connected, attempts to log in as an admin using preset credentials.
 *      * Uses retry logic (with a 15-second delay) for both connection and authentication.
 *  - Finally, it calls `pbInit()` to establish the connection and log in.
 *
 * ### Global Variables
 *  - `pb`: The PocketBase client instance.
 *  - `authData`: Holds authentication data after a successful login.
 *
 * @module pb
 */
import { EventSource } from "eventsource";
// @ts-ignore – ignore missing global definition for EventSource
(globalThis as any).EventSource = EventSource;

import PocketBase from "pocketbase";
import dotenv from "dotenv";

export let pb: any = null; // Global PocketBase client instance
export let authData: any = null; // Authentication data after a successful login

// Load environment variables from .env file
dotenv.config();

/**
 * Returns a Promise that resolves after a specified delay.
 *
 * @param ms - The number of milliseconds to delay.
 * @returns A Promise that resolves after `ms` milliseconds.
 */
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Tests the connection to the current PocketBase instance by calling its health endpoint.
 *
 * @param firstPass - Indicates if this is the first connection attempt (controls logging verbosity).
 * @returns A Promise that resolves to `true` if the health check succeeds; otherwise, `false`.
 */
async function testConnection(firstPass: boolean): Promise<boolean> {
  try {
    const health = await pb.health.check();
    console.log("pbInit:         ✅ Connection successful:", health);
    return true;
  } catch (error: any) {
    if (!firstPass) console.error("pbInit:         ❌ Connection failed:", error.message);
    return false;
  }
}

/**
 * Initializes the PocketBase connection and logs in as an admin.
 *
 * This function continuously attempts to:
 *  - Connect to the primary URL (`"http://gpdata.web:5000"`). If that fails,
 *    switch to a fallback URL (`"https://gpdata.thilenius.com"`).
 *  - Once connected, attempt to authenticate with admin credentials.
 *  - Use a 15-second delay between connection retries, and a 5-second delay between login retries.
 *
 * @returns A Promise that resolves once a successful connection and login have been established.
 */
export const pbInit = (): Promise<void> => {
  return new Promise<void>(async (resolve, reject) => {
    let url = "";
    let connected = false;
    let loggedIn = false;
    let firstPass = true;

    console.log("pbInit:         connecting to pocketbase...");

    // Attempt to establish a connection to PocketBase
    while (!connected) {
      // Try primary URL
      url = "http://gpdata.web:5000";
      console.log("pbInit:         Attempting to connect to PocketBase at:", url);
      pb = new PocketBase(url);
      pb.autoCancellation(false);
      connected = await testConnection(firstPass);

      // If primary fails, try fallback URL
      if (!connected) {
        url = "https://gpdata.thilenius.com";
        console.log("pbInit:         Attempting to connect to PocketBase at:", url);
        pb = new PocketBase(url);
        pb.autoCancellation(false);
        connected = await testConnection(false);
      }
      firstPass = false;

      if (!connected) {
        console.log("pbInit:         Retrying in 15 seconds...");
        await delay(15000); // Wait 15 seconds before retrying
      }
    }

    // Once connected, attempt to log in with admin credentials
    while (!loggedIn) {
      try {
        authData = await pb.admins.authWithPassword("stephen@thilenius.com", "Qwe123qwe!");
        console.log("pbInit:         pocketbase logged in to:", url);
        loggedIn = true;
        resolve();
      } catch (error: any) {
        console.error("pbInit:         pb connected but failed to login", error.message);
        console.log("pbInit:         Retrying login in 5 seconds...");
        await delay(5000); // Wait 5 seconds before retrying login
      }
    }
  });
};

// Immediately initialize the PocketBase connection and login
await pbInit();
