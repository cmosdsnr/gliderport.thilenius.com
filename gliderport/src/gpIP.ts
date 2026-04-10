/**
 * @packageDocumentation
 *
 * **This module manages the GliderPort IP update functionality.**
 *
 * - Provides an endpoint to capture the caller's IP address.
 * - Verifies the IP address by performing a health check on port 8081.
 * - Updates the IP address in the PocketBase `miscellaneous` collection.
 *
 * @module gpIPRouter
 */
import express, { Request, Response, NextFunction, Router } from "express";
import { pb } from "./pb";
import { registerEndpoint } from "./endpointRegistry";

/**
 * Creates and returns an Express `Router` that exposes Gliderport IP management endpoints.
 *
 * | Method | Path    | Description                                                                    |
 * |--------|---------|--------------------------------------------------------------------------------|
 * | GET    | /setIP  | Reads the caller's public IP, verifies port 8081 is reachable, updates the    |
 * |        |         | `"000gliderportip"` record in the PocketBase `status` collection.              |
 *
 * @remarks
 * The IP is extracted from the `x-forwarded-for` header when the server sits behind a proxy,
 * falling back to `req.socket.remoteAddress`. IPv4-mapped IPv6 addresses (`::ffff:…`) are
 * normalised to plain IPv4 form before the health check.
 *
 * @returns A configured Express `Router` instance.
 *
 * @example
 * ```ts
 * import express from "express";
 * import { gpIPRoutes } from "./gpIP";
 *
 * const app = express();
 * app.use("/gp", gpIPRoutes());
 * // → GET /gp/setIP
 * ```
 */
export function gpIPRoutes(): Router {
  const router = express.Router();

  /**
   * GET /setIP
   *
   * 1. Determines the caller's public IP (supports proxies via `x-forwarded-for`).
   * 2. Performs an HTTP health check against `http://<ip>:8081` with a 5-second timeout.
   * 3. On success, writes `{ ip, timestamp }` to the `"000gliderportip"` record in the
   *    PocketBase `status` collection and returns the same payload as JSON.
   *
   * @returns
   * - `200 { ip, timestamp }` — IP recorded successfully.
   * - `400 { error }` — caller IP could not be determined.
   * - `502 { error }` — health check on port 8081 failed.
   * - `500 { error }` — unexpected server error.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/setIP",
    group: "System",
    signature: "setIP: () => { ip: string; timestamp: string }",
    description:
      "Reads the caller's public IP, verifies port 8081 is reachable, and updates the Gliderport IP record in PocketBase.",
    pathTemplate: "GET /gpapi/setIP",
  });
  router.get("/setIP", async (req: Request, res: Response) => {
    try {
      let ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";
      if (ip.includes(",")) {
        ip = ip.split(",")[0].trim();
      }
      if (ip.startsWith("::ffff:")) {
        ip = ip.substring(7);
      }

      if (!ip) {
        res.status(400).json({ error: "Could not determine IP" });
        return;
      }

      // Check that http://ip:8081 responds to a http request
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const host = ip.includes(":") ? `[${ip}]` : ip;
        await fetch(`http://${host}:8081`, { signal: controller.signal });
        clearTimeout(timeout);
      } catch (err) {
        console.error(`Health check failed for ${ip}:8081`, err);
        res.status(502).json({ error: `Service unreachable at ${ip}:8081` });
        return;
      }

      // Update the record with ID "000gliderportip" in the "status" collection.
      await pb.collection("status").update("000gliderportip", {
        record: {
          ip: ip,
          timestamp: new Date().toISOString(),
        },
      });
      res.json({ ip, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error setting GPIp:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
