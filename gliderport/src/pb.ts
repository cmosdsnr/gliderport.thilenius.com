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

/**
 * The global PocketBase client instance.
 *
 * Starts as `null` and is assigned a live {@link PocketBase} instance by
 * {@link pbInit} once a successful connection is established.
 * All API modules should import and use this reference rather than
 * creating their own PocketBase instances.
 */
export let pb: any = null;

/**
 * Authentication token payload returned after a successful admin login.
 *
 * Populated by {@link pbInit} after `pb.admins.authWithPassword` succeeds.
 * Remains `null` until authentication completes.
 */
export let authData: any = null;

// Load environment variables from .env file
dotenv.config();

/**
 * Returns a Promise that resolves after a specified delay.
 * Used internally by {@link pbInit} to implement retry back-off.
 *
 * @param ms - Duration to wait in milliseconds.
 * @returns  A Promise that resolves (with no value) after `ms` milliseconds.
 *
 * @example
 * await delay(15000); // pause for 15 seconds
 */
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Tests the connection to the current PocketBase instance by calling its health endpoint.
 *
 * Calls `pb.health.check()`. On success logs the health payload; on failure
 * logs an error message (suppressed on the very first attempt to avoid noisy
 * startup output).
 *
 * @param firstPass - `true` on the very first connection attempt; suppresses
 *   error logging so that the initial silent retry does not produce spurious output.
 * @returns A Promise that resolves to `true` if the health check succeeds; `false` otherwise.
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
 * Initializes the PocketBase connection and authenticates as an admin.
 *
 * Connection strategy (retried indefinitely until success):
 * 1. Attempt primary URL `http://gpdata.web:5000` (internal LAN hostname).
 * 2. If that fails, attempt fallback URL `https://gpdata.thilenius.com`.
 * 3. Wait **15 seconds** between full retry cycles if both URLs fail.
 *
 * Authentication strategy (retried indefinitely until success):
 * - Calls `pb.admins.authWithPassword` with preset credentials.
 * - Waits **5 seconds** between login retries.
 *
 * Upon success, {@link pb} holds the active `PocketBase` client and
 * {@link authData} holds the admin auth token payload.
 *
 * This function is called automatically at module load time (top-level `await`).
 *
 * @returns A Promise that resolves (with no value) once connection and login
 *   are both established.
 *
 * @throws Never rejects — all errors are caught internally and retried.
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

/**
 * Module initializer — establishes the PocketBase connection and admin session
 * at import time via a top-level `await`.
 * Importing modules will block until {@link pbInit} resolves.
 */
await pbInit();
