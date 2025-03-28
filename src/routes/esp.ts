/**
 * ## ESP Route Module
 *
 * Handles communication with the ESP device over HTTP:
 * - Polls the `/addData` endpoint for new sensor data
 * - Waits for device visibility on startup
 * - Provides an endpoint to override the ESP's IP address
 *
 * @module espRoutes
 */

import { Router, Request, Response } from "express";
import axios from "axios";
import { log } from "@/log";
import { delay } from "@/init";

/**
 * Mutable object containing the current ESP IP and the last update timestamp.
 */
export const esp = {
  IP: "192.168.88.16",
  Date: 0,
};

/**
 * Interface for a full sensor reading from the ESP.
 */
export type SensorData = {
  speed: number;
  angle: number;
  count: number;
  tc: number;
  t: number;
  tr: number;
  c: number;
  h: number;
  dt: number;
  bt: number;
  p: number;
};

/**
 * Last received sensor reading from the ESP, used to detect changes.
 */
const last: SensorData = {
  speed: -1,
  angle: -1,
  count: -1,
  tc: -1,
  t: -1,
  tr: -1,
  c: -1,
  h: -1,
  dt: -1,
  bt: -1,
  p: -1,
};

/**
 * Fetches new sensor data from the ESP, if available and changed.
 *
 * @returns The latest sensor data if valid and changed, or null otherwise.
 */
export const getESPdata = async (): Promise<SensorData | null> => {
  let res;
  try {
    res = await axios.get(`http://${esp.IP}/addData`);
  } catch (err: any) {
    log("Interval", err.message);
    return null;
  }

  const keys = Object.keys(last) as (keyof SensorData)[];
  const hasAllKeys = keys.every((k) => k in res.data);
  const hasChanged = keys.some((k) => last[k] !== res.data[k]);

  if (!hasAllKeys) {
    log("Interval", "invalid data");
    return null;
  }
  if (!hasChanged) {
    log("Interval", "no new data");
    return null;
  }

  keys.forEach((key) => {
    last[key] = res.data[key];
  });

  return last;
};

/**
 * Polls the ESP until it becomes responsive at `/addData`,
 * then initializes `last` sensor values and sets the timestamp.
 *
 * @returns The timestamp of when the ESP became visible
 */
async function waitForEspVisibility(): Promise<void> {
  while (1) {
    try {
      const res = await axios.get("http://" + esp.IP + "/addData");
      if ((Object.keys(last) as (keyof SensorData)[]).every((key) => key in res.data)) {
        (Object.keys(last) as (keyof SensorData)[]).forEach((key) => {
          last[key] = res.data[key];
        });
        esp.Date = Date.now();
        log("initialSetting", "ESP visible");
        return;
      }
    } catch (error) {
      log("initialSetting", "ESP not visible at the moment... waiting 15s ...");
    }
    await delay(15000);
  }
}

// Run ESP visibility check on module load
await waitForEspVisibility();

/**
 * Creates a router with routes for ESP-specific configuration.
 *
 * @returns Express Router instance with `/espIP` route.
 */
const espRoutes = (): Router => {
  const router = Router();

  /**
   * GET `/espIP`
   *
   * Updates the IP address used to contact the ESP device.
   * Requires a query param `?ip=<new-ip>`
   */
  router.get("/espIP", (req: Request, res: Response) => {
    if ("ip" in req.query && typeof req.query.ip === "string") {
      esp.IP = req.query.ip;
      esp.Date = Date.now();
      console.log("espIP set to:", esp.IP);
      res.send("Ok");
    } else {
      res.send("ip not provided");
    }
  });

  return router;
};

// Optional one-time ping to tell ESP our IP (if its default is correct)
axios
  .get("http://" + esp.IP + "/pingMe")
  .then((res) => {})
  .catch((err) => {});

export default espRoutes;
