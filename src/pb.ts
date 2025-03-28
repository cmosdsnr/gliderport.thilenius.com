/**
 * ## PocketBase Integration Module
 *
 * This module initializes and manages the connection to the PocketBase backend.
 * It handles:
 * - Attempting connection to PocketBase using retry logic
 * - Admin authentication with preset credentials
 * - Exported helper function to get the latest entry in the "wind" collection
 *
 * @module pb
 */

import PocketBase from "pocketbase";
import { log } from "./log";
import { delay } from "./init";

/**
 * Global PocketBase client instance.
 *
 * @internal Mutable state, consider using an accessor.
 */
export let pb: any = null;

/**
 * Authentication data returned after successful admin login.
 *
 * @internal Mutable state, consider using an accessor.
 */
export let authData = null;

/**
 * Tests the connection to the PocketBase instance by checking its health.
 *
 * @param firstPass - Whether this is the first connection attempt.
 * @returns Promise resolving to true if successful, false otherwise.
 */
async function testConnection(firstPass: boolean) {
  try {
    const health = await pb.health.check();
    log("pbInit", "✅ Connection successful:", health);
    return true;
  } catch (error: any) {
    if (!firstPass) log("pbInit", "❌ Connection failed:", error.message);
    return false;
  }
}

/**
 * Initializes the PocketBase client and performs admin login.
 *
 * Uses retry logic for both connection and authentication with 15-second intervals.
 *
 * @returns Promise resolving once connected and authenticated.
 */
const pbInit = () => {
  return new Promise<void>(async (resolve) => {
    let url = "";
    let connected = false;
    let loggedIn = false;
    log("pbInit", "connecting to pocketbase...");

    while (!connected) {
      url = "https://gpdata.thilenius.com";
      pb = new PocketBase(url);
      pb.autoCancellation(false);
      connected = await testConnection(false);

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

// Automatically initialize the PocketBase client
await pbInit();

/**
 * Retrieves the ID of the most recent entry from the PocketBase "wind" collection.
 *
 * @returns Promise resolving to the last entry ID, or null if unavailable.
 */
const getLatest = async () => {
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
 * Loads the last PocketBase "wind" record entry, retrying until one is found.
 *
 * @returns Promise resolving to the most recent entry ID.
 */
export const loadLastPocketEntry = async () => {
  let lastPocketEntry = null;

  while (lastPocketEntry === null) {
    lastPocketEntry = await getLatest();
    if (lastPocketEntry === null) {
      log("lastEntryFound", "waiting 15s for PocketBase to be ready...");
      await delay(15000);
    }
  }
  return lastPocketEntry;
};
