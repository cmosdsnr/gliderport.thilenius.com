// apiRouter.ts
import express, { Request, Response, Router } from "express";
import { ImageRoutes } from "ImageFiles.js";
import { textRoutes } from "sendTextMessage.js";
import { infoRoutes } from "info.js";
import { archiveRoutes } from "archive.js";
import { sunRoutes } from "sun.js";
import { hitRoutes } from "hitCounter.js";
import { windRoutes } from "wind.js";
import { codeRoutes } from "codes.js";
import { forecastRoutes } from "openWeather.js";
import { donorsRoutes } from "donors.js";
import { streamRoutes } from "./streams.js";
import { ToId } from "miscellaneous.js"; // Utility function to convert names to IDs
import { pb } from "pb.js"; // PocketBase client for database operations

/**
 * Creates and configures the main API router by mounting various sub-routers
 * and defining core endpoints (debug and test).
 *
 * @returns A configured Express Router with all API routes mounted.
 */
export function createApiRouter(): Router {
  const router = express.Router();

  // Mount sub-routers for different API modules
  router.use(ImageRoutes());
  router.use(textRoutes());
  router.use(infoRoutes());
  router.use(archiveRoutes());
  router.use(sunRoutes());
  router.use(hitRoutes());
  router.use(windRoutes());
  router.use(codeRoutes());
  router.use(forecastRoutes());
  router.use(donorsRoutes());
  router.use(streamRoutes());

  /**
   * Debug endpoint that retrieves various status records from PocketBase.
   *
   * Iterates through a predefined list of status names, converts each to the
   * appropriate PocketBase ID using ToId(), fetches the record from the "status"
   * collection, and returns an object containing all fetched records.
   *
   * @route GET /debug
   * @returns A JSON object mapping each status name to its record data.
   */
  router.get("/debug", async (_req: Request, res: Response) => {
    const names = [
      "siteMessage",
      "siteHits",
      "fullForecast",
      "debug",
      "images",
      "online",
      "forecast",
      "sun",
      "lastWind",
    ];

    const ans: Record<string, any> = {};
    await Promise.all(
      names.map(async (name) => {
        const r = await pb.collection("status").getOne(ToId(name.toLowerCase()));
        ans[name] = r.record;
      })
    );

    res.json(ans);
  });

  /**
   * Basic test endpoint to confirm that the API server is up and running.
   *
   * @route GET /test
   * @returns A plain-text greeting indicating server health.
   */
  router.get("/test", (_req: Request, res: Response) => {
    res.send("API says Hello, TypeScript & Express!");
  });

  return router;
}
