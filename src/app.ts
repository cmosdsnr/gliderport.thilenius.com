/**
 * ## Main Application Loop
 *
 * This module bootstraps the application by:
 * - Importing and initializing setup routines
 * - Repeatedly executing data sync and update logic every 15 seconds
 *
 * @module app
 */

import "./startExpress";
import { runSyncCycle } from "./syncCycle";
import { doOldUpdate } from "./oldUpdates";
import "./init";
import "./records/records";

/**
 * Starts the main execution loop.
 *
 * This loop:
 * - Runs `runSyncCycle()` to fetch and sync fresh data
 * - Runs `doOldUpdate()` to update stale or missed entries
 * - Repeats every 15 seconds
 */
setInterval(async () => {
  await runSyncCycle();
  await doOldUpdate();
}, 15000);
