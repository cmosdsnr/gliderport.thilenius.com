/**
 * ## Initializes and configures the Express server for the application.
 *
 * This module creates an Express application, sets up various middleware including body parsing,
 * CORS, and static file serving, and defines error handling middleware. The server listens on the
 * port specified in the environment variable PORT (or defaults to 1234). Optionally, file upload
 * middleware can be enabled by uncommenting the corresponding code.
 *
 * Dependencies:
 * - express: Web framework for Node.js.
 * - body-parser: Middleware for parsing JSON and URL-encoded request bodies.
 * - cors: Middleware for enabling Cross-Origin Resource Sharing.
 * - express-fileupload: (Optional) Middleware for handling file uploads.
 *
 * Usage:
 * - Import the exported `app` variable to access the configured Express application.
 * - The `startExpress` function is automatically called to start the server.
 * @module  startExpress
 */

import express, { Request, Response, NextFunction, Router } from "express";
import cors from "cors";

export var app: any | null = null;

/**
 * Initializes and starts the Express server.
 *
 * Sets up middleware for URL encoding, CORS, static file serving, and JSON parsing.
 * Also installs error-handling middleware to catch and respond to errors consistently.
 *
 * @returns {void}
 */
export const startExpress = (): void => {
  app = express();

  // Define the port to listen on, defaulting to 1234 if not specified in the environment.
  const port = process.env.PORT || 1234;

  // Start the server and log the running status.
  app.listen(port, () => {
    console.log(` `);
    console.log(`######################################################`);
    console.log(`         Server is running at http://localhost:${port}`);
    console.log(`######################################################`);
  });

  // Parse URL-encoded bodies with a limit of 30mb.
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // Configure CORS options to allow requests from specified origins.
  const corsOptions = {
    origin: [/gliderport.*thilenius.*/, /localhost.*/],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204.
  };
  app.use(cors(corsOptions));
};

// Automatically start the Express server.
startExpress();
