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
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import { socketServer } from "./socket.js"; // Import the socket server setup

import fs from "fs";
import path from "path";

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

  // create the server but don’t start it yet
  const server = http.createServer(app);

  // attach WebSocket to the very same server
  socketServer(server);

  // Start the server and log the running status.
  server.listen(port, () => {
    console.log(` `);
    console.log(`######################################################`);
    console.log(`         Server is running at http://localhost:${port}`);
    console.log(`######################################################`);
  });

  // Parse URL-encoded bodies with a limit of 30mb.
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // Configure CORS options to allow requests from specified origins.
  const corsOptions = {
    origin: [/gliderport.*thilenius.*/, /localhost.*/, /.*/],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204.
  };
  app.use(cors(corsOptions));

  // In-memory counters
  interface IPCounts {
    [ip: string]: number;
  }

  const hitCount = { total: 0 };
  const ipCounts: IPCounts = {};

  const STREAM_ROUTE = "/stream";
  const STREAM_DIR = "/app/gliderport/stream";
  const LOG_FILE = "/app/gliderport/stream/stream_access.log";

  // Middleware to count hits and log access
  app.use(STREAM_ROUTE, (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const filePath = req.path;

    // Increment total hits
    hitCount.total++;
    // Increment per-IP count
    ipCounts[ip] = (ipCounts[ip] || 0) + 1;

    // Append log entry
    const logLine = `${new Date().toISOString()} ${ip} ${filePath}\n`;
    fs.appendFile(LOG_FILE, logLine, (err) => {
      if (err) console.error("Failed to write log:", err);
    });

    next();
  });

  // Serve static files under /stream
  app.use(STREAM_ROUTE, express.static(STREAM_DIR));

  app.get("/stats", (_req: Request, res: Response) => {
    res.json({ totalHits: hitCount.total, byIP: ipCounts });
  });

  app.use("/images", express.static("/app/gliderport/images"));
  // Stats endpoint

  // Serve static files from the "/app/docs" directory.
  app.use("/docs", express.static("/app/docs"));
  app.use("/", express.static("/app/gp_dist"));

  // (Optional) Enable file uploads with specific limits.
  // const options: fileUpload.Options = {
  //   createParentPath: true,
  //   limits: {
  //     fileSize: 2 * 1024 * 1024 * 1024, // 2GB max file size.
  //   },
  // };
  // app.use(fileUpload(options));

  // Parse JSON bodies with a limit of 10mb.
  app.use(bodyParser.json({ limit: "10mb" }));
  // Parse URL-encoded bodies with a limit of 10mb.
  app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

  // Error-handling middleware to catch errors and return standardized responses.
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err); // Log error details on the server.
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "Payload too large", details: err.message });
    }
    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
  });
};

// Automatically start the Express server.
startExpress();
