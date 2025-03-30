/**
 * ## System Stats Routes
 *
 * Provides HTTP endpoints to inspect system status, including:
 * - Whether the ESP device has been initialized
 * - The ESP's last known IP and update timestamp
 * - SQL database connection status
 * - Basic data preview from the binary read system
 *
 * @module statsRoutes
 */

import { Router, Request, Response } from "express";
import { connection } from "../sql";
import { esp } from "./esp";
import { tryRead } from "@/records/fileOps";

/**
 * Creates an Express router with system monitoring endpoints.
 *
 * @returns Express Router with `/stats` and `/tryRead` endpoints
 */
const statsRoutes = (): Router => {
  const router = Router();

  /**
   * GET `/stats`
   *
   * Returns an HTML page summarizing the system state:
   * - When the ESP was last contacted
   * - When the ESP updated its IP
   * - Whether the SQL database is connected
   */
  router.get("/stats", async (req: Request, res: Response) => {
    let response = "";

    // Display ESP visibility timestamp if known
    if (esp.Date > 0) {
      response += `<p>Node did an initial reading of the ESP on ${new Date(esp.Date).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      })}</p>`;
    } else {
      response += "<p>Node has not done a successful initial reading of the ESP</p>";
    }

    // Display last known ESP IP and when it was set
    if (esp.Date > 0) {
      response += `<p>ESP32 last updated its IP on ${new Date(esp.Date).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      })} to ${esp.IP}</p>`;
    } else {
      response += "<p>ESP32 has not updated its IP</p>";
    }

    // Show SQL database connection status
    response += `<p>Node is ${connection ? "" : "not "}connected to the SQL database</p>`;

    res.send(response);
  });

  /**
   * GET `/tryRead`
   *
   * Triggers a binary read test for a hardcoded month and year (2025-01),
   * and returns a short summary of the results.
   *
   * @returns JSON object with:
   * - total record count
   * - first and last record from the array
   */
  router.get("/tryRead", async (req: Request, res: Response) => {
    const records = await tryRead(2025, 1);
    const response: any = {
      length: records.length,
      first: records[0],
      last: records[records.length - 1],
    };
    res.send(response);
  });

  return router;
};

export default statsRoutes;
