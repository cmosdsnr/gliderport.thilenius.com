/**
 *
 * **This server is built using Express and TypeScript. It sets up middleware and mounts various route modules
 * that collectively provide functionality for the Gliderport system.**
 *  Key features include:
 *
 * - Listing all available endpoints for debugging/documentation.
 * - Serving image-related routes.
 * - Handling text alert (email) messaging.
 * - Providing system status and info routes.
 * - Archiving and wind data routes.
 * - Sunrise/sunset data management.
 * - Hit counter functionality.
 * - Additional code-related operations.
 *
 * It also provides a basic debug endpoint to query status information from the database,
 * as well as a simple root endpoint to confirm that the server is running.
 *
 * @module GPUPDATE
 */

import dotenv from "dotenv"; // Loads environment variables from a .env file
import { pb } from "pb.js"; // PocketBase client for database operations
import { Request, Response } from "express"; // Import Express types for request/response handling
import { gpupdate } from "startExpress.js"; // Import the Express gpupdate instance

// Middleware to list all available endpoints for debugging/documentation.
import { listEndpoints } from "listEndpoints.js";
gpupdate.use(listEndpoints());

// Import and mount routes for handling image files (e.g., retrieving current images).
import { ImageRoutes } from "ImageFiles.js";
gpupdate.use(ImageRoutes());

// Import and mount routes for sending text alerts (via email).
import { textRoutes } from "./src/sendTextMessage.js";
gpupdate.use(textRoutes());

// Import and mount routes that provide system status and detailed info.
import { infoRoutes } from "info.js";
gpupdate.use(infoRoutes());

// Import and mount routes to access archived data.
import { archiveRoutes } from "archive.js";
gpupdate.use(archiveRoutes());

// Import utility to generate fixed-length IDs.
import { ToId } from "miscellaneous.js";

// Import and mount routes for sunrise/sunset data management and updates.
import { sunRoutes, sunData, updateSunData } from "sun.js";
gpupdate.use(sunRoutes());

// Import and mount routes for tracking and reporting site hit counts.
import { hitRoutes, hit } from "hitCounter.js";
gpupdate.use(hitRoutes());

// Import and mount routes for wind data and related operations.
import { windRoutes } from "wind.js";
gpupdate.use(windRoutes());

// Import and mount additional routes for code-related operations.
import { codeRoutes } from "codes.js";
gpupdate.use(codeRoutes());

// Load environment variables into process.env.
dotenv.config();

// Define API endpoints.
// Debug endpoint that queries various status fields from the PocketBase "status" collection.
gpupdate.get("/debug", async (req: Request, res: Response) => {
  const names = ["siteMessage", "siteHits", "fullForecast", "debug", "images", "online", "forecast", "sun", "lastWind"];
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
gpupdate.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript & Express!");
});
