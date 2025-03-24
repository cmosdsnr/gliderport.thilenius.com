/**
 * **This module monitors the online status of a remote server by periodically checking its availability
 * via an HTTP request. It updates the online status in the PocketBase "status" collection and logs any
 * status changes in the "isOnline" collection. The module tracks consecutive failures to determine when
 * the server goes offline and creates new records when the status changes.**
 *
 * Key Responsibilities:
 * - Initialize the online status from the PocketBase "status" record.
 * - Periodically check the remote server using fetch with a timeout.
 * - Update the PocketBase "status" record with the current online state and timestamp.
 * - Create a new record in the "isOnline" collection when the server's online status changes.
 *
 * @module serverStatus
 */

import { pb } from "pb.js";
import { ToId } from "miscellaneous.js";

let online: boolean = false;
let lastOnline: boolean = false;
const url = "http://104.36.31.118:8080/";
let consecutiveFailures = 0;

// Initialize online status by fetching the "online" status record from PocketBase.
pb.collection("status")
  .getOne(ToId("online"))
  .then((result: any) => {
    if (result.length === 0) {
      console.log('No status record found with name "online". Creating it now.');
      const timestamp = Math.floor(new Date().getTime() / 1000);
      pb.collection("status").create({ name: "online", record: { isOnline: online, touched: timestamp } });
    } else {
      online = result.record.isOnline;
    }
    // Check server status every minute.
    setInterval(checkServerStatus, 60000);
  });

/**
 * Checks the remote server's status by sending an HTTP request.
 *
 * Uses an AbortController to set a 4-second timeout on the request. If the request succeeds,
 * the failure counter is reset and the online status is set to true if it was previously false.
 * If the request fails repeatedly (5 consecutive failures), the online status is set to false.
 * After checking, the function updates the PocketBase status record.
 *
 * @returns {Promise<void>} A promise that resolves when the status check and update are complete.
 */
async function checkServerStatus(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  try {
    console.log("Checking server status...");
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    consecutiveFailures = 0;
    if (!online) {
      // Server has just come online.
      online = true;
      console.log("Server came online at " + url);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    consecutiveFailures++;
    console.log("Failure count:", consecutiveFailures);
    if (consecutiveFailures >= 5 && online) {
      // Server has gone offline.
      online = false;
      console.log("Server went offline at " + url);
    }
  }
  await updatePocketbaseStatus();
}

/**
 * Updates the PocketBase status record in the "status" collection (with id corresponding to "online")
 * and creates a new record in the "isOnline" collection if the online status has changed.
 *
 * The status record's `record` field is updated with the current online status and the current
 * timestamp (in seconds). If no existing status record is found, one is created.
 * If the online status has changed since the last update, a new record is created in the "isOnline" collection.
 *
 * @returns {Promise<void>} A promise that resolves when the status update is complete.
 */
async function updatePocketbaseStatus(): Promise<void> {
  // Get the current timestamp in seconds.
  const timestamp = Math.floor(new Date().getTime() / 1000);

  // Fetch the status record where id equals the fixed-length version of "online".
  let statusResult = await pb.collection("status").getList(1, 1, {
    filter: `id = ${ToId("online")}`,
  });

  if (statusResult.items.length === 0) {
    console.log('No status record found with name "online". Creating it now.');
    await pb.collection("status").create({ name: "online", record: { isOnline: online, touched: timestamp } });
    statusResult = await pb.collection("status").getList(1, 1, {
      filter: 'name = "online"',
    });
  } else {
    // Update the existing status record with the current status and timestamp.
    await pb.collection("status").update(ToId("online"), {
      record: { isOnline: online, touched: timestamp },
    });
  }

  // If the online status has changed, create a new record in the "isOnline" collection.
  if (online !== lastOnline) {
    await pb.collection("isOnline").create({
      id: ToId(timestamp.toString()),
      online,
    });
    lastOnline = online;
  }
}
