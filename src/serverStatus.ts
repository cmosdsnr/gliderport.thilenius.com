/**
 * @packageDocumentation
 *
 * **This module monitors the online status of a remote server by periodically checking its availability**
 * via HTTP requests. It updates the online status in the PocketBase `status` collection and logs any
 * status changes in the `isOnline` collection. The module tracks consecutive failures to determine when
 * the server goes offline and creates new records when the status changes.
 *
 * @module serverStatus
 */

import { pb } from "pb.js";
import { ToId } from "miscellaneous.js";

let online: boolean = false;
let lastOnline: boolean = false;
const url = "http://104.36.31.118:8082/name"; //esp32 at gliderport externally exposed.
let consecutiveFailures = 0;
let statusCount = 0;

/**
 * Initializes the online status by fetching the "online" status record from PocketBase.
 * If no record exists, creates one with the default offline state. Then starts the periodic
 * check of server status every minute.
 */
pb.collection("status")
  .getOne(ToId("online"))
  .then(async (result: any) => {
    if (!result || !result.record) {
      // No existing record: create with default values
      console.log('No status record found for "online". Creating it now.');
      const timestamp = Math.floor(Date.now() / 1000);
      await pb.collection("status").create({
        id: ToId("online"),
        record: { isOnline: online, touched: timestamp },
      });
    } else {
      // Initialize from existing record
      online = result.record.isOnline;
    }
    // Start periodic status checks
    setInterval(checkServerStatus, 60 * 1000);
  })
  .catch((err: any) => {
    console.error("Error initializing server status:", err.message);
    // Still start periodic checks even if init failed
    setInterval(checkServerStatus, 60 * 1000);
  });

/**
 * Checks the remote server's availability by sending an HTTP GET request with a 4-second timeout.
 *
 * - On success: resets the failure counter and marks the server as online if it was offline.
 * - On failure: increments the failure counter; if it reaches 5 consecutive failures while the server
 *   was previously online, marks the server as offline.
 * - After each check, updates PocketBase with the current status.
 *
 * @returns A Promise that resolves once the status has been checked and updated.
 */
async function checkServerStatus(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      if (statusCount % 60 === 0) console.log("server status: OK");
      statusCount++;
      consecutiveFailures = 0;
      if (!online) {
        console.log(`Server came online at ${url}`);
        online = true;
        pb.collection("networkStatus").create({ id: ToId((Date.now() / 1000).toString()), online: true });
      }
    } else {
      throw new Error(`HTTP status ${response.status}`);
    }
  } catch (error: any) {
    statusCount = 0;
    clearTimeout(timeoutId);
    console.error("server status error:", error);
    consecutiveFailures++;
    console.log("Failure count:", consecutiveFailures);

    if (consecutiveFailures >= 5 && online) {
      console.log(`Server went offline at ${url}`);
      online = false;
      pb.collection("networkStatus").create({ id: ToId((Date.now() / 1000).toString()), online: false });
    }
  }
  updatePocketbaseStatus();
}

/**
 * Updates the PocketBase `status` record for "online" with the current online state and timestamp.
 * If no status record exists, creates one. Also logs a new record in the `isOnline` collection whenever
 * the online status changes.
 *
 * @returns A Promise that resolves once PocketBase has been updated.
 */
async function updatePocketbaseStatus(): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);

  // Attempt to update existing status record
  try {
    await pb.collection("status").update(ToId("online"), {
      record: { isOnline: online, touched: timestamp },
    });
  } catch {
    // If update fails (record missing), create it
    console.log('Creating missing "online" status record.');
    await pb.collection("status").create({
      id: ToId("online"),
      record: { isOnline: online, touched: timestamp },
    });
  }

  // If the online status has changed since last update, log it to the `isOnline` collection
  if (online !== lastOnline) {
    await pb.collection("isOnline").create({
      id: ToId(timestamp.toString()),
      record: { online, touched: timestamp },
    });
    lastOnline = online;
  }
}
