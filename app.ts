/**
 * @packageDocumentation
 *
 * **Main application entry point for the Gliderport server.**
 *
 * Responsibilities:
 * - Load environment variables and set timezone.
 * - Configure Express app with body parsing, CORS, and optional file upload.
 * - Mount diagnostics (listEndpoints) and API routes under `/api`.
 * - Serve static assets (images, docs, frontend SPA) from disk.
 * - Provide SPA fallback to `index.html` for client-side routing.
 * - Centralized error handling for payload limits and other errors.
 * - Initialize HTTP and WebSocket servers.
 *
 * @module app
 */
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";

import { socketServer } from "socket";
import { createApiRouter } from "apiRouter";
import { listEndpoints } from "listEndpoints";
import { __dirname } from "miscellaneous";

// Load environment variables and set timezone
dotenv.config();
process.env.TZ = "America/Los_Angeles";

/** Port to listen on (from env or default 3000) */
const PORT = process.env.PORT || 3000;

/** Express application instance */
export const app = express();

app.set("trust proxy", true);

// -----------------------------------------------------------------------------
/**
 * Body parsing middleware.
 * - Parses URL-encoded data (form submissions).
 * - Parses JSON bodies up to 10MB.
 */
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// -----------------------------------------------------------------------------
/**
 * CORS configuration:
 * - Allows origins matching gliderport.thilenius.com, localhost, or any.
 * - Returns HTTP 200 on successful preflight.
 */
const corsOptions = {
  origin: [/gliderport.*thilenius.*/, /localhost.*/, /.*/],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// -----------------------------------------------------------------------------
/**
 * Diagnostic route: lists all registered endpoints under `/api/listEndpoints`.
 */
app.use("/gpapi", listEndpoints(app));

/**
 * Mounts the main API router under `/api`.
 */
app.use("/gpapi", createApiRouter());

// -----------------------------------------------------------------------------
/**
 * Verify required static directories exist; exit if missing.
 */
["images", "docs", "gp_dist"].forEach((dir) => {
  const fullPath = path.join(__dirname, dir === "images" ? "/gliderport/images" : `/${dir}`);
  if (!fs.existsSync(fullPath)) {
    console.error(`Directory ${fullPath} does not exist.`);
    process.exit(1);
  }
});

console.log(`Serving images from ${__dirname}/gliderport/images`);
console.log(`Serving documents from ${__dirname}/docs`);
console.log(`Serving front end assets from t ${__dirname}/gp_dist`);

/** Serve static assets */
app.use("/images", express.static(path.join(__dirname, "/gliderport/images")));
app.use("/stream", express.static(path.join(__dirname, "/gliderport/stream")));

//back end docs (generated in gliderportFrontWEnd)
app.use("/docs/frontend", express.static(path.join(__dirname, "/docs_frontend")));
//back end docs (generated in gp3_pi3_server)
app.use("/docs/gp_server", express.static(path.join(__dirname, "/docs_gp_server")));
//back end docs (generated in gliderport)
app.use("/docs/backend", express.static(path.join(__dirname, "/docs")));

app.use("/", express.static(path.join(__dirname, "/gp_dist")));

// -----------------------------------------------------------------------------
/**
 * Single-page application (SPA) fallback.
 * Redirects all unmatched routes to `index.html`.
 */
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "/gp_dist/index.html"));
});

// -----------------------------------------------------------------------------
/**
 * Global error handler.
 * - Catches "Payload too large" errors and returns 413.
 * - Logs other errors and returns 500.
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large", details: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// -----------------------------------------------------------------------------
/**
 * Create HTTP server and attach WebSocket server.
 */
const server = http.createServer(app);
socketServer(server);

/** Start listening for HTTP and WebSocket connections. */
server.listen(PORT, () => {
  console.log(`\n######################################################`);
  console.log(`         Server is running at http://localhost:${PORT}`);
  console.log(`######################################################`);
});
