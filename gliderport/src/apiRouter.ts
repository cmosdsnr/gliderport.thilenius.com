/**
 * @packageDocumentation
 *
 * **Main API router factory for the Gliderport server.**
 *
 * Exports {@link createApiRouter}, which assembles all feature sub-routers
 * and a handful of core endpoints under a single Express `Router`.
 * The resulting router is mounted at `/gpapi` by `app.ts`.
 *
 * ## Mounted sub-routers
 * | Factory          | Feature area                    |
 * |------------------|---------------------------------|
 * | `ImageRoutes`    | Image browsing & metadata       |
 * | `textRoutes`     | SMS / text-message sending      |
 * | `infoRoutes`     | Site information                |
 * | `archiveRoutes`  | Historical data archives        |
 * | `sunRoutes`      | Sunrise/sunset calculations     |
 * | `hitRoutes`      | Page-hit counters               |
 * | `windRoutes`     | Wind sensor data                |
 * | `codeRoutes`     | Access / promo codes            |
 * | `forecastRoutes` | OpenWeather forecast data       |
 * | `donorsRoutes`   | Donor records                   |
 * | `streamRoutes`   | Live video stream management    |
 * | `gpIPRoutes`     | ESP32 IP registration           |
 *
 * @module apiRouter
 */
import express, { Request, Response, Router } from "express";
import { registerEndpoint } from "endpointRegistry";
import { ImageRoutes } from "ImageFiles";
import { textRoutes } from "sendTextMessage";
import { infoRoutes } from "info";
import { archiveRoutes } from "archive";
import { sunRoutes } from "sun";
import { hitRoutes } from "hitCounter";
import { windRoutes } from "wind";
import { codeRoutes } from "codes";
import { forecastRoutes } from "openWeather";
import { donorsRoutes } from "donors";
import { streamRoutes } from "streams";
import { gpIPRoutes } from "gpIP";
/** Converts a human-readable status name to its PocketBase record ID. */
import { ToId } from "miscellaneous";
/** Authenticated PocketBase client used to query the `status` collection. */
import { pb } from "pb";

/**
 * Creates and configures the main API router.
 *
 * Instantiates each feature sub-router via its factory function, mounts them
 * on a shared Express `Router`, and adds the `/debug` and `/test` core
 * endpoints before returning the fully assembled router.
 *
 * @returns A configured Express {@link Router} with all API routes mounted.
 *
 * @example
 * ```ts
 * import { createApiRouter } from "apiRouter";
 * app.use("/gpapi", createApiRouter());
 * ```
 */
export function createApiRouter(): Router {
  const router = express.Router();

  // Mount feature sub-routers
  router.use(ImageRoutes()); // /images, /image, etc.
  router.use(textRoutes()); // /sendText
  router.use(infoRoutes()); // /info
  router.use(archiveRoutes()); // /archive
  router.use(sunRoutes()); // /sun
  router.use(hitRoutes()); // /hit
  router.use(windRoutes()); // /wind
  router.use(codeRoutes()); // /codes
  router.use(forecastRoutes()); // /forecast
  router.use(donorsRoutes()); // /donors
  router.use(streamRoutes()); // /streams
  router.use(gpIPRoutes()); // /espIP

  /**
   * Fetches a snapshot of all key status records from PocketBase.
   *
   * Iterates over a fixed list of well-known status names, converts each to
   * its PocketBase record ID via {@link ToId}, fetches the record from the
   * `"status"` collection in parallel, and returns all results as a single
   * JSON object.
   *
   * @route   GET /debug
   * @returns JSON object whose keys are the status names and values are the
   *   corresponding PocketBase record payloads.
   *
   * @example
   * // Response shape:
   * // {
   * //   "siteMessage": { ... },
   * //   "siteHits":    { ... },
   * //   "fullForecast":{ ... },
   * //   ...
   * // }
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/debug",
    group: "System",
    signature: "debug: () => Record<string, any>",
    description: "Returns a snapshot of all key status records from PocketBase — useful for server state inspection.",
    pathTemplate: "GET /gpapi/debug",
  });
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
      }),
    );

    res.json(ans);
  });

  /**
   * Health-check endpoint for the API server.
   *
   * Returns a plain-text greeting that confirms the Express + TypeScript server
   * is running and reachable. No authentication required.
   *
   * @route   GET /test
   * @returns `200 OK` with body `"API says Hello, TypeScript & Express!"`.
   *
   * @example
   * // curl http://localhost:3000/gpapi/test
   * // → API says Hello, TypeScript & Express!
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/test",
    group: "System",
    signature: "test: () => string",
    description: "Health-check endpoint. Confirms the Express + TypeScript server is running and reachable.",
    pathTemplate: "GET /gpapi/test",
  });
  router.get("/test", (_req: Request, res: Response) => {
    res.send("API says Hello, TypeScript & Express!");
  });

  return router;
}
