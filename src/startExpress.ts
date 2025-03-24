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
 * - Import the exported `gpupdate` variable to access the configured Express application.
 * - The `startExpress` function is automatically called to start the server.
 * @module  startExpress
 */

import express, { Request, Response, NextFunction, Router } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";

export var gpupdate: any | null = null;

/**
 * Initializes and starts the Express server.
 *
 * Sets up middleware for URL encoding, CORS, static file serving, and JSON parsing.
 * Also installs error-handling middleware to catch and respond to errors consistently.
 *
 * @returns {void}
 */
export const startExpress = (): void => {
  gpupdate = express();

  // Define the port to listen on, defaulting to 1234 if not specified in the environment.
  const port = process.env.PORT || 1234;

  // Start the server and log the running status.
  gpupdate.listen(port, () => {
    console.log(` `);
    console.log(`######################################################`);
    console.log(`         Server is running at http://localhost:${port}`);
    console.log(`######################################################`);
  });

  // Parse URL-encoded bodies with a limit of 30mb.
  gpupdate.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // Configure CORS options to allow requests from specified origins.
  const corsOptions = {
    origin: [/gliderport.*thilenius.*/, /localhost.*/, /.*/],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204.
  };
  gpupdate.use(cors(corsOptions));

  // Serve static files from the "/app/gliderport" directory.
  gpupdate.use(express.static("/app/gliderport"));

  // (Optional) Enable file uploads with specific limits.
  // const options: fileUpload.Options = {
  //   createParentPath: true,
  //   limits: {
  //     fileSize: 2 * 1024 * 1024 * 1024, // 2GB max file size.
  //   },
  // };
  // gpupdate.use(fileUpload(options));

  // Parse JSON bodies with a limit of 10mb.
  gpupdate.use(bodyParser.json({ limit: "10mb" }));
  // Parse URL-encoded bodies with a limit of 10mb.
  gpupdate.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  // Error-handling middleware to catch errors and return standardized responses.
  gpupdate.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err); // Log error details on the server.
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "Payload too large", details: err.message });
    }
    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  });
};

// Automatically start the Express server.
startExpress();
