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
import { pb } from "./pb";
import { transporter } from "./sendMeEmail";
import cron from "node-cron";
import { getWindAverage } from "./wind";
import { logStr, writeLog } from "log.js";

type MailOptions = {
  from: string;
  name: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

interface UserTarget {
  address: string;
  direction: number;
  duration: number;
  errorAngle: number;
  speed: number;
  name: string;
  sent: number; // UNIX timestamp of last sent alert, or 0 if none
}

const targets: Record<string, UserTarget> = {};

/**
 * Resets the `sent` flag for all target users,
 * allowing alerts to be re-sent after a new day begins.
 */
const resetTextUsers = (): void => {
  Object.values(targets).forEach((t) => {
    t.sent = 0;
  });
};

// Schedule daily reset at 02:00 AM in Los Angeles time.
cron.schedule("0 2 * * *", resetTextUsers, { timezone: "America/Los_Angeles" });

/**
 * Synchronizes the in-memory `targets` list with PocketBase users who have `textMe = true`.
 * Also subscribes to real-time changes to keep the list up to date.
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

// Initialize target synchronization on startup.
syncTextUsers();

/**
 * Checks the current wind conditions against each user's thresholds.
 * Sends alerts via email if criteria are met and the user hasn't been alerted today.
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
    writeLog(log);
  }
};

/**
 * Constructs and sends an email-based text alert.
 *
 * @param log    - Array to collect log messages for this action.
 * @param to     - Recipient email address.
 * @param name   - Recipient’s name (for personalization).
 * @param data   - Wind data for the alert:
 *                 `{ speed, direction, duration }`. If `null`, sends a test message.
 */
export const sendTextMessage = (
  log: string[],
  to: string,
  name: string,
  data: { speed: number; direction: number; duration: number } | null
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
 * Creates an Express Router exposing endpoints for testing the text alert system.
 *
 * @returns An Express `Router` with:
 *  - GET `/PhoneFinder`     → Looks up phone carrier info by query params.
 *  - GET `/sendTestSms`     → Sends a test SMS alert to the given `to` and `name`.
 *  - GET `/testWindSpeeds`  → Returns current wind average data.
 */
export const textRoutes = (): Router => {
  const router = Router();

  /**
   * GET /PhoneFinder
   *
   * Queries an external service to identify the phone carrier.
   * Required query params: `area`, `prefix`, `number`.
   */
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
  router.get("/testWindSpeeds", (_req: Request, res: Response) => {
    res.json(getWindAverage());
  });

  return router;
};
