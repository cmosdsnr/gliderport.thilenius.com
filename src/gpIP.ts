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

/**
 * Returns a new Express `Router` that exposes endpoints for IP management.
 *
 * Routes:
 * - `GET /setGPIP`: Detects caller IP, validates availability on port 8081, and updates DB.
 *
 * @returns An Express `Router` instance.
 */
export function gpIPRoutes(): Router {
  const router = express.Router();

  /**
   * GET /setGPIP
   *
   * 1. Determines the caller's public IP.
   * 2. Performs a health check (HTTP GET) on the IP at port 8081.
   * 3. If successful, updates the `000gliderportip` record in the `miscellaneous` collection.
   */
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
        ip: ip,
        timestamp: new Date().toISOString(),
      });
      res.json({ success: true, ip });
    } catch (error) {
      console.error("Error setting GPIp:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  return router;
}
