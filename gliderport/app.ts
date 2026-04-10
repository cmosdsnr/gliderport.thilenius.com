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
import { __dirname } from "log";

import "serverStatus";

// Load environment variables and set timezone
dotenv.config();
process.env.TZ = "America/Los_Angeles";

/**
 * Port the HTTP server listens on.
 * Reads from the `PORT` environment variable; falls back to `3000`.
 */
const PORT = process.env.PORT || 3000;

/**
 * The Express application instance.
 * Exported so that the HTTP server and tests can reference it directly.
 */
export const app = express();

app.set("trust proxy", true);

// -----------------------------------------------------------------------------
/**
 * Body-parsing middleware.
 * - Parses URL-encoded form data (extended syntax, up to 30 MB).
 * - Parses JSON request bodies up to 10 MB.
 * - Parses URL-encoded bodies a second time via `body-parser` (legacy compatibility, 10 MB limit).
 */
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// -----------------------------------------------------------------------------
/**
 * CORS configuration object passed to the `cors` middleware.
 *
 * Permitted origins (matched by regex):
 * - Any subdomain of `thilenius.com` containing `gliderport`.
 * - Any `localhost` origin (development).
 * - Any other origin (open fallback; tighten for production if needed).
 *
 * Successful pre-flight OPTIONS requests receive HTTP `200` instead of `204`.
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
 * Guards that all required static-asset directories exist on disk.
 * Iterates over `["images", "stream", "docs", "frontend"]` and calls
 * `process.exit(1)` with a descriptive error if any directory is absent.
 * This prevents the server from starting in a misconfigured state.
 */
["images", "stream", "docs", "frontend"].forEach((dir) => {
  const fullPath = path.join(__dirname, `/gliderport/${dir}`);
  if (!fs.existsSync(fullPath)) {
    console.error(`Directory ${fullPath} does not exist.`);
    process.exit(1);
  }
});

console.log(`Serving images from ${__dirname}/gliderport/images`);
console.log(`Serving documents from ${__dirname}/gliderport/docs`);
console.log(`Serving front end assets from ${__dirname}/gliderport/frontend`);

/**
 * Static-asset routes.
 *
 * | URL prefix | Disk path                          |
 * |------------|------------------------------------|
 * | `/images`  | `<root>/gliderport/images`         |
 * | `/stream`  | `<root>/gliderport/stream`         |
 * | `/docs`    | `<root>/gliderport/docs`           |
 * | `/bin`     | `<root>/gliderport/bin`            |
 * | `/`        | `<root>/gliderport/frontend` (SPA) |
 */
app.use("/images", express.static(path.join(__dirname, "/gliderport/images")));
app.use("/stream", express.static(path.join(__dirname, "/gliderport/stream")));
app.use("/docs", express.static(path.join(__dirname, "/gliderport/docs")));
app.use("/bin", express.static(path.join(__dirname, "/gliderport/bin")));
app.use("/", express.static(path.join(__dirname, "/gliderport/frontend")));

// -----------------------------------------------------------------------------
/**
 * SPA catch-all route.
 *
 * For any `GET` request that does not match a prior static or API route, this
 * handler sends `frontend/index.html` so that React Router can take over
 * client-side navigation.
 *
 * @param _req - Incoming request (unused).
 * @param res  - Express response used to send the HTML file.
 */
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "/gliderport/frontend/index.html"));
});

// -----------------------------------------------------------------------------
/**
 * Global Express error handler (four-argument signature required by Express).
 *
 * Intercepts errors passed via `next(err)` anywhere in the middleware chain:
 * - `entity.too.large` — body-parser payload-limit violation → HTTP `413`.
 * - All other errors → HTTP `err.status` (if set) or `500`.
 *
 * @param err   - The error object forwarded from a previous middleware or route.
 * @param _req  - Incoming request (unused).
 * @param res   - Express response used to send the error JSON.
 * @param _next - Express next function (required to identify this as an error handler).
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
 * Underlying Node.js HTTP server wrapping the Express `app`.
 * The same server instance is shared with the WebSocket upgrade handler so
 * that both HTTP and WS traffic use the same port.
 */
const server = http.createServer(app);

/**
 * Attaches the WebSocket server to the HTTP server.
 * After this call, `upgrade` events on `server` are handled by `socketServer`.
 */
socketServer(server);

/**
 * Starts the HTTP (and WebSocket) server on `PORT`.
 * Logs the bound address to stdout once the port is open.
 */
server.listen(PORT, () => {
  console.log(`\n######################################################`);
  console.log(`         Server is running at http://localhost:${PORT}`);
  console.log(`######################################################`);
});
