import express from "express";
import dotenv from "dotenv";
import mysql from "mysql2";
import ping from "web-pingjs";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import SunCalc from "suncalc";

import { auth, db } from "./src/firebase.js";
import { onSnapshot, doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

import { globals } from "./src/globals";
import { sendTextMessage } from "./src/sendTextMessage.js";
import { info } from "./src/info.js";
import { timestampToString } from "./src/timeConversion";
import { handleHits } from "./src/handleHits";
import AddData from "./src/AddData";

import OffTime from "./src/images/offTime.jpg";
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
//  a. '/current.jpg    : browser call to get latest small image
//  b. '/currentBig.jpg : browser call to get latest small image
//  c. '/info           : browser call to get lots of info about current situation
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
let pingTimer = setInterval(() => {
  const url = "https://104.36.31.118/";
  ping(url)
    .then(function () {
      if (reportEveryMin) console.log("gliderport online");
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
    .catch(function () {
      if (reportEveryMin) console.log("gliderport offline");
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
  imageBigBuffer = Buffer.from(req.body.A, "base64");
  const ts = Math.floor(new Date().getTime() / 1000);
  connection?.query(`UPDATE server_sent SET last_image=${ts} WHERE id=1`, () => {});
  connection?.query("UPDATE images SET d=? WHERE id=2", imageBigBuffer, () => {});
  res.send("Ok");
});

app.get("/RegenerateAllHours", function (req, res) {
  console.log("regenerate all hours");
  const dtd = (Date.now() + globals.offset) / 1000; //+ 60 * tdLast.getTimezoneOffset()
  const thisHour = 3600 * Math.floor(dtd / 3600);
  const twoDaysAgo = thisHour - 48 * 3600;
  const dt = new Date(twoDaysAgo * 1000);
  let start = twoDaysAgo;
  let stop = twoDaysAgo + 3600;
  let data: DataType = {
    start: twoDaysAgo,
    date: [],
    speed: [],
    direction: [],
    humidity: [],
    pressure: [],
    temperature: [],
  };
  let msg = "pull from gliderport: records from " + timestampToString(twoDaysAgo) + "<br/>\n";
  console.log("pull from gliderport: records from " + timestampToString(twoDaysAgo));
  sql = "SELECT * FROM gliderport WHERE recorded > '" + timestampToString(twoDaysAgo) + "'";
  console.log(sql);
  connection?.query(sql, (err, results, fields) => {
    if (Array.isArray(results)) {
      console.log("found " + results.length + " results");
      msg += "found " + results.length + "<br/>\n";
      if (Array.isArray(results)) {
        msg += "found " + results.length + "<br/>\n";
        (results as GliderportTable[]).forEach((v, j) => {
          let ts = Math.floor((new Date(v.recorded).getTime() + globals.offset) / 1000);
          if (ts >= stop) {
            //save the hour
            sql = "REPLACE into hours (`start`, `data`) value(" + data.start + ",'" + JSON.stringify(data) + "')";
            connection?.query(sql, (err, results, fields) => {});
            msg += "Saved hr " + data.start + " with " + data.date.length + " records<br/>";
            console.log("Saved hr " + data.start + " with " + data.date.length + " records");
            // reset the data
            start = stop;
            stop += 3600;
            data = {
              start: start,
              date: [],
              speed: [],
              direction: [],
              humidity: [],
              pressure: [],
              temperature: [],
            };
          }
          data.date.push(ts - start);
          data.speed.push(v.speed);
          data.direction.push(v.direction);
          data.humidity.push(v.humidity);
          data.pressure.push(v.pressure);
          data.temperature.push(v.temperature);
        });
      }
    }
  });
  console.log("Done with regeneration");
  res.send(msg);
});

// For testing, not usually called.
app.get("/HandleHits", async (req, res) => {
  if (connection) res.send(await handleHits(connection));
  else res.send("no connection to database");
});

app.get("/fixHistory", (req, res) => {
  let p = "database:<br/>";
  connection?.query("SELECT * FROM code_history ORDER BY date DESC LIMIT 100", function (err, results, fields) {
    if (Array.isArray(results))
      (results as CodeHistoryTable[]).forEach((v, i) => {
        // console.log(v)
        const r: CodeHistoryTable = { date: v.date, data: JSON.parse(v.data as string) };
        let dt = new Date(r.date * 1000);
        if (dt.getHours() === 23) {
          sql = "DELETE FROM code_history where `date`=" + v.date + ";";
          connection?.query(sql, (err, results, fields) => {});
          p += sql + "<br/>";
          v.date += 3600;
          sql = "INSERT into code_history (`date`, `data`) value(" + v.date + ",'" + v.data + "')";
          connection?.query(sql, (err, results, fields) => {});
          p += sql + "<br/>";
        }
      });
    res.send(p);
  });
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
