/**
 * ## PocketBase Integration Module
 *
 * This module manages initialization and interaction with a PocketBase backend.
 * Features:
 * - Retry logic for backend availability
 * - Admin authentication with persistent session
 * - Utility to retrieve the latest "wind" collection entry
 *
 * @module pb
 */

import PocketBase from "pocketbase";
import { log } from "./log";
import { delay } from "./init";

/**
 * Global PocketBase client instance.
 *
 * @internal This is mutable global state. Use with caution or wrap in accessors.
 */
export let pb: any = null;

/**
 * Admin authentication data returned upon successful login.
 *
 * @internal Do not expose in public interfaces. Consider wrapping for safer use.
 */
export let authData = null;

/**
 * Tests connectivity to the PocketBase backend by calling its health check API.
 *
 * @returns `true` if the connection is healthy, `false` if unreachable.
 */
async function testConnection(): Promise<boolean> {
  try {
    const health = await pb.health.check();
    log("pbInit", "✅ Connection successful:", health);
    return true;
  } catch (error: any) {
    log("pbInit", "❌ Connection failed:", error.message);
    return false;
  }
}

/**
 * Initializes the PocketBase client and attempts to connect.
 *
 * @returns A promise that resolves to the result of the health check.
 */
async function connect(): Promise<boolean> {
  const url = "https://gpdata.thilenius.com";
  pb = new PocketBase(url);
  pb.autoCancellation(false);
  return testConnection();
}

/**
 * Tests the connection and reinitializes the PocketBase client if necessary.
 *
 * @returns Promise resolving when the connection status has been verified or re-established.
 */
export async function checkConnection(): Promise<void> {
  const connected = await testConnection();
  if (!connected) connect();
}

/**
 * Initializes the PocketBase backend and performs admin login.
 *
 * Applies retry logic for both network availability and login authorization,
 * retrying every 15 seconds until both succeed.
 *
 * @returns Promise that resolves once PocketBase is connected and authenticated.
 */
const pbInit = (): Promise<void> => {
  return new Promise<void>(async (resolve) => {
    let url = "";
    let connected = false;
    let loggedIn = false;
    log("pbInit", "connecting to pocketbase...");

    while (!connected) {
      connected = await connect();
      if (!connected) {
        log("pbInit", "Retrying in 15 seconds...");
        await delay(15000);
      }
    }

    while (!loggedIn) {
      try {
        authData = await pb.admins.authWithPassword("stephen@thilenius.com", "Qwe123qwe!");
        log("pbInit", "pocketbase logged in to: " + url);
        loggedIn = true;
        resolve();
      } catch (error: any) {
        log("pbInit", "pb connected but failed to login", error.message);
        log("pbInit", "Retrying in 15 seconds...");
        await delay(15000);
      }
    }
  });
};

// Automatically initialize the PocketBase client on import
await pbInit();

/**
 * Retrieves the most recent entry from the "wind" collection.
 *
 * @returns The latest entry ID as a number, or `null` if none exists or an error occurred.
 */
const getLatest = async (): Promise<number | null> => {
  try {
    const pbResponse = await pb.collection("wind").getList(1, 1, { sort: "-id" });
    if (pbResponse?.items?.length > 0) {
      const highestId = pbResponse.items[0].id;
      const lastEntry = parseInt(highestId, 10);
      log("lastEntryFound", "pb wind collection last record:", lastEntry);
      return lastEntry;
    } else {
      log("lastEntryFound", "No records found in PocketBase");
    }
  } catch (error: any) {
    log("lastEntryFound", "pocketbase returned an error: ", error.message);
  }
  return null;
};

/**
 * Continuously attempts to retrieve the latest "wind" record from PocketBase.
 *
 * Retries every 15 seconds until a record is found.
 *
 * @returns A promise resolving to the latest entry ID.
 */
export const loadLastPocketEntry = async (): Promise<number> => {
  let lastPocketEntry: number | null = null;

  while (lastPocketEntry === null) {
    lastPocketEntry = await getLatest();
    if (lastPocketEntry === null) {
      log("lastEntryFound", "waiting 15s for PocketBase to be ready...");
      await delay(15000);
    }
  }

  return lastPocketEntry;
};
