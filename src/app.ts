import { raw, Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

import { log } from "./log";
log("", "");

import { pb } from "./pb";
import { app } from "./startExpress";
import { connection, getLatestRawRowTime, insertRaw, getRawRecordsFromDate } from "./sql";
import { doOldUpdate } from "./oldUpdates";

const debug = false;

fs.stat("dist/app.js", (err, stats) => {
  if (err) {
    log("top level", "Error reading file stats:", err.message);
    return;
  }
  log("top level", "dist/app.js last modified:", stats.mtime);
});

dotenv.config();

let espIP: string = "192.168.88.16";
let espIPDate: number = 0;
let initialSetting: number = 0;

type SensorData = {
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

let last: SensorData = {
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
 * Converts a given string to a fixed-length ID by prepending leading zeros.
 * The resulting string will be exactly 15 characters long. If the input string is longer
 * than 15 characters, it will be truncated. If it is shorter, it will be padded with zeros.
 * All letters must be lowercase, and caps will be converted.
 *
 * @param {string} x - The input string.
 * @returns {string} A 15-character string with leading zeros.
 */
export const ToId = (x: string): string => {
  x = x.slice(0, 15);
  return "0".repeat(15 - x.length).toLowerCase() + x;
};

/**
 * Helper function that returns a Promise that resolves after a specified delay.
 *
 * @param ms - Milliseconds to delay.
 * @returns Promise<void>
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

if (!debug) {
  //wait until we can see the ESP32
  while (!initialSetting) {
    await axios
      .get("http://" + espIP + "/addData")
      .then((res) => {
        if (Object.keys(last).every((key) => key in res.data)) {
          (Object.keys(last) as (keyof SensorData)[]).forEach((key) => {
            last[key as keyof SensorData] = res.data[key];
          });
          initialSetting = Date.now();
          log("initialSetting", "ESP visible");
        }
      })
      .catch(function (error) {
        log("initialSetting", "ESP not visible at the moment... waiting 15s ...");
      });
    await delay(15000);
  }

  let lastEntryFound = false;
  let lastEntry = await getLatestRawRowTime();

  while (!lastEntryFound) {
    try {
      // Step 1: Get the latest wind record from PocketBase.
      const pbResponse = await pb.collection("wind").getList(1, 1, { sort: "-id" });
      let highestTimestamp = 0;

      if (pbResponse?.items?.length > 0) {
        const highestId = pbResponse.items[0].id;
        lastEntry = parseInt(highestId, 10);
        log("lastEntryFound", "pb wind collection last record:", lastEntry);
        lastEntryFound = true;
      } else {
        log("lastEntryFound", "No records found in PocketBase");
      }
    } catch (error: any) {
      log("lastEntryFound", "pocketbase returned an error: ", error.message);
    }
    if (!lastEntryFound) {
      log("lastEntryFound", "waiting 15s for PocketBase to be ready...");
      await delay(15000);
    }
  }

  let updating = false;

  setInterval(async () => {
    if (updating === true) {
      log("Interval", "waiting for previous update to finish");
      return;
    }
log("Interval", "starting update");
    let res: any = await axios.get("http://" + espIP + "/addData").catch((err: any) => {
      log("Interval", err.message);
    });
log("Interval", "got esp data", res.data);
    const keys = Object.keys(last);
    const hasAllKeys = keys.every((key) => key in res.data);
    if (hasAllKeys) {
      const hasChanged = keys.some((key) => last[key as keyof SensorData] !== res.data[key]);
      if (hasChanged) {
        //copy over the new data
        Object.keys(last).forEach((key) => {
          last[key as keyof SensorData] = res.data[key as keyof SensorData];
        });
        const results = await insertRaw(res.data);
       if(Array.isArray(results) && results.length > 0)
            log("Interval", "added ", results[0].affectedRows, " row to local db");
        else 
            log("Interval", "failed to add to local db: ", JSON.stringify(results));

        getRawRecordsFromDate(lastEntry).then(async (rawRows: RawReadings[]) => {
          if (Array.isArray(rawRows) && rawRows.length > 0) {
            log("Interval", "Excess local reading to transfer: " + rawRows.length + "  starting after: " + rawRows[0].epoch);
            updating = true;
            const chunkSize = 100;
            for (let i = 0; i < rawRows.length; i += chunkSize) {
              const chunk = rawRows.slice(i, i + chunkSize);
              try {
                await Promise.all(
                  chunk.map(async (rawRow: any) => {
                    const id = ToId(rawRow.epoch.toString());
                    const speed = rawRow.speed;
                    const direction = rawRow.angle;
                    const humidity = rawRow.s_count > 0 ? rawRow.s_humidity : 0;
                    const pressure = rawRow.s_pressure;
                    let temperature: number;
                    if (rawRow.r_temp_count > 0 && rawRow.r_temp_ref > 0) {
                      temperature = (40.1 * rawRow.r_temp_read) / rawRow.r_temp_ref + 27.6;
                    } else {
                      temperature = rawRow.s_temp_bmp > rawRow.s_temp_dht ? rawRow.s_temp_bmp : rawRow.s_temp_dht;
                    }
                    temperature = Math.round(10 * temperature);
                    try {
                      pb.collection("wind").create({ id, speed, direction, temperature, humidity, pressure });
                    } catch (error: any) {
                      log("Interval", "pocketbase returned an error:", error.message, "on", id);
                    }
                  })
                );
              } catch (error: any) {
                log("Interval", "failed to save to pocketbase: " + error.message);
              }
            }
            lastEntry = rawRows[rawRows.length - 1].epoch;
//await axios.get("https://gpupdate.thilenius.com/fetchNewWind");
await axios.get("https://tstupdate.thilenius.com/fetchNewWind");
            updating = false;
          } else {
            log("Interval", "No excess local reading to transfer");
          }
        });
      } else {
        log("Interval", "no new data");
      }
    } else {
      log("Interval", "invalid data");
    }
log("interval","Done with update");
    await doOldUpdate();
  }, 15000);
}
app.get("/espIP", async (req: Request, res: Response) => {
  if ("ip" in req.query && typeof req.query.ip === "string") {
    console.log("got ip: ", req.query.ip);
    espIP = req.query.ip;
    espIPDate = Date.now();
    res.send("Ok");
    console.log("espIP set to: ", espIP);
  } else {
    res.send("ip not provided");
  }
});

app.get("/stats", async (req: Request, res: Response) => {
  let response: string = "";
  if (initialSetting > 0)
    response +=
      "<p>Node did an initial reading of the ESP on " +
      new Date(initialSetting).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }) +
      "</p>";
  else response += "<p>Node has not done a successful initial reading of the ESP</p>";
  if (espIPDate > 0)
    response +=
      "<p>ESP32's last updated it's IP on " +
      new Date(espIPDate).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }) +
      " to " +
      espIP +
      "</p>";
  else response += "<p>ESP32 has not updated it's IP</p>";
  response += "<p>Node is " + (connection ? "" : "not ") + "connected to the sql database</p>";
  res.send(response);
});

// have the esp32 send me it's IP
axios
  .get("http://" + espIP + "/pingMe")
  .then((res) => {})
  .catch((err) => {});
