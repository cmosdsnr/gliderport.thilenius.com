/**
 * ## System Stats Routes
 *
 * Provides HTTP endpoints to inspect system status, including:
 * - Whether the ESP device has been initialized
 * - The ESP's last known IP and update timestamp
 * - SQL database connection status
 * - Basic data preview from the binary read system
 *
 * @module sqlRoutes
 */

import { Router, Request, Response } from "express";
import { getRawRecordsFromDate } from "../sql";

/**
 * Creates an Express router with system monitoring endpoints.
 *
 * @returns Express Router with `/stats` and `/tryRead` endpoints
 */
const sqlRoutes = (): Router => {
  const router = Router();

  router.get("/getRawData", async (req: Request, res: Response) => {
    // get parameter from URL
    const ts = parseInt(req.query.ts as string);
    if (isNaN(ts)) {
      res.status(400).send("Invalid timestamp");
      return;
    }
    res.json(await getRawRecordsFromDate(ts));
  });

  return router;
};

export default sqlRoutes;
