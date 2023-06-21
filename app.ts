import express from "express";
import dotenv from "dotenv";
import mysql from "mysql2";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import SunCalc from "suncalc";

import { auth, db } from "./src/firebase.js";
import { onSnapshot, doc, setDoc, collection, query, where } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

import { globals } from "./src/globals";
import { sendTextMessage } from "./src/sendTextMessage.js";
import { info } from "./src/info.js";
import { timestampToString } from "./src/timeConversion";
import { handleHits } from "./src/handleHits";
import AddData from "./src/AddData";

import OffTime from "./src/images/offTime.jpg";
//
dotenv.config();

//log in to firebase
signInWithEmailAndPassword(auth, "stephen@thilenius.com", "qwe123");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // console.log("user", JSON.stringify(user))
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("text.enabled", "==", true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log(new Date().toISOString(), ": snapshot update");
      globals.textWatch = {};
      querySnapshot.forEach((document) => {
        const d = document.data();
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
    await setDoc(doc(db, "users", v), d);
  });
};

process.env.TZ = "America/Los_Angeles";
globals.offset = -60000 * new Date().getTimezoneOffset();
console.log("offset ", globals.offset);
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
//  a. '/current.jpg'    : browser call to get latest small image
//  b. '/currentBig.jpg' : browser call to get latest small image
//  c. '/info'           : browser call to get lots of info about current situation
//  d. '/UpdateSun'      : browser call to update sunrise/set data
//
//   DEFUNCT procedures
//  a. '/ImageAdded'    : DEFUNCT, Image data is now added directly thru AddData
//                          WAS: called from Pi3: Update the time the last image was added to now in the server_sent table
//  b. '/UpdateStatus'  : DEFUNCT, status is checked locally now
//                          WAS: called from Pi4: Online status was checked so update those fields in server_sent and network_status

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
  console.log("Connected!");
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

const updateSunData = () => {
  // La Jola lat/long
  const lat = 32.89;
  const long = -117.25;
  sunData = SunCalc.getTimes(new Date(), lat, long);
  let sd: any = {};
  for (const [k, v] of Object.entries(sunData)) sd[k] = Math.floor(v.getTime() / 1000);
  //   for (const [k, v] of Object.entries(sd)) console.log(k, v);
  const sql = "UPDATE `server_sent` SET `sun`='" + JSON.stringify(sd) + "' WHERE `id`=1";
  connection?.query(sql, function (err, results, fields) {});
};
updateSunData();

//call every minute
const reportEveryMin = false;
const url = "http://104.36.31.118:8080/";

let pingTimer = setInterval(() => {
  const controller = new AbortController();
  const ids = setTimeout(() => controller.abort(), 2000);
  fetch(url, { signal: controller.signal })
    .then((response) => {
      clearTimeout(ids);
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

//call every hour
let id = setInterval(() => {
  if (TodaysDay != new Date().getDate()) {
    TodaysDay = new Date().getDate();
    updateSunData();
    // Update Day and Week hit_counter databases on each new day
    if (connection) handleHits(connection);
    //reset sent text list
    resetAllSentTexts();
    debugInfo.sentTexts = [];
  }
}, 1 * 3600 * 1000); // every 1 hours

d.setLastRecord();

const app = express();

const port = process.env.PORT || 1234;
app.listen(port, () => {
  console.log(`Updater listening on port data.${port}`);
});

app.use(express.urlencoded({ extended: true, limit: "30mb" }));

var corsOptions = {
  origin: [/gliderport.*thilenius.*/, /localhost.*/],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.static("/app/storage"));

// enable files upload
app.use(
  fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 2 * 1024 * 1024 * 1024, //2GB max file(s) size
    },
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/uploadVideo", async (req, res) => {
  try {
    if (!req.files) {
      res.send({
        status: false,
        message: "No file uploaded",
      });
    } else {
      let video = req.files.video as fileUpload.UploadedFile;
      video.mv("/app/storage/" + video.name);

      //send response
      res.send({
        status: true,
        message: "File is uploaded",
        data: {
          name: video.name,
          mimetype: video.mimetype,
          size: video.size,
        },
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
});
app.post("/addVideo", (req, res) => {
  if (req.body.A === undefined) {
    res.json("no A record");
    return;
  }
  if (req.body.name === undefined) {
    res.json("no name record");
    return;
  }
  var videoBuffer = Buffer.from(req.body.A, "base64");
  if (videoBuffer.length < 1000) {
    res.json("no valid data A");
    return;
  }
  console.log("name: ", req.body.name, " base64: ", req.body.A.length, " binary: ", videoBuffer.length);
  fs.writeFile(`/app/storage/${req.body.name}.mp4`, videoBuffer, (err) => {
    if (err) throw err;
    res.json("Ok");
  });
});

let imageBuffer: Buffer, imageBigBuffer: Buffer;
app.post("/updateSmallImage", (req, res) => {
  imageBuffer = Buffer.from(req.body.A, "base64");
  connection?.query("UPDATE images SET d=? WHERE `id`=1", imageBuffer, () => {});
  res.json("Ok");
});
app.post("/updateBigImage", (req, res) => {
  //   console.log("updating big image");
  imageBigBuffer = Buffer.from(req.body.A, "base64");
  const ts = Math.floor(new Date().getTime() / 1000);
  connection?.query(`UPDATE server_sent SET last_image=${ts} WHERE id=1`, () => {});
  connection?.query("UPDATE images SET d=? WHERE id=2", imageBigBuffer, function (err, results, fields) {
    // console.log(results); // results contains rows returned by server
    // console.log(fields); // fields contains extra meta data about results, if available
    // console.log(err);
  });
  res.send("Ok");
});

app.get("/RegenerateAllHours", function (req, res) {
  console.log("regenerate all hours");
  if (connection) d.updateHoursTable(false);
  res.send("done");
});

// For testing, not usually called.
app.get("/HandleHits", async (req, res) => {
  if (connection) res.send(await handleHits(connection));
  else res.send("no connection to database");
});

// called to add new wind Data to the db
app.post("/addData", async (req, res) => {
  res.send("ok");
  if (connection) d.add(req.body);
  else console.log("can't add data, no connection to database");
});

// called by gliderport Pi3 to see what needs updating
app.get("/getLastEntry", (req, res) => {
  res.send(globals.lastRecord);
});

// called from browser for debug to display latest happenings
app.get("/info", async (req, res) => {
  if (connection) res.send(await info(connection));
  else res.send("<h1>No connection to database</h1>");
});

// called from browser for debug to display latest happenings
app.get("/UpdateSun", async (req, res) => {
  if (connection) {
    updateSunData();
    let x = "<h4>Updated Sun Data<br>";
    Object.keys(sunData).map(async (v, i) => {
      x += `${v}: ${sunData[v]}<br>`;
    });
    x += "</h3>";
    res.send(x);
  } else res.send("<h1>No connection to database</h1>");
});

// peak at current image
app.get("/current.jpg", function (req, res) {
  res.contentType("image/jpeg");
  res.send(imageBuffer);
});

// peak at current image
app.get("/currentBig.jpg", function (req, res) {
  res.contentType("image/jpeg");
  res.send(imageBigBuffer);
});

app.get("/sendTestSms", (req, res) => {
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
app.get("/PhoneFinder", (req, res) => {
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
