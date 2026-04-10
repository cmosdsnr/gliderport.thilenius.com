/**
 * @packageDocumentation
 *
 * **This module handles wind alert notifications via email (used as text alerts).**
 *
 * It provides functionality to:
 * - Maintain an in-memory list of users who have enabled wind alerts.
 * - Synchronize user settings from PocketBase and subscribe to real-time updates.
 * - Schedule a daily reset of the alert “sent” status.
 * - Check current wind conditions against user-defined thresholds and send alerts when met.
 * - Expose Express routes for testing and interacting with the alert system.
 *
 * ## Dependencies
 * - `express`: To define HTTP endpoints.
 * - `pocketbase` (`pb`): For database access and real-time subscriptions.
 * - `nodemailer` (`transporter`): For sending email-based text alerts.
 * - `node-cron`: To schedule the daily reset job.
 * - `getWindAverage` (from `wind`): To retrieve current wind metrics.
 * - Logging utilities: `logStr`, `writeLog` for recording alert activity.
 *
 * @module sendTextMessages
 */

import { Request, Response, Router } from "express";
import { pb } from "pb";
import { registerEndpoint } from "endpointRegistry";
import { transporter } from "sendMeEmail";
import cron from "node-cron";
import { getWindAverage } from "wind";
import { __logDir, logStr, writeLog } from "log";
import path from "path";

const __LogFile = path.join(__logDir, "gliderport.log");

/**
 * Options passed to the nodemailer `sendMail` call.
 *
 * @remarks
 * Either `text` (plain-text body) or `html` (HTML body) should be provided,
 * but not both at the same time.
 */
type MailOptions = {
  /** Sender email address. */
  from: string;
  /** Display name for the sender. */
  name: string;
  /** Recipient email address (or SMS gateway address). */
  to: string;
  /** Subject line of the message. */
  subject: string;
  /** Optional plain-text body. */
  text?: string;
  /** Optional HTML body. */
  html?: string;
};

/**
 * Represents a user who has opted in to wind alert notifications.
 *
 * @remarks
 * Each user entry is keyed by PocketBase user ID in the {@link targets} map.
 * The `sent` field prevents duplicate alerts within the same day.
 */
interface UserTarget {
  /** SMS gateway or email address to send the alert to. */
  address: string;
  /** Preferred wind direction in degrees (e.g., 270 for west). */
  direction: number;
  /** Index into the averaging window: 0 = instantaneous, 1 = 5 min, 2 = 15 min. */
  duration: number;
  /** Acceptable angular deviation from `direction` in degrees. */
  errorAngle: number;
  /** Minimum wind speed (mph) required to trigger an alert. */
  speed: number;
  /** User's first name, used to personalise the alert message. */
  name: string;
  /** UNIX timestamp (ms) of the last sent alert, or `0` if no alert has been sent today. */
  sent: number;
}

/**
 * In-memory map of opted-in users, keyed by PocketBase user ID.
 * Populated and kept current by {@link syncTextUsers}.
 */
const targets: Record<string, UserTarget> = {};

/**
 * Resets the `sent` flag for all target users,
 * allowing alerts to be re-sent after a new day begins.
 *
 * @remarks
 * Called automatically by the cron job scheduled at 02:00 AM Los Angeles time.
 * Not exported — managed internally by the module.
 */
const resetTextUsers = (): void => {
  Object.values(targets).forEach((t) => {
    t.sent = 0;
  });
};

/** Daily cron job that calls {@link resetTextUsers} at 02:00 AM (America/Los_Angeles). */
cron.schedule("0 2 * * *", resetTextUsers, { timezone: "America/Los_Angeles" });

/**
 * Synchronizes the in-memory {@link targets} map with PocketBase users who have `textMe = true`.
 * Also subscribes to real-time create/update events on the `users` collection so the map
 * stays current without requiring a server restart.
 *
 * @remarks
 * Called automatically on module load. Users with `textMe = false` are removed from the map
 * when an update event is received. Errors during initial fetch are logged to the console.
 */
export const syncTextUsers = (): void => {
  pb.collection("users")
    .getFullList(2000, { filter: "textMe = true" })
    .then((users: any[]) => {
      users.forEach((user) => {
        targets[user.id] = {
          address: user.settings.address,
          direction: user.settings.direction,
          duration: user.settings.duration,
          errorAngle: user.settings.errorAngle,
          speed: user.settings.speed,
          name: user.firstName || "User",
          sent: 0,
        };
      });
      // Subscribe to create/update events
      pb.collection("users").subscribe("*", (e: any) => {
        const u = e.record;
        if (u && (e.action === "create" || e.action === "update")) {
          if (u.textMe) {
            targets[u.id] = {
              address: u.settings.address,
              direction: u.settings.direction,
              duration: u.settings.duration,
              errorAngle: u.settings.errorAngle,
              speed: u.settings.speed,
              name: u.firstName || "User",
              sent: 0,
            };
          } else {
            delete targets[u.id];
          }
        }
      });
    })
    .catch((err: any) => {
      console.error("Error syncing text users:", err.message);
    });
};

/** Kick off target synchronization immediately on module load. */
syncTextUsers();

/**
 * Checks the current wind conditions against each user's alert thresholds.
 * Sends an email-based text alert via {@link sendTextMessage} when all of the following are true:
 * - The user has not already been alerted today (`sent === 0`).
 * - The averaged wind speed meets or exceeds the user's `speed` threshold.
 * - The averaged wind direction is within the user's `errorAngle` of their preferred `direction`.
 *
 * @remarks
 * Wind data is retrieved using {@link getWindAverage}. If any alerts are sent, the full log
 * is written to the gliderport log file via {@link writeLog}.
 *
 * @returns `void` — results are side-effectful (email delivery + log write).
 */
export const checkAndSendTexts = (): void => {
  const log: string[] = [""];
  let anySent = false;
  const windData = getWindAverage();

  Object.entries(targets).forEach(([userId, t]) => {
    const avg = windData[t.duration];
    const durationMinutes = [0, 5, 15][t.duration];
    const meetsSpeed = avg.speed >= t.speed;
    const inDirection = Math.abs(270 - avg.direction) <= t.errorAngle;

    if (!t.sent && meetsSpeed && inDirection) {
      anySent = true;
      sendTextMessage(log, t.address, t.name, {
        speed: avg.speed,
        direction: avg.direction,
        duration: durationMinutes,
      });
      t.sent = Date.now();
    }
  });

  if (anySent) {
    writeLog(__LogFile, log);
  }
};

/**
 * Constructs and sends an email-based text alert via the shared {@link transporter}.
 *
 * When `data` is provided the message contains an HTML summary of the wind reading.
 * When `data` is `null` a plain-text test message is sent instead.
 *
 * @param log    - Mutable array used to collect log lines for this send action.
 * @param to     - Recipient email address (or carrier SMS gateway address).
 * @param name   - Recipient’s first name, used to personalise the greeting.
 * @param data   - Live wind reading to include in the alert body, or `null` for a test message.
 * @returns `void` — delivery is asynchronous; results are appended to `log`.
 *
 * @example
 * ```ts
 * const log: string[] = [];
 * sendTextMessage(log, "5551234567@txt.att.net", "Alice", {
 *   speed: 18,
 *   direction: 265,
 *   duration: 5,
 * });
 * ```
 */
export const sendTextMessage = (
  log: string[],
  to: string,
  name: string,
  data: { speed: number; direction: number; duration: number } | null,
): void => {
  const mailOptions: MailOptions = {
    from: "glider.port.wind.alert@gmail.com",
    name: "Gliderport Wind",
    to,
    subject: data ? `Wind Alert: ${data.speed} mph @ ${data.direction}°` : "Test Alert from Gliderport",
  };

  if (!data) {
    mailOptions.text = `Hi ${name},\nThis is a test alert from the gliderport wind system.`;
  } else {
    mailOptions.html = [
      `<p>Hi ${name},</p>`,
      `<p><strong>Wind was at ${data.direction}° at ${data.speed} mph</strong> over the past ${data.duration} min.</p>`,
      `<p><a href="https://gliderport.thilenius.com">Change alert settings</a></p>`,
    ].join("");
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      logStr(log, "sendTextMessage", "Failed to send to:", to, error.message);
    } else {
      logStr(log, "sendTextMessage", "Sent to:", to, info.response);
    }
  });
};

/**
 * Creates and returns an Express `Router` exposing the text-alert management endpoints.
 *
 * | Method | Path              | Description                                                     |
 * |--------|-------------------|-----------------------------------------------------------------|
 * | GET    | /PhoneFinder      | Looks up the carrier for a US phone number via fonefinder.net.  |
 * | GET    | /sendTestSms      | Sends a test alert to a specified address and name.             |
 * | GET    | /testWindSpeeds   | Returns the current wind averages for 0, 5, and 15-min windows. |
 *
 * @returns A configured Express `Router` instance.
 *
 * @example
 * ```ts
 * import express from "express";
 * import { textRoutes } from "./sendTextMessage";
 *
 * const app = express();
 * app.use("/alerts", textRoutes());
 * // → GET /alerts/sendTestSms?to=…&name=…
 * ```
 */
export const textRoutes = (): Router => {
  const router = Router();

  /**
   * GET /PhoneFinder
   *
   * Queries an external service to identify the phone carrier.
   * Required query params: `area`, `prefix`, `number`.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/PhoneFinder",
    group: "Notifications",
    signature: "PhoneFinder: (area: string, prefix: string, number: string) => string",
    description: "Queries fonefinder.net to identify the carrier for a US phone number.",
    pathTemplate: "GET /gpapi/PhoneFinder?area=<area>&prefix=<prefix>&number=<number>",
  });
  router.get("/PhoneFinder", (req: Request, res: Response) => {
    const { area, prefix, number } = req.query;
    if (typeof area === "string" && typeof prefix === "string" && typeof number === "string") {
      const url = `https://www.fonefinder.net/findome.php?npa=${area}&nxx=${prefix}&thoublock=${number}&usaquerytype=Search+by+Number`;
      fetch(url)
        .then((r) => r.text())
        .then((html) => {
          // Parse out carrier info from HTML response
          let snippet = html.split("<TABLE")[1] || "";
          snippet = snippet.split("<TR")[2] || "";
          snippet = snippet.split("<TD")[5] || "";
          snippet = snippet.replace(/<[^>]+>/g, "").trim();
          res.send(snippet);
        })
        .catch(() => res.send("error"));
    } else {
      res.send("none");
    }
  });

  /**
   * GET /sendTestSms
   *
   * Sends a test SMS alert to the specified `to` and `name`.
   * Query params: `to`, `name`.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/sendTestSms",
    group: "Notifications",
    signature: "sendTestSms: (name: string, to: string) => string",
    description: "Sends a test SMS message to the given recipient address.",
    pathTemplate: "GET /gpapi/sendTestSms?name=<name>&to=<to>",
  });
  router.get("/sendTestSms", (req: Request, res: Response) => {
    const to = req.query.to as string;
    const name = req.query.name as string;
    if (to && name) {
      const log: string[] = [];
      sendTextMessage(log, to, name, null);
      res.send(log[0] || "sent");
    } else {
      res.send("missing to or name");
    }
  });

  /**
   * GET /testWindSpeeds
   *
   * Returns the current wind averages for durations [0,5,15] minutes.
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/testWindSpeeds",
    group: "Notifications",
    signature: "testWindSpeeds: () => Array<{ speed: number; direction: number }>",
    description: "Returns the current wind averages for the 0, 5, and 15-minute windows used by the alert system.",
    pathTemplate: "GET /gpapi/testWindSpeeds",
  });
  router.get("/testWindSpeeds", (_req: Request, res: Response) => {
    res.json(getWindAverage());
  });

  return router;
};
