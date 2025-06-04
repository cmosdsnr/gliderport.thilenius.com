/**
 *
 * ## This module initializes the connection to the PocketBase backend service.
 * It performs the following tasks:
 *  - Sets up a global EventSource so that the PocketBase client can use it.
 *  - Loads environment variables from a .env file.
 *  - Defines a delay helper for retry logic.
 *  - Implements a testConnection function to verify if PocketBase is reachable.
 *  - Defines pbInit, which:
 *      * Tries to connect to a primary PocketBase URL.
 *      * If the connection fails, it retries with a fallback URL.
 *      * Once connected, it attempts to log in as an admin using preset credentials.
 *      * Uses retry logic (with a 15-second delay) for both connection and authentication.
 *  - Finally, it calls pbInit() to establish the connection and log in.
 *
 * Global Variables:
 *  - pb: The PocketBase client instance.
 *  - authData: Holds authentication data after a successful login.
 *
 * @module pb
 */

import { EventSource } from "eventsource";
// @ts-ignore – if TypeScript is strict, ignore the missing global definition
(globalThis as any).EventSource = EventSource;

import PocketBase from "pocketbase";
import dotenv from "dotenv";

export let pb: any = null; // Global PocketBase client instance
export let authData = null; // Authentication data after a successful login

// Load environment variables from .env file
dotenv.config();

/**
 * Helper function that returns a Promise that resolves after a specified delay.
 *
 * @param ms - Milliseconds to delay.
 * @returns Promise<void>
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tests the connection to the current PocketBase instance by calling its health check.
 *
 * @param firstPass - A flag to indicate if this is the first connection attempt.
 * @returns Promise<boolean> - Resolves to true if the health check succeeds, otherwise false.
 */
async function testConnection(firstPass: boolean) {
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
 *  - Connect to the primary URL ("http://gpdata.web:5000"). If that fails,
 *    switch to a fallback URL ("https://gpdata.thilenius.com").
 *  - Once connected, attempt to authenticate with admin credentials.
 *  - Use a 15-second delay between retries if necessary.
 *
 * @returns Promise<void> - Resolves once a successful connection and login have been established.
 */
export const pbInit = () => {
  return new Promise<void>(async (resolve, reject) => {
    let url = "";
    let connected = false;
    let loggedIn = false;
    let firstPass = true;
    console.log("pbInit:         connecting to pocketbase...");

    // Attempt to establish a connection
    while (!connected) {
      url = "http://gpdata.web:5000";
      console.log("pbInit:         Attempting to connect to PocketBase at:", url);
      pb = new PocketBase(url);
      pb.autoCancellation(false);
      connected = await testConnection(firstPass);

      // If the primary URL fails, try the fallback URL
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
        await delay(15000); // Wait for 15 seconds before retrying
      }
    }

    // Once connected, attempt to log in with admin credentials
    while (!loggedIn) {
      try {
        authData = await pb.admins.authWithPassword("stephen@thilenius.com", "Qwe123qwe!");
        console.log("pbInit:         pocketbase logged in to: " + url);
        loggedIn = true;
        resolve();
      } catch (error: any) {
        console.error("pbInit:         pb connected but failed to login", error.message);
        console.log("Retrying in 15 seconds...");
        await delay(15000); // Wait for 15 seconds before retrying the login
      }
    }
  });
};

// Immediately initialize the PocketBase connection and login
await pbInit();
