import axios from "axios";
import { connection } from "./sql";
import { log } from "./log";

/**
 * Helper function that returns a Promise that resolves after a specified delay.
 *
 * @param ms - Milliseconds to delay.
 * @returns Promise<void>
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const updateOldWay = true;

let lastEntryFound = false;
let lastEntry = ""; // string with date '2025-03-03 12:21:30'

const timestampToString = (ts: number): string => {
  return new Date(ts * 1000)
    .toISOString()
    .replace("T", " ")
    .replace(/\.[0-9]*Z/, "");
};

if (updateOldWay) {
  while (!lastEntryFound) {
    try {
      const response = await axios.get("https://gpupdate.thilenius.com/getLastEntry");
      lastEntry = response.data;
      if (lastEntry != "Error") lastEntryFound = true;
      log("doOldUpdate", "last Entry: " + lastEntry);
    } catch (error) {
      log("doOldUpdate", "GP servers not visible at the moment");
    }
  }
  await delay(15000);
}

export const doOldUpdate = async () => {
  if (!updateOldWay) return;
  log("doOldUpdate", "Last record on thilenius.com: ", lastEntry);
  let sql =
    "SELECT reading, r_temp_count,r_temp_read, r_temp_ref, w_count, speed, angle, s_count, s_humidity, s_temp_dht, s_temp_bmp, s_pressure FROM `raw_data` WHERE `reading` > '" +
    lastEntry +
    "';";
  log("doOldUpdate", sql);
  connection?.query(sql, async (err, rawRows: any, fields) => {
    if (Array.isArray(rawRows) && rawRows.length > 0) {
      var timezone = new Date().getTimezoneOffset();
      timezone = timezone * 60;
      log("doOldUpdate", "offset in hours: " + timezone / 3600);
      log("doOldUpdate", "Excess local reading to transfer: " + rawRows.length);
      log(
        "doOldUpdate",
        "first reading to transfer: " + timestampToString(rawRows[0].reading.getTime() / 1e3 - timezone)
      );
      log("doOldUpdate", "first reading to transfer: " + (rawRows[0].reading.getTime() / 1e3 - timezone));
      let cnt = 0;
      let idx = 0;
      let newRows: any = [];
      rawRows.forEach((rawRow, i) => {
        let row = ["", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        row[0] = timestampToString(rawRow.reading.getTime() / 1e3 - timezone);
        row[1] = rawRow.speed;
        row[2] = rawRow.angle;
        if (rawRow.s_count > 0) {
          row[3] = rawRow.s_humidity;
          row[4] = rawRow.s_pressure;
        }
        let temp;
        if (rawRow.r_temp_count > 0 && rawRow.r_temp_ref > 0) {
          temp = (40.1 * rawRow.r_temp_read) / rawRow.r_temp_ref + 27.6;
        } else {
          temp = rawRow.s_temp_bmp > rawRow.s_temp_dht ? rawRow.s_temp_bmp : rawRow.s_temp_dht;
        }
        row[5] = Math.round(10 * temp);
        newRows.push(row);
        cnt++;
        if (cnt % 5e3 == 0) console.log("count: " + cnt);
      });
      log("doOldUpdate", "final count: " + cnt);
      lastEntry = newRows[newRows.length-1][0];
      if (cnt > 0)
        for (let i = 0; i <= cnt; i += 500) {
          const element = newRows.slice(i, i + 500 > cnt ? cnt : i + 500);
          log("doOldUpdate", "await " + element[0]);
          try {
            const response = await axios.post("https://gpupdate.thilenius.com/addData", { d: element });
            log("doOldUpdate", "Post addData Response: " + response.data);
          } catch (err3) {
            log("doOldUpdate", "Error: " + err3);
          }
        }
    } else {
      log("doOldUpdate", "No excess local reading to transfer");
    }
  });
};

