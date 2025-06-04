// apiRouter.ts
import express, { Request, Response } from "express";
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

export function createApiRouter() {
  const router = express.Router();

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

  // Define API endpoints.
  // Debug endpoint that queries various status fields from the PocketBase "status" collection.
  router.get("/debug", async (req: Request, res: Response) => {
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
    let ans: any = {};
    await Promise.all(
      names.map(async (name) => {
        const r = await pb.collection("status").getOne(ToId(name.toLowerCase()));
        ans = { name: r.record };
      })
    );
    res.json(ans);
  });

  // Basic root endpoint to confirm that the server is running.
  router.get("/test", (req: Request, res: Response) => {
    res.send("API says Hello, TypeScript & Express!");
  });

  return router;
}
