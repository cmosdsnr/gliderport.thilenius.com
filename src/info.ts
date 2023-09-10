import mysql from "mysql2";
import { timestampToString, timestampToLocalString, toHMS } from "./timeConversion";
import { globals } from "./globals";

export const info = async (connection: mysql.Connection): Promise<string> => {
  let content = "<p><table>";
  content += `<tr><td>last Record in gliderport table:</td><td>${globals.lastRecord}</td></tr><tr></tr>`;
  if (globals.firstRecord === null) {
    content += `<tr><td>Most recent addData at:</td><td>Never Called</td></tr>`;
    content += `<tr><td>First Record of last added:</td><td>Never Called</td></tr>`;
    content += `<tr><td>Number of Records added:</td><td>Never Called</td></tr>`;
  } else {
    content += `<tr><td>Most recent addData at:</td><td>${globals.tdLast.toDateString()}</td></tr>`;
    content += `<tr><td>First Record of last added:</td><td>${globals.firstRecord}</td></tr>`;
    content += `<tr><td>Number of Records added:</td><td>${globals.numberRecords}</td></tr>`;
  }
  if (globals.latestHours === 0) content += `<tr><td>Latest Hours table timestamp is:</td><td>Never Called</td></tr>`;
  else
    content += `<tr><td>Latest Hours table timestamp is:</td><td>${globals.latestHours}</td><td>${timestampToString(
      globals.latestHours
    )}</td></tr>`;
  content += `</table></p>`;

  let sql = "SELECT * FROM `hours` ORDER BY start DESC";
  let results = await connection.promise().query(sql);
  let hrs = [] as { start: number; data: string }[];

  if (Array.isArray(results) && Array.isArray(results[0])) hrs = results[0] as { start: number; data: string }[];
  content += `<h3>Hours has ${hrs.length} entries</h3>`;
  content += `<p><table style="text-align: center;">`;
  content += `<tr><th>Hour Start</th><th>Hours count</th><th>Gliderport count</th></tr>`;
  let l: [number, number][] = [];
  hrs.forEach((v, i) => {
    const d = JSON.parse(v.data) as { start: number; date: number[] };
    l.push([v.start, d.date.length]);
  });
  for (let i = 0; i < l.length; i++) {
    const v = l[i];
    //   l.forEach(async (v, i) => {
    sql =
      "SELECT COUNT(*) as count FROM gliderport WHERE recorded >= '" +
      timestampToString(v[0]) +
      "' AND recorded < '" +
      timestampToString(v[0] + 3600) +
      "'";
    results = await connection.promise().query(sql);
    // console.log(results[0][0].count);
    let numRecords = Array.isArray(results) && Array.isArray(results[0]) ? results[0][0].count : 0;
    content += `<tr><td>${timestampToString(v[0]).replace("00:00", "00")}</td><td>${
      v[1]
    }</td><td>${numRecords}</td></tr>`;
    if (i === l.length - 1) content += `</table></p>`;
  }

  content += `<h3>Server Sent Table</h3>`;
  sql = "SELECT * FROM `server_sent` WHERE `id`=1";
  results = await connection.promise().query(sql);
  if (Array.isArray(results) && Array.isArray(results[0])) {
    const r = results[0][0] as ServerSentTable;
    content += `<p><table>`;
    const tsNow = Math.floor(new Date().getTime() / 1000);
    content += `<tr><td><b>Now</b></td><td>(${tsNow})  <b>${timestampToString(tsNow)}</b></td></tr><tr></tr>`;
    for (const [key, value] of Object.entries(results[0])) {
      if (key === "sun") {
        let s = JSON.parse(r.sun);
        Object.keys(s).forEach((k) => {
          content += `<tr><td>${k}</td><td>${timestampToLocalString(s[k])}</td></tr>`;
        });
      } else if ("last_record" === key || "last_image" === key || "last_forecast" === key) {
        let deltaStr = "";
        let delta = tsNow - value;
        let end = "ago";
        if (delta < 0) {
          delta = -delta;
          end = "from now";
        }
        if (delta > 3600) {
          deltaStr += Math.floor(delta / 3600) + " hr, ";
          delta -= 3600 * Math.floor(delta / 3600);
        }
        if (delta > 60) {
          deltaStr += Math.floor(delta / 60) + " min, ";
          delta -= 60 * Math.floor(delta / 60);
        }
        deltaStr += Math.floor(delta) + " sec " + end;
        content += `<tr><td>${key}</td><td>(${value})  <b>${timestampToString(value)}</b>   (${deltaStr})</td></tr>`;
      } else content += `<tr><td>${key}</td><td>${value}</td></tr>`;
    }
    content += `</table></p>`;
  }
  content += `<h3>Code History Table (last 10 overview)</h3><p>`;
  sql = "SELECT * FROM code_history ORDER BY date DESC LIMIT 10";
  results = await connection.promise().query(sql);
  if (Array.isArray(results) && Array.isArray(results[0])) {
    let res: CodeHistoryTable[] = results[0] as CodeHistoryTable[];
    content += `<table>`;
    res.forEach((v, i) => {
      const r: CodeHistoryData = { date: v.date, data: JSON.parse(v.data) };
      content += `<tr><td>${timestampToString(r.date).replace(/ .*/g, "")}</td><td>${
        r.data.codes.length
      } changes</td></tr>`;
    });

    content += `</table></p>`;
    const r: CodeHistoryData = { date: res[0].date, data: JSON.parse(res[0].data) };
    const s = r.data.limits[0];
    content += `<h3>Latest Code History Table details for ${timestampToString(r.date).replace(/ .*/g, "")} with ${
      r.data.codes.length
    } code changes</h3><p><table>`;
    content += `<tr><td>start</td><td>${s} hr</td><td>${s * 3600} s</td></tr>`;
    content += `<tr><td>stop</td><td>${r.data.limits[1]} hr</td><td>${r.data.limits[1] * 3600} s</td></tr>`;
    content += `<tr><td>First at</td><td>${r.data.codes[0][0]}s after start</td><td>${
      3600 * s + r.data.codes[0][0]
    } from day start</td></tr>`;
    content += `<tr><td>Sunrise</td><td>${r.data.sun[0]}s</td></tr>`;

    const codes = [
      "It Is dark",
      "Sled ride, bad angle",
      "Sled ride, poor angle",
      "Sled ride",
      "Bad angle",
      "Poor angle",
      "Good",
      "Excellent",
      "Use Speed bar!",
      "Too windy",
      "No data",
    ];
    r.data.codes.forEach(
      (v, i) =>
        (content += `<tr><td>${v[0]}</td><td>${toHMS(v[0] + 3600 * s)}</td><td>${codes[v[1]]} (${v[1]})</td></tr>`)
    );
    content += `</table></p>`;
  }
  content += `<h3>Add Data</h3>`;
  content += `<p>Data and Hours table update Info:<br/>`;
  content += `Last called: ${timestampToString(globals.offset + globals.debugInfo.now)}  (${
    globals.debugInfo.now
  })<br/>`;
  content += `Received ${globals.debugInfo.numberRecords} records from PI3 and added them to the gliderport table<br/>`;
  content += `last entry in hours table: ${timestampToString(globals.debugInfo.latestHours)} (${
    globals.debugInfo.latestHours
  })<br/>`;

  globals.debugInfo.hours.forEach((hourInfo, i) => {
    content += `Found ${hourInfo.resultsFound} entries in gliderport for the hour ${timestampToString(
      hourInfo.ts
    )}<br/>`;
    content += `Hour in hours table starts at ${timestampToString(hourInfo.ts)} had ${hourInfo.resultsFound} `;
    content += `rows and now has ${hourInfo.l} rows<br/>`;
  });
  content += `</p><p>Forecast updating<br/>`;
  content += `Next forecast update as recorded in server_sent: ${timestampToString(
    globals.debugInfo.tsLast + globals.offset + 3600
  )}<br/><br/>`;
  content += `Last forecast update as recorded in server_sent: ${timestampToString(
    globals.debugInfo.tsLastPre + globals.offset
  )} (${globals.debugInfo.tsLastPre})<br/>`;
  content += `found ${globals.debugInfo.openWeather.hours} hours in forecast, starting at ${timestampToString(
    globals.debugInfo.openWeather.start + globals.offset / 1000
  )} ending ${timestampToString(globals.debugInfo.openWeather.stop + globals.offset / 1000)}<br/>`;

  content += `</p><p>Code history updating<br/>`;
  content += `Last update : ${timestampToString(globals.debugInfo.codeHistory.date)} (${
    globals.debugInfo.codeHistory.date
  })<br/>`;
  content += `Since the last record in code_history at ${timestampToString(
    globals.debugInfo.codeHistory.tsLast
  )} with code ${globals.debugInfo.codeHistory.code} there are ${
    globals.debugInfo.codeHistory.gpResults
  } new data points in gliderport<br/>`;
  globals.debugInfo.codeHistory.days.forEach((v, i) => {
    content += `add ${v.length} new code(s) to code_history table for day ${timestampToString(v.date)} form ${
      v.c
    } points<br/>`;
  });
  content += `</p>`;
  return content;
};
