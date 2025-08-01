/**
 * @packageDocumentation
 *
 * **This module implements a WebSocket server for real-time updates to connected clients.**
 * - Tracks connected clients and their metadata (ID, IP, last message time).
 * - Provides functions to broadcast new wind data or images to all clients.
 * - Pings clients every 45 seconds to detect and remove stale connections.
 *
 * @module socketServer
 */

import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { WindTableRecord } from "./wind";
import fs from "fs";
import path from "path";
import { __logDir, log } from "./log";
import { DateTime } from "luxon";

// Determine the log file path.
const __LogFile = path.join(__logDir, "pings.log");

/**
 * Metadata stored for each connected WebSocket client.
 */
interface ClientMetadata {
  /** Unique client identifier (UUID v4) */
  id: string;
  /** Client IP address */
  ip: string;
  /** Timestamp (ms) of the last received message or pong */
  lastMessage: number;
}

/** Map of WebSocket connections to their metadata. */
const clients = new Map<WebSocket, ClientMetadata>();

/**
 * Logs the current number of connected clients.
 */
function updateClients(): void {
  const count = clients.size;
  log(__LogFile, "ping", "Number of clients:", count);
}

/**
 * Broadcasts new wind table records to all connected clients.
 *
 * @param records - Array of wind data records to send.
 */
export function transmitNewRecords(records: WindTableRecord[]): void {
  const payload = JSON.stringify({ command: "newRecords", records });
  for (const client of clients.keys()) {
    client.send(payload);
  }
}

/**
 * Broadcasts a new image update to all connected clients.
 *
 * @param camera - Camera number (1 or 2).
 * @param image  - Base64-encoded image data.
 * @param date   - Timestamp (ms) when the image was captured.
 */
export function transmitNewImage(camera: number, image: string, date: number): void {
  const payload = JSON.stringify({
    command: "newImage",
    imageInfo: { camera, image, date },
  });
  for (const client of clients.keys()) {
    client.send(payload);
  }
}

/**
 * Alias for `transmitNewImage`, for mobile-specific logic if needed.
 *
 * @param camera - Camera number.
 * @param image  - Base64-encoded image data.
 * @param date   - Timestamp (ms).
 */
export const transmitNewImageMobile = transmitNewImage;

/**
 * Starts a WebSocket server on the given HTTP server to handle real-time client communication.
 *
 * @param server - An HTTP server on which to mount the WebSocket server.
 */
export function socketServer(server: http.Server): void {
  const wss = new WebSocketServer({ server });
  console.log("Starting WebSocket server on port", process.env.PORT);

  wss.on("connection", (ws, req) => {
    // Generate client metadata
    const metadata: ClientMetadata = {
      id: uuidv4(),
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress?.replace(/.*:/, "") || "unknown",
      lastMessage: Date.now(),
    };
    clients.set(ws, metadata);
    updateClients();

    // Remove client on close
    ws.on("close", () => {
      clients.delete(ws);
      updateClients();
    });

    // Handle incoming messages
    ws.on("message", (msgString: string) => {
      const message = JSON.parse(msgString);
      const meta = clients.get(ws)!;
      if (meta && message.command === "pong") {
        meta.lastMessage = Date.now();
        log(__LogFile, "ping", "pong from:", meta.id);
      } else if (message.command === "fetchData") {
        // Placeholder for handling various fetchData sub-commands
        // e.g. Status, Forecast, Image1, etc.
      }
    });
  });

  // Periodically ping clients and remove those that fail to respond
  setInterval(() => {
    const now = Date.now();
    for (const [client, meta] of clients.entries()) {
      if (now - meta.lastMessage > 45_000) {
        log(__LogFile, "ping", "Client timed out:", meta.id);
        client.close();
        clients.delete(client);
      } else {
        client.send(JSON.stringify({ command: "ping" }));
      }
    }
    log(__LogFile, "ping", "Pinging clients");
  }, 45_000);

  console.log("WebSocket server is up");
}

/**
 * Generates a UUID v4 string.
 *
 * @returns A random UUID v4.
 */
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
