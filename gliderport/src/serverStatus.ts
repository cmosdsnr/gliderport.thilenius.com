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

/** Current online state of the monitored server. `true` once a successful HTTP response is received. */
let online: boolean = false;

/** Snapshot of {@link online} from the previous {@link updatePocketbaseStatus} call, used to detect transitions. */
let lastOnline: boolean = false;

/** URL of the ESP32 device at Gliderport, externally exposed. Polled every 60 seconds. */
const url = "http://104.36.31.118:8082/name";

/**
 * Number of consecutive failed HTTP requests to {@link url}.
 * The server is declared offline once this reaches 5.
 */
let consecutiveFailures = 0;

/**
 * Running count of successful status checks since the last failure.
 * A periodic log entry is written every 60 successful checks (i.e., every ~60 minutes).
 */
let statusCount = 0;

/**
 * Module initializer: fetches (or creates) the `"online"` status record from PocketBase,
 * seeds {@link online} from the stored value, then starts the 60-second polling interval
 * that calls {@link checkServerStatus}.
 *
 * @remarks
 * If the PocketBase fetch fails the interval is still started so monitoring begins
 * even when the database is temporarily unavailable at startup.
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
 * Persists the current {@link online} state to PocketBase.
 *
 * - Updates the `status` record with id `"online"` (creates it if missing).
 * - Appends a timestamped entry to the `isOnline` collection whenever the online
 *   state has changed since the last call (transition detection via {@link lastOnline}).
 *
 * @remarks
 * Called at the end of every {@link checkServerStatus} invocation.
 *
 * @returns A Promise that resolves once all PocketBase writes have completed.
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
