import { Request, Response } from "express";
import dotenv from "dotenv";
import mysql from "mysql2";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import { pb } from "./pb";
import { connection } from "./sql";
import { app } from "./startExpress";

fs.stat("./app.js", (stats: any) => {
  if (stats?.mtime) console.log("app.js last modified: " + stats.mtime);
  else console.log("app.js didn't get fs info");
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

while (!initialSetting) {
  axios
    .get("http://" + espIP + "/addData")
    .then((res) => {
      if (Object.keys(last).every((key) => key in res.data)) {
        (Object.keys(last) as (keyof SensorData)[]).forEach((key) => {
          last[key as keyof SensorData] = res.data[key];
        });
        initialSetting = Date.now();
      }
    })
    .catch(function (error) {
      console.log("ESP not visible at the moment... waiting 15s ...");
    });
  delay(15000);
}

let lastEntryFound = false;
let lastEntry = 0;

while (!lastEntryFound) {
  try {
    // Step 1: Get the latest wind record from PocketBase.
    const pbResponse = await pb.collection("wind").getList(1, 1, { sort: "-id" });
    let highestTimestamp = 0;

    if (pbResponse?.items?.length > 0) {
      const highestId = pbResponse.items[0].id;
      lastEntry = parseInt(highestId, 10);
      lastEntryFound = true;
    } else {
      console.log("No records found in PocketBase");
    }
  } catch (error: any) {
    console.log("pocketbase returned an error: ", error.message);
  }
  if (!lastEntryFound) {
    console.log("waiting 15s for PocketBase to be ready...");
    delay(15000);
  }
}

setInterval(async () => {
  let res: any = await axios.get("http://" + espIP + "/addData").catch((err: any) => {
    console.log(err.message);
  });
  const keys = Object.keys(last);
  const hasAllKeys = keys.every((key) => key in res.data);
  if (hasAllKeys) {
    const hasChanged = keys.some((key) => last[key as keyof SensorData] !== res.data[key]);
    if (hasChanged) {
      //copy over the new data
      Object.keys(last).forEach((key) => {
        last[key as keyof SensorData] = res.data[key as keyof SensorData];
      });
      const { speed, angle, count, tc, t, tr, c, h, dt, bt, p } = res.data;

      let sql = `INSERT INTO raw_data (
                speed, angle, w_count, r_temp_count, r_temp_read, r_temp_ref,
                s_count, s_humidity, s_temp_dht, s_temp_bmp, s_pressure
              ) VALUES (
                ${speed}, ${angle}, ${count}, ${tc}, ${t}, ${tr},
                ${c}, ${h}, ${Math.round(dt * 10)}, ${Math.round(bt * 10)}, ${Math.round(p - 101325)}
              );`;

      let results: any = await connection
        ?.promise()
        .query(sql)
        .catch((err: any) => {
          console.log("failed to save to local dB: " + err.message);
        });
      console.log("added " + results?.affectedRows + " row to local db");

      sql =
        "SELECT " +
        "reading, r_temp_count,r_temp_read, r_temp_ref, w_count, speed, angle, s_count, " +
        "s_humidity, s_temp_dht, s_temp_bmp, s_pressure " +
        "FROM `raw_data` WHERE `reading` > '" +
        lastEntry +
        "';";
      connection?.query(sql, async (err: any, rawRows: RawReadings[], fields: any) => {
        if (Array.isArray(rawRows) && rawRows.length > 0) {
          console.log("Excess local reading to transfer: " + rawRows.length);
          console.log(
            "first reading to transfer: " +
              rawRows[0].reading.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
          );
          rawRows.forEach((rawRow: RawReadings, i) => {
            const id = ToId(Math.floor(rawRow.reading.getTime() / 1000).toString());
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
              lastEntry = rawRow.reading.getTime();
            } catch (error: any) {
              console.log("pocketbase returned an error: ", error.message);
            }
          });
        } else {
          console.log("No excess local reading to transfer");
        }
      });
    } else {
      console.log("no new data");
    }
  } else {
    console.log("invalid data");
  }
}, 15000);

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
