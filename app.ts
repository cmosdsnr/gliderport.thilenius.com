import dotenv from "dotenv";
import mysql from "mysql2";
import SunCalc from "suncalc";

import {
  scanEntireDirectory,
  scanLatestDirectory,
  createListingRecord,
  getListingRecord,
  getImageData,
} from "./src/ImageFiles.js";
// await scanEntireDirectory();

import { Request, Response } from "express";
import { app, startExpress } from "./src/express.js";
startExpress();

import { listEndpoints } from "./src/listEndpoints.js";
app.use(listEndpoints());
import { migrateUsers } from "./src/pb.js";
import { auth, db, exportFirebase } from "./src/firebase.js";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

import { globals } from "./src/globals.js";
import { sendTextMessage } from "./src/sendTextMessage.js";
import { info } from "./src/info.js";
import { timestampToString } from "./src/timeConversion.js";
import { handleHits } from "./src/handleHits.js";
import AddData from "./src/AddData.js";
import { log } from "./src/log.js";

import OffTime from "./src/images/offTime.jpg";
import { format } from "path";

// A node server used to:
// 1. check every hour if it's a new day and update sunrise/set data (updateSunData)
// 2. respond to the following calls:
//  a. '/getLastEntry'  : called from Pi3: return the last entry in gliderport db
//  b. '/ImageAdded'    : called from Pi3: Update the time the last image was added to now in the server_sent table
//  c. '/addData'       : called from Pi3: with new record(s)
//  d. '/updateSmallImage' : called from Pi3: Update the small image data
//  e. '/updateBigImage' :  called from Pi3: Update the large image data
//
// For Debug
//  a. '/current1.jpg'      : browser call to get latest small image (left Camera)
//  b. '/currentBig1.jpg'   : browser call to get latest large image (left Camera)
//  c. '/current2.jpg'      : browser call to get latest small image (Right Camera)
//  d. '/currentBig2.jpg'   : browser call to get latest large image (Right Camera)
//  e. '/info'              : browser call to get lots of info about current situation
//  f. '/UpdateSun'         : browser call to update sunrise/set data
//  g. '/ReportEveryMinute' : browser call to toggle reporting of online status
//  h. '/fileList'          : browser call to get list of files in /app/video
//   DEFUNCT procedures
//  a. '/ImageAdded'    : DEFUNCT, Image data is now added directly thru AddData
//                          WAS: called from Pi3: Update the time the last image was added to now in the server_sent table
//  b. '/UpdateStatus'  : DEFUNCT, status is checked locally now
//                          WAS: called from Pi4: Online status was checked so update those fields in server_sent and network_status

dotenv.config();
//log in to firebase
signInWithEmailAndPassword(auth, "stephen@thilenius.com", "qwe123");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // console.log("user", JSON.stringify(user));
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("text.enabled", "==", true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(new Date().toISOString(), ": snapshot update");
      globals.textWatch = {};
      querySnapshot.forEach((document) => {
        const d = document.data();
        // console.log(document.id, " ", d);
        globals.textWatch[document.id] = d;
      });
    });
  }
});

const resetAllSentTexts = () => {
  Object.keys(globals.textWatch).map(async (v, i) => {
    const d = globals.textWatch[v];
    d.text.sent = false;
    console.log("resetting ", d.email);
    // await setDoc(doc(db, "users", v), d);
  });
};

process.env.TZ = "America/Los_Angeles";
globals.offset = -60000 * new Date().getTimezoneOffset(); //to ms 60s/min*1000ms/s
console.log("offset ", globals.offset);

let sql: string = "";
let onlineStatus: number = 0;
let debugInfo: DebugInfoData;
let d: AddData;

const sqlEnabled = !(typeof process.env.SQL !== "undefined");

let connection: mysql.Connection | null =
  typeof process.env.DATABASE_URL === "string" && sqlEnabled ? mysql.createConnection(process.env.DATABASE_URL) : null;

d = new AddData(connection);

connection?.connect(async function (err) {
  if (err) throw err;
  console.log("MySQL Connected!");
  // get server_sent data
  connection?.query("SELECT * FROM `server_sent` WHERE `id`=1", function (err, results, fields) {
    if (Array.isArray(results)) onlineStatus = (results[0] as ServerSentTable).online_status;
  });
  //get debugInfo for modification
  //debugInfo is written each time addData is called
  //debugInfo is displayed in get info
  const results = await connection?.promise().query("SELECT * FROM miscellaneous WHERE id='debug_info'");
  if (Array.isArray(results) && Array.isArray(results[0]) && results[0].length > 0)
    debugInfo = JSON.parse((results[0][0] as MiscellaneousTable).data);
});

let changes = {
  lastForecast: 0,
};

// to do with sunrise and sunset
let TodaysDay = new Date().getDate();
let sunData: SunCalc.GetTimesResult;
let reportEveryMin = false; //for debugging the online status test

const updateSunData = (ts = 0) => {
  // La Jolla lat/long
  const lat = 32.89;
  const long = -117.25;
  const d = ts > 0 ? new Date(ts * 1000) : new Date();
  sunData = SunCalc.getTimes(d, lat, long);
  let sd: any = {};
  for (const [k, v] of Object.entries(sunData)) sd[k] = Math.floor(v.getTime() / 1000);
  //   for (const [k, v] of Object.entries(sd)) console.log(k, v);
  const sql = "UPDATE `server_sent` SET `sun`='" + JSON.stringify(sd) + "' WHERE `id`=1";
  connection?.query(sql, function (err, results, fields) {});
};
updateSunData();
if (connection) handleHits(connection);

//call every hour
let id = setInterval(() => {
  const now = new Date().getTime() / 1000;
  const sunSet = new Date(sunData.sunset).getTime() / 1000;
  console.log("now: ", now, " sunSet: ", sunSet);
  console.log("now: ", new Date());
  console.log("sunset: ", new Date(sunData.sunset));
  // if (TodaysDay != new Date().getDate()) {
  //    TodaysDay = new Date().getDate();
  // if it is >= 1 hr after sun set
  if (connection && now > sunSet + 1 * 3600) {
    console.log("updating sun data for ", sunSet + 12 * 3600);
    // 12 hours past sunset will always be in the next day
    updateSunData(sunSet + 12 * 3600);
    // Update Day and Week hit_counter databases on each new day
    handleHits(connection);
    //reset sent text list
    resetAllSentTexts();
    debugInfo.sentTexts = [];
  }
}, 1 * 3600 * 1000); // every 1 hours

//call every minute
const url = "http://104.36.31.118:8080/";
let cnt = 0;

let pingTimer = setInterval(() => {
  const controller = new AbortController();
  const ids = setTimeout(() => controller.abort(), 4000);

  if (reportEveryMin) console.log("Timer called");
  fetch(url, { signal: controller.signal })
    .then((response) => {
      clearTimeout(ids);
      cnt = 0;
      if (reportEveryMin) console.log("gliderport is online");
      const ts = Math.floor((Date.now() + globals.offset) / 1000);
      const dateString = timestampToString(ts);
      if (onlineStatus === 0) {
        // We saw it go online!
        onlineStatus = 1;
        console.log("gliderport at " + url + " came online");
        sql = "UPDATE `server_sent` SET `online_status`=" + onlineStatus + " WHERE `id`=1";
        connection?.query(sql, (err, results, fields) => {});
        sql = "INSERT INTO `network_status`(`recorded`, `status`) VALUES ('" + dateString + "'," + onlineStatus + ")";
        connection?.query(sql, (err, results, fields) => {});
      }
      sql = "UPDATE `server_sent` SET `online_status_touched`='" + dateString + "' WHERE 1";
      connection?.query(sql, (err, results, fields) => {});
    })
    .catch((error) => {
      clearTimeout(ids);
      if (reportEveryMin) console.log("count is ", cnt);
      if (cnt++ < 5) return;
      if (reportEveryMin) console.log("gliderport is offline");
      const ts = Math.floor((Date.now() + globals.offset) / 1000);
      const dateString = timestampToString(ts);
      if (onlineStatus === 1) {
        // We saw it go offline!
        onlineStatus = 0;
        console.log("gliderport at " + url + " went offline");
        sql = "UPDATE `server_sent` SET `online_status`=" + onlineStatus + " WHERE `id`=1";
        connection?.query(sql, (err, results, fields) => {});
        sql = "INSERT INTO `network_status`(`recorded`, `status`) VALUES ('" + dateString + "'," + onlineStatus + ")";
        connection?.query(sql, (err, results, fields) => {});
      }
      sql = "UPDATE `server_sent` SET `online_status_touched`='" + dateString + "' WHERE 1";
      connection?.query(sql, (err, results, fields) => {});
    });
}, 60000);

d.setLastRecord();
console.log("last record set to: ", globals.lastRecord);

let imageBuffer: Buffer;
let imageBuffer1: Buffer, imageBigBuffer1: Buffer;
let imageBuffer2: Buffer, imageBigBuffer2: Buffer;

app.get("/debug", async (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/exportFirebase", async (req: Request, res: Response) => {
  exportFirebase();
  res.json({ status: "ok" });
});

app.get("/migrateUsers", async (req: Request, res: Response) => {
  migrateUsers();
  res.json({ status: "ok" });
});

app.get("/scanLatestDirectory", async (req: Request, res: Response) => {
  res.json(await scanLatestDirectory());
});

app.get("/scanEntireDirectory", async (req: Request, res: Response) => {
  scanEntireDirectory();
  res.json({ status: "ok" });
});

app.get("/createListingRecord", async (req: Request, res: Response) => {
  createListingRecord();
  res.json({ status: "ok" });
});

app.get("/listing", async (req: Request, res: Response) => {
  res.json(await getListingRecord());
});

app.get("/getImageData", async (req: Request, res: Response) => {
  if (req.query.year === undefined)
    return res.status(400).json({ error: "year not provided", ...req.query, help: "add ?year=2025 to the url" });
  if (req.query.month === undefined)
    return res.status(400).json({ error: "month not provided", ...req.query, help: "add ?month=4 to the url" });
  res.json(await getImageData(parseInt(req.query.year as string), parseInt(req.query.month as string)));
});

app.post("/updateImage", (req: Request, res: Response) => {
  imageBuffer = Buffer.from(req.body.A, "base64");
  if (
    req.body.size === undefined ||
    req.body.camera === undefined ||
    req.body.size < 1 ||
    req.body.camera < 1 ||
    req.body.size > 2 ||
    req.body.camera > 2
  )
    return res
      .status(400)
      .json({ error: "size or camera not provided", ...req.body, help: "add size and camera to body" });
  const index = req.body.size + 2 * (req.body.camera - 1);
  connection?.query("UPDATE images SET d=? WHERE `id`=" + index, imageBuffer1, () => {});
  res.json("Ok");
});

app.post("/updateSmallImage1", (req: Request, res: Response) => {
  imageBuffer1 = Buffer.from(req.body.A, "base64");
  connection?.query("UPDATE images SET d=? WHERE `id`=1", imageBuffer1, () => {});
  res.json("Ok");
});

app.post("/updateBigImage1", (req: Request, res: Response) => {
  //   console.log("updating big image");
  imageBigBuffer1 = Buffer.from(req.body.A, "base64");
  const ts = Math.floor(new Date().getTime() / 1000);
  connection?.query(`UPDATE server_sent SET last_image=${ts} WHERE id=1`, () => {});
  connection?.query("UPDATE images SET d=? WHERE id=2", imageBigBuffer1, function (err, results, fields) {
    // console.log(results); // results contains rows returned by server
    // console.log(fields); // fields contains extra meta data about results, if available
    // console.log(err);
  });
  res.send("Ok");
});

app.post("/updateSmallImage2", (req: Request, res: Response) => {
  imageBuffer2 = Buffer.from(req.body.A, "base64");
  connection?.query("UPDATE images SET d=? WHERE `id`=3", imageBuffer2, () => {});
  res.json("Ok");
});
app.post("/updateBigImage2", (req: Request, res: Response) => {
  //   console.log("updating big image");
  imageBigBuffer2 = Buffer.from(req.body.A, "base64");
  //   const ts = Math.floor(new Date().getTime() / 1000);
  //   connection?.query(`UPDATE server_sent SET last_image=${ts} WHERE id=3`, () => {});
  connection?.query("UPDATE images SET d=? WHERE id=4", imageBigBuffer2, function (err, results, fields) {
    // console.log(results); // results contains rows returned by server
    // console.log(fields); // fields contains extra meta data about results, if available
    // console.log(err);
  });
  res.send("Ok");
});

app.get("/ReportEveryMinute", function (req: Request, res: Response) {
  reportEveryMin = !reportEveryMin;
  console.log("changing reportEveryMin to " + reportEveryMin);
  res.send("changing reportEveryMin to " + reportEveryMin);
});

app.get("/RegenerateAllHours", function (req: Request, res: Response) {
  console.log("regenerate all hours");
  if (connection) d.updateHoursTable(false);
  res.send("done");
});

// For testing, not usually called.
app.get("/HandleHits", async (req: Request, res: Response) => {
  if (connection) res.send(await handleHits(connection));
  else res.send("no connection to database");
});

// called to add new wind Data to the db
app.post("/addData", async (req: Request, res: Response) => {
  if (connection) d.add(req);
  else console.log("can't add data, no connection to database");
  res.send("ok");
});

// called by gliderport Pi3 to see what needs updating
app.get("/getLastEntry", (req: Request, res: Response) => {
  if (globals.lastRecord === "0") res.send("Error");
  else res.send(globals.lastRecord);
});

// called from browser for debug to display latest happenings
app.get("/info", async (req: Request, res: Response) => {
  if (connection) res.send(await info(connection));
  else res.send("<h1>No connection to database</h1>");
});

// called from browser for debug to display latest happenings
app.get("/UpdateSun", async (req: Request, res: Response) => {
  if (connection) {
    updateSunData();
    let x = "<h3>Updated Sun Data<br>";
    let k: keyof SunCalc.GetTimesResult;
    for (k in sunData) {
      x += `${k}: ${sunData[k]}<br>`;
    }
    // for (const [k, v] of Object.entries(sunData)) x += `${v}: ${sunData[v]}<br>`
    // Object.keys(sunData).map(async (v, i) => {
    //   x += `${v}: ${sunData[v]}<br>`;
    // });
    x += "</h3>";
    res.send(x);
  } else res.send("<h1>No connection to database</h1>");
});

app.get("/current", function (req: Request, res: Response) {
  if (req.query.camera === undefined || (req.query.camera != "1" && req.query.camera != "2"))
    return res.status(400).json({ error: "camera not valid", ...req.query, help: "add ?camera=1|2 to the url" });
  if (req.query.size === undefined || (req.query.size != "b" && req.query.size != "s"))
    return res.status(400).json({ error: "size not valid", ...req.query, help: "add ?size=b|s to the url" });
  res.contentType("image/jpeg");
  if (req.query.camera == "1") {
    if (req.query.size == "b") res.send(imageBigBuffer1);
    else res.send(imageBuffer1);
  } else {
    if (req.query.size == "b") res.send(imageBigBuffer2);
    else res.send(imageBuffer2);
  }
});

// peak at current image
app.get("/current1.jpg", function (req: Request, res: Response) {
  res.contentType("image/jpeg");
  res.send(imageBuffer1);
});

// peak at current image
app.get("/currentBig1.jpg", function (req: Request, res: Response) {
  res.contentType("image/jpeg");
  res.send(imageBigBuffer1);
});

// peak at current image
app.get("/current2.jpg", function (req: Request, res: Response) {
  res.contentType("image/jpeg");
  res.send(imageBuffer2);
});

// peak at current image
app.get("/currentBig2.jpg", function (req: Request, res: Response) {
  res.contentType("image/jpeg");
  res.send(imageBigBuffer2);
});

app.get("/sendTestSms", (req: Request, res: Response) => {
  if (
    "to" in req.query &&
    "name" in req.query &&
    typeof req.query.to === "string" &&
    typeof req.query.name === "string"
  ) {
    sendTextMessage(req.query.to, req.query.name, null);
    res.send("Ok");
  } else {
    res.send("did not get name & to");
  }
});

// Call to find out carrier of a phone number
app.get("/PhoneFinder", (req: Request, res: Response) => {
  if ("area" in req.query && "prefix" in req.query && "number" in req.query) {
    // https://www.fonefinder.net/findome.php?npa=530&nxx=613&thoublock=5388&usaquerytype=Search+by+Number
    const url =
      `https://www.fonefinder.net/findome.php?npa=${req.query.area}&nxx=${req.query.prefix}` +
      `&thoublock=${req.query.number}&usaquerytype=Search+by+Number`;
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
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
