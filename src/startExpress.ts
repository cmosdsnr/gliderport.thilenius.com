/**
 * ## Express Server Setup
 *
 * This module sets up and starts an Express server. It configures:
 * - CORS policy for known origins
 * - Body parsing for URL-encoded requests
 * - Automatic route registration
 *
 * The server listens on a port specified by the `PORT` environment variable (default: 1234).
 *
 * @module startExpress
 */

import express from "express";
import cors from "cors";
import { log } from "./log";
import { registerRoutes } from "./routes";

/**
 * The initialized Express app instance.
 * Automatically set by `startExpress()`.
 */
export var app: any | null = null;

/**
 * Initializes and starts the Express server.
 *
 * - Configures middleware for body parsing and CORS
 * - Starts listening on the specified port
 * - Logs startup status to the log file
 */
export const startExpress = (): void => {
  app = express();

  const port = process.env.PORT || 1234;

  app.listen(port, () => {
    log("StartServer", ` `);
    log("StartServer", `######################################################`);
    log("StartServer", `         Server is running at http://localhost:${port}`);
    log("StartServer", `######################################################`);
  });
  //server the docs folder
  registerRoutes(app);
  app.use("/docs", express.static("docs")); // available at /docs/index.html etc.

  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  const corsOptions = {
    origin: [/gliderport.*thilenius.*/, /localhost.*/],
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
};

// Start the server and register application routes
startExpress();
