/**
 *
 * **This module handles wind alert notifications via email (used as text alerts).**
 * Its responsibilities include:
 *
 * - Maintaining an in-memory list of target users (those who have enabled alerts).
 * - Synchronizing user settings from the database and subscribing to real-time updates.
 * - Scheduling a daily reset of the alert "sent" status so that alerts can be reissued.
 * - Checking current wind conditions and sending alerts if the conditions meet user thresholds.
 * - Providing Express routes for testing and interacting with the alert system.
 *
 * Dependencies:
 * - Express: To define API endpoints.
 * - pb (PocketBase): For database access and real-time user subscriptions.
 * - transporter (from sendMeEmail): For sending email-based text alerts.
 * - node-cron: To schedule the daily reset job.
 * - getWindAverage (from wind): To retrieve current wind metrics.
 * - logStr, writeLog: Utility functions for logging alert activities.
 *
 * Exported Functions:
 * - syncTextUsers: Initializes the list of target users and subscribes to database changes.
 * - checkAndSendTexts: Evaluates wind conditions and sends alerts when criteria are met.
 * - sendTextMessage: Constructs and sends an email-based text alert.
 * - textRoutes: Returns an Express router with endpoints for testing and interacting with the alert system.
 *
 * @module sendTextMessages
 */

import { Request, Response, Router } from "express";
import { pb } from "./pb";
import { transporter } from "./sendMeEmail";
import cron from "node-cron";
import { getWindAverage } from "./wind";
import { logStr, writeLog } from "log.js";

type mailOptionsType = {
  from: string;
  name: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

type Targets = {
  [userId: string]: {
    address: string;
    direction: number;
    duration: number;
    errorAngle: number;
    speed: number;
    name: string;
    sent: number;
  };
};

const targets: Targets = {};

/**
 * Resets the "sent" flag for each target user.
 * The "sent" flag indicates if an alert has already been issued.
 * Resetting this flag allows alerts to be re-sent on a new day.
 */
const resetTextUsers = () => {
  Object.keys(targets).forEach((targetKey) => {
    targets[targetKey].sent = 0;
  });
};

// Schedule the resetTextUsers job to run at 02:00 every day in LA time.
cron.schedule("0 2 * * *", resetTextUsers, { timezone: "America/Los_Angeles" });

/**
 * Synchronizes target users (those with text alerts enabled) from the database.
 * It fetches a full list of users with "textMe" enabled and then subscribes to
 * real-time changes so that the in-memory `targets` object is kept up to date.
 */
export const syncTextUsers = () => {
  try {
    pb.collection("users")
      .getFullList(2000, {
        filter: "textMe = true",
      })
      .then((users: any[]) => {
        for (const user of users) {
          targets[user.id] = {
            address: user.settings.address,
            direction: user.settings.direction,
            duration: user.settings.duration,
            errorAngle: user.settings.errorAngle,
            speed: user.settings.speed,
            name: user.firstName ? user.firstName : "User",
            sent: 0,
          };
        }
        // Subscribe to real-time changes in the users collection.
        pb.collection("users").subscribe("*", (e: any) => {
          const user = e.record;
          if (user && (e.action === "create" || e.action === "update")) {
            if (user.textMe === true) {
              targets[user.id] = {
                address: user.settings.address,
                direction: user.settings.direction,
                duration: user.settings.duration,
                errorAngle: user.settings.errorAngle,
                speed: user.settings.speed,
                name: user.firstName ? user.firstName : "User",
                sent: 0,
              };
            } else {
              // Remove users who no longer have text alerts enabled.
              delete targets[user.id];
            }
          }
        });
      });
  } catch (error: any) {
    console.error("Error syncing text users", error.message);
  }
};

// Initialize the target user synchronization on startup.
syncTextUsers();

/**
 * Checks current wind conditions and sends alert messages if they meet user thresholds.
 * It iterates through each target user and compares the measured wind data with their settings.
 * When conditions are met and an alert has not been sent, a text alert is dispatched and the target's
 * "sent" flag is updated to the current timestamp.
 */
export const checkAndSendTexts = () => {
  const log: string[] = [""];
  let sentMessage = false;
  const check = getWindAverage();

  Object.keys(targets).forEach(async (targetKey) => {
    const target = targets[targetKey];
    const targetSpeed = check[target.duration].speed;
    const targetDir = check[target.duration].direction;
    // Map the duration index to an actual duration value (0, 5, or 15 minutes)
    const duration = [0, 5, 15][target.duration];

    if (!target.sent && targetSpeed >= target.speed && Math.abs(270 - targetDir) <= target.errorAngle) {
      sentMessage = true;
      sendTextMessage(log, target.address, target.name, {
        speed: targetSpeed,
        direction: targetDir,
        duration: duration,
      });
      target.sent = new Date().getTime();
    }
  });
  if (sentMessage) writeLog(log);
};

/**
 * Sends a text alert message via email.
 * Constructs the email message using either test text (when data is null)
 * or actual wind data. The email is formatted as HTML when sending real data.
 *
 * @param log - An array to collect log messages.
 * @param to - The recipient's email address.
 * @param name - The recipient's name.
 * @param data - The wind data for the alert; if null, a test message is sent.
 */
export const sendTextMessage = (log: string[], to: string, name: string, data: any) => {
  var mailOptions: mailOptionsType = {
    from: "glider.port.wind.alert@gmail.com",
    name: "Gliderport Wind",
    to: to,
    subject: "",
  };

  if (data === null) {
    mailOptions.text = `Hi ${name}, This message is a test from the gliderport`;
  } else {
    mailOptions.html =
      `${name}, Time to Fly!\n` +
      `Wind was at ${data.direction} deg at ${data.speed} mph over the past ${data.duration} min, ` +
      "\nMake changes to your alert <a href='https://gliderport.thilenius.com'>here</a>";
  }
  // For testing, the actual email send is skipped.
  if (0) {
    logStr(log, "sendTextMessage", "Skipped Email send to:", to);
  } else {
    transporter.sendMail(mailOptions, function (error: any, info) {
      if (error) {
        logStr(log, "sendTextMessage", "Email sent to:", to, "returned:", error.message);
      } else {
        logStr(log, "sendTextMessage", "Email sent to:", to, "returned:", info.response);
      }
    });
  }
};

/**
 * Creates and returns an Express router with endpoints for testing the text alert system.
 *
 * Endpoints:
 * - GET /PhoneFinder: Accepts query parameters (area, prefix, number) to look up phone carrier info.
 * - GET /sendTestSms: Triggers a test text alert by calling sendTextMessage with null data.
 * - GET /testWindSpeeds: Returns current wind average data as JSON.
 *
 * @returns {Router} An Express router with the defined endpoints.
 */
export const textRoutes = (): Router => {
  const router = Router();

  // Endpoint: /PhoneFinder
  // Purpose: Find out the carrier of a phone number by querying an external service.
  router.get("/PhoneFinder", (req: Request, res: Response) => {
    if ("area" in req.query && "prefix" in req.query && "number" in req.query) {
      // Example URL: https://www.fonefinder.net/findome.php?npa=530&nxx=613&thoublock=5388&usaquerytype=Search+by+Number
      const url =
        `https://www.fonefinder.net/findome.php?npa=${req.query.area}&nxx=${req.query.prefix}` +
        `&thoublock=${req.query.number}&usaquerytype=Search+by+Number`;
      fetch(url)
        .then((response) => response.text())
        .then((responseText) => {
          // Extract carrier info from the returned HTML response.
          const secondTablePosition = responseText.split("<TABLE", 1).join("<TABLE").length;
          responseText = responseText.slice(secondTablePosition, responseText.length - 1);
          const secondTrPosition = responseText.split("<TR", 2).join("<TR").length;
          responseText = responseText.slice(secondTrPosition, responseText.length - 1);
          const secondTdPosition = responseText.split("<TD", 5).join("<TD").length;
          responseText = responseText.slice(secondTdPosition, responseText.length - 1);
          responseText = responseText.replace(/<TD><A HREF=\'http:\/\/fonefinder.net\//, "");
          responseText = responseText.replace(/\.php\'.*/, "");
          responseText = responseText.split("\n")[0];
          responseText = responseText.split("\r")[0];
          res.send(responseText);
        });
    } else {
      res.send("none");
    }
  });

  // Endpoint: /sendTestSms
  // Purpose: Trigger a test text alert. Expects query parameters 'to' and 'name'.
  router.get("/sendTestSms", (req: Request, res: Response) => {
    if (
      "to" in req.query &&
      "name" in req.query &&
      typeof req.query.to === "string" &&
      typeof req.query.name === "string"
    ) {
      const log: string[] = [];
      sendTextMessage(log, req.query.to, req.query.name, null);
      res.send(log[0]);
    } else {
      res.send("did not get name & to");
    }
  });

  // Endpoint: /testWindSpeeds
  // Purpose: Return the current wind average data (for testing).
  router.get("/testWindSpeeds", (req: Request, res: Response) => {
    const check = getWindAverage();
    res.json(check);
  });

  return router;
};
