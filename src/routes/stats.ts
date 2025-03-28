/**
 * ## System Stats Routes
 *
 * Provides HTTP endpoints to inspect system status, including:
 * - Whether the ESP device has been initialized
 * - The ESP's last known IP and update timestamp
 * - SQL database connection status
 *
 * @module statsRoutes
 */

import { Router, Request, Response } from "express";
import { connection } from "../sql";
import { esp } from "./esp";

/**
 * Creates an Express router with system monitoring endpoints.
 *
 * @returns Express Router with `/stats` route
 */
const statsRoutes = (): Router => {
  const router = Router();

  /**
   * GET `/stats`
   *
   * Returns an HTML string summarizing:
   * - When the ESP was first successfully contacted
   * - When the ESP last updated its IP address
   * - Whether the Node app is connected to the SQL database
   */
  router.get("/stats", async (req: Request, res: Response) => {
    let response = "";

    if (esp.Date > 0) {
      response += `<p>Node did an initial reading of the ESP on ${new Date(esp.Date).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      })}</p>`;
    } else {
      response += "<p>Node has not done a successful initial reading of the ESP</p>";
    }

    if (esp.Date > 0) {
      response += `<p>ESP32 last updated its IP on ${new Date(esp.Date).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      })} to ${esp.IP}</p>`;
    } else {
      response += "<p>ESP32 has not updated its IP</p>";
    }

    response += `<p>Node is ${connection ? "" : "not "}connected to the SQL database</p>`;

    res.send(response);
  });

  return router;
};

export default statsRoutes;
