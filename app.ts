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
        console.log(document.id, " ", d);
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
let reportEveryMin = false; //for debugging the online status test

const updateSunData = (ts = 0) => {
  // La Jola lat/long
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
//
app.use(cors(corsOptions));
app.use(express.static("/app/video"));

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

let imageBuffer: Buffer;
let imageBuffer1: Buffer, imageBigBuffer1: Buffer;
let imageBuffer2: Buffer, imageBigBuffer2: Buffer;

app.post("/updateImage", (req, res) => {
  imageBuffer = Buffer.from(req.body.A, "base64");
  let index = req.body.size + 2 * (req.body.camera - 1);
  connection?.query("UPDATE images SET d=? WHERE `id`=" + index, imageBuffer1, () => {});
  res.json("Ok");
});

app.post("/updateSmallImage1", (req, res) => {
  imageBuffer1 = Buffer.from(req.body.A, "base64");
  connection?.query("UPDATE images SET d=? WHERE `id`=1", imageBuffer1, () => {});
  res.json("Ok");
});

app.post("/updateBigImage1", (req, res) => {
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

app.post("/updateSmallImage2", (req, res) => {
  imageBuffer2 = Buffer.from(req.body.A, "base64");
  connection?.query("UPDATE images SET d=? WHERE `id`=3", imageBuffer2, () => {});
  res.json("Ok");
});
app.post("/updateBigImage2", (req, res) => {
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

app.get("/ReportEveryMinute", function (req, res) {
  reportEveryMin = !reportEveryMin;
  console.log("changing reportEveryMin to " + reportEveryMin);
  res.send("changing reportEveryMin to " + reportEveryMin);
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
  if (connection) d.add(req.body);
  else console.log("can't add data, no connection to database");
  res.send("ok");
});

// called by gliderport Pi3 to see what needs updating
app.get("/getLastEntry", (req, res) => {
  if (globals.lastRecord === "0") res.send("Error");
  else res.send(globals.lastRecord);
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

// peak at current image
app.get("/current1.jpg", function (req, res) {
  res.contentType("image/jpeg");
  res.send(imageBuffer1);
});

// peak at current image
app.get("/currentBig1.jpg", function (req, res) {
  res.contentType("image/jpeg");
  res.send(imageBigBuffer1);
});

// peak at current image
app.get("/current2.jpg", function (req, res) {
  res.contentType("image/jpeg");
  res.send(imageBuffer2);
});

// peak at current image
app.get("/currentBig2.jpg", function (req, res) {
  res.contentType("image/jpeg");
  res.send(imageBigBuffer2);
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

function isDirectory(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory();
  } catch (err) {
    console.error(err);
    return false;
  }
}

function getFileDate(filePath: string): Date | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch (err) {
    console.error(err);
    return null;
  }
}

interface ImageStats {
  earliestFile: string;
  earliestTime: Date;
  isContinuous: boolean;
  formatType: number; // 0:image1000.jpg 1:image10000.jpg 2:image-1/2-10000.jpg
  lastFile: string;
  lastTime: Date;
  numFiles: number;
  numMissing: number;
  error?: string;
  smallestIndex: number;
  largestIndex: number;
}

function getImageStats(directoryPath: string): ImageStats {
  let index: boolean[] = Array(9999).fill(false);

  const results: ImageStats = {
    isContinuous: true,
    numFiles: 0,
    numMissing: 0,
    earliestTime: new Date(),
    lastTime: new Date(0),
    earliestFile: "",
    lastFile: "",
    formatType: -1,
    smallestIndex: 999999,
    largestIndex: 0,
  };
  try {
    const files = fs.readdirSync(directoryPath);
    files.forEach((file: string) => {
      results.numFiles++;
      if (results.formatType === -1) {
        if (file.match(/image\d{4}.jpg/)) {
          results.formatType = 0;
        } else if (file.match(/image\d{5}.jpg/)) {
          results.formatType = 1;
        } else if (file.match(/image-\d-\d{5}.jpg/)) {
          results.formatType = 2;
        }
      }
      const fileDate = getFileDate(directoryPath + "/" + file);
      if (fileDate) {
        if (fileDate < results.earliestTime) {
          results.earliestTime = fileDate;
          results.earliestFile = file;
        }
        if (fileDate > results.lastTime) {
          results.lastTime = fileDate;
          results.lastFile = file;
        }
      }
      const filePath = `${directoryPath}/${file}`;
      //extract the 4 or 5 digit number from the name
      let num = parseInt(file.match(/\d{4,5}/)![0]);
      if (results.formatType == 0) num -= 1000;
      else num -= 10000;
      index[num] = true;
      if (num > results.largestIndex) results.largestIndex = num;
      if (num < results.smallestIndex) results.smallestIndex = num;
    });
    for (let i = results.smallestIndex; i <= results.largestIndex; i++) {
      if (!index[i]) {
        results.isContinuous = false;
        results.numMissing++;
      }
    }
    return results;
  } catch (err: any) {
    console.error(err);
    results.error = err.message;
    return results;
  }
}

app.get("/fileList", (req, res) => {
  let results: any = { images: {}, videos: {} };
  //scan the /app/gliderport directory for directories of the form 20xx where xx are numbers
  fs.readdir("/app/gliderport", (err, files) => {
    if (err) {
      console.log(err.message);
      results.error = err.message;
      res.send(results);
      return;
    }
    files.forEach((year) => {
      if (year == "video") {
      }

      if (year.match(/^\d{4}$/) && isDirectory(`/app/gliderport/${year}`)) {
        results.images[year] = {};
        fs.readdir(`/app/gliderport/${year}`, (err, months) => {
          if (err) {
            console.log(err.message);
            results.error = err.message;
            res.send(results);
            return;
          }
          results.images[year].debug = months;

          months.forEach((month) => {
            // scan that directory for 'nn' format directories (two numbers) that are directories themselves
            if (month.match(/^\d{2}$/) && isDirectory(`/app/gliderport/${year}/${month}`)) {
              results.images[year][month] = {};
              fs.readdir(`/app/gliderport/${year}/${month}`, (err, days) => {
                if (err) {
                  console.log(err.message);
                  results.error = err.message;
                  res.send(results);
                  return;
                }
                days.forEach((day) => {
                  // scan that directory for year-month-day format directories (two numbers) that are directories themselves
                  results.images[year][month][day] = getImageStats(`/app/gliderport/${year}/${month}/${day}`);
                });
              });
            }
          });
        });
      }
    });
    res.send(results);
  });
});
