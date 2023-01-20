import express from "express"
import dotenv from "dotenv"
import mysql from "mysql2"
import base64url from "base64url"
import ping from "web-pingjs"
import fs from "fs"
import bodyParser from "body-parser"
import cors from "cors"
import fileUpload from 'express-fileupload'
import nodemailer from "nodemailer"

import { auth, db } from './firebase.js'
import { onSnapshot, doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import calculateSunrise from "./calculateSunrise.js"
import { Http2ServerRequest } from "http2"
dotenv.config()

let DEBUG = true


//log in to firebase
signInWithEmailAndPassword(auth, "stephen@thilenius.com", "qwe123")

let textWatch = {}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // console.log("user", JSON.stringify(user))
        const usersRef = collection(db, "users")
        const q = query(usersRef, where('text.enabled', '==', true))
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log((new Date()).toISOString(), ": snapshot update")
            textWatch = {}
            querySnapshot.forEach((document) => {
                const d = document.data()
                textWatch[document.id] = d
            })
        })
    }
})

const resetAllSentTexts = () => {
    Object.keys(textWatch).map(async (v, i) => {
        const d = textWatch[v]
        d.text.sent = false
        console.log("resetting ", d.email)
        await setDoc(doc(db, 'users', v), d)
    })
}

// used to daily update hit counter tables (day of month)
let d = new Date().getDate()

const timestampToString = (ts) => {
    return new Date(ts * 1000).toISOString().replace("T", " ").replace(/\.[0-9]*Z/, "")
}

const toHMS = (s) => {
    let l = s
    const h = parseInt(l / 3600)
    let sStr = (h < 10 ? "0" : "") + h
    l -= 3600 * h
    const m = parseInt(l / 60)
    sStr += (m < 10 ? ":0" : ":") + m
    l -= 60 * m
    sStr += (l < 10 ? ":0" : ":") + l
    return sStr
}

process.env.TZ = "America/Los_Angeles"
let offset = -60000 * new Date().getTimezoneOffset()
console.log("offset ", offset)
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



// interface Day {
//   start: number
//   date: number[]
//   speed: number[]
//   direction: number[]
//   humidity: number[]
//   pressure: number[]
//   temperature: number[]
// }

// type Reading = {
//   recorded: string
//   speed: number
//   direction: number
//   humidity: number
//   pressure: number
//   temperature: number
// }

// type Hour = {
//   start: number
//   data: string
// }

const sqlEnabled = !(typeof process.env.SQL !== "undefined")

let connection =
    typeof process.env.DATABASE_URL === "string" && sqlEnabled
        ? mysql.createConnection(process.env.DATABASE_URL)
        : null

let sql, onlineStatus

connection?.connect(function (err) {
    if (err) throw err
    console.log("Connected!")
    // get server_sent data   
    connection.query('SELECT * FROM `server_sent` WHERE `id`=1',
        function (err, results, fields) {
            onlineStatus = results[0].online_status
        })
})

let lastRecord = "2022-09-05 13:27:20",
    firstRecord,
    numberRecords,
    tdLast = new Date()
let latestHours = 0

let changes = {
    lastForecast: 0,
}

// to do with sunrise and sunset
let TodaysDay = new Date().getDate()
let sunData = calculateSunrise(new Date())

const updateSunData = () => {
    const sql = "UPDATE `server_sent` SET `sunrise_raw`=" + sunData.sunrise +
        ",`sunrise_timestamp`=" + sunData.sunriseTimestamp +
        ",`sunrise_text`='" + sunData.sunriseText +
        "',`sunset_raw`=" + sunData.sunset +
        ",`sunset_timestamp`=" + sunData.sunsetTimestamp +
        ",`sunset_text`='" + sunData.sunsetText +
        "' WHERE `id`=1"
    connection?.query(sql, function (err, results, fields) { })
}
updateSunData()

//call every minute
const reportEveryMin = false
let pingTimer = setInterval(() => {
    const url = 'https://104.36.31.118/'
    ping(url).then(function (delta) {
        if (reportEveryMin) console.log('gliderport online')
        const ts = parseInt((Date.now() + offset) / 1000)
        const dateString = timestampToString(ts)
        if (onlineStatus === 0) {
            // We saw it go online!
            onlineStatus = 1
            console.log('gliderport at ' + url + ' came online')
            sql = "UPDATE `server_sent` SET `online_status`=" + onlineStatus + " WHERE `id`=1"
            connection?.query(sql, (err, results, fields) => { })
            sql = "INSERT INTO `network_status`(`recorded`, `status`) VALUES ('" + dateString + "'," + onlineStatus + ")"
            connection?.query(sql, (err, results, fields) => { })
        }
        sql = "UPDATE `server_sent` SET `online_status_touched`='" + dateString + "' WHERE 1"
        connection?.query(sql, (err, results, fields) => { })
    }).catch(function (err) {
        if (reportEveryMin) console.log('gliderport offline')
        const ts = parseInt((Date.now() + offset) / 1000)
        const dateString = timestampToString(ts)
        if (onlineStatus === 1) {
            // We saw it go offline!
            onlineStatus = 0
            console.log('gliderport at ' + url + ' went offline')
            sql = "UPDATE `server_sent` SET `online_status`=" + onlineStatus + " WHERE `id`=1"
            connection?.query(sql, (err, results, fields) => { })
            sql = "INSERT INTO `network_status`(`recorded`, `status`) VALUES ('" + dateString + "'," + onlineStatus + ")"
            connection?.query(sql, (err, results, fields) => { })
        }
        sql = "UPDATE `server_sent` SET `online_status_touched`='" + dateString + "' WHERE 1"
        connection?.query(sql, (err, results, fields) => { })
    })
}, 60000)

//call every hour
let id = setInterval(() => {
    if (TodaysDay != new Date().getDate()) {
        TodaysDay = new Date().getDate()
        sunData = calculateSunrise(new Date())
        updateSunData()
    }
}, 3600000)

const setLastRecord = async () => {
    const res = await connection?.promise().query("SELECT * FROM gliderport ORDER BY recorded DESC LIMIT 1")
    const ts = (new Date(res[0][0].recorded).getTime() + offset) / 1000
    lastRecord = res ? timestampToString(ts) : "0"
}
setLastRecord()

const app = express()

const port = process.env.PORT || 1234
app.listen(port, () => {
    console.log(`Updater listening on port data.${port}`)
})

app.use(express.urlencoded({ extended: true, limit: "30mb" }))


var corsOptions = {
    origin: [/gliderport.*thilenius.*/, /localhost.*/],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(cors(corsOptions))
app.use(express.static("/app/storage"))

// enable files upload
app.use(fileUpload({
    createParentPath: true,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024 //2GB max file(s) size
    }
}))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));


app.post('/uploadVideo', async (req, res) => {
    try {
        if (!req.files) {
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            let video = req.files.video
            video.mv('/app/storage/' + video.name)

            //send response
            res.send({
                status: true,
                message: 'File is uploaded',
                data: {
                    name: video.name,
                    mimetype: video.mimetype,
                    size: video.size
                }
            })
        }
    } catch (err) {
        res.status(500).send(err)
    }
})


app.post("/addVideo", (req, res) => {
    if (req.body.A === undefined) {
        res.json("no A record")
        return
    }
    if (req.body.name === undefined) {
        res.json("no name record")
        return
    }
    var videoBuffer = new Buffer.from(req.body.A, 'base64')
    if (videoBuffer.length < 1000) {
        res.json("no valid data A")
        return
    }
    console.log('name: ', req.body.name, ' base64: ', req.body.A.length, ' binary: ', videoBuffer.length)
    fs.writeFile(`/app/storage/${req.body.name}.mp4`, videoBuffer, (err) => {
        if (err) throw err;
        res.json("Ok")
    })
})

let imageBuffer, imageBigBuffer
app.post("/updateSmallImage", (req, res) => {
    imageBuffer = new Buffer.from(req.body.A, 'base64')
    connection?.query("UPDATE images SET d=? WHERE `id`=1", imageBuffer, () => { })
    res.json("Ok")
})
app.post("/updateBigImage", (req, res) => {
    imageBigBuffer = new Buffer.from(req.body.A, 'base64')
    const ts = parseInt(new Date().getTime() / 1000)
    connection?.query(`UPDATE server_sent SET last_image=${ts} WHERE id=1`, () => { })
    connection?.query("UPDATE images SET d=? WHERE id=2", imageBigBuffer, () => { })
    res.send("Ok")
})
app.get('/RegenerateAllHours', function (req, res) {
    console.log("regenerate all hours")
    const dtd = (Date.now() + offset) / 1000 //+ 60 * tdLast.getTimezoneOffset()
    const thisHour = 3600 * Math.floor(dtd / 3600)
    const twoDaysAgo = thisHour - 48 * 3600
    const dt = new Date(twoDaysAgo * 1000)
    let start = twoDaysAgo
    let stop = twoDaysAgo + 3600
    let data = {
        start: twoDaysAgo, date: [], speed: [],
        direction: [], humidity: [], pressure: [], temperature: [],
    }
    let msg = "pull from gliderport: records from " + timestampToString(twoDaysAgo) + "<br/>\n"
    console.log("pull from gliderport: records from " + timestampToString(twoDaysAgo))
    sql = "SELECT * FROM gliderport WHERE recorded > '" + timestampToString(twoDaysAgo) + "'"
    console.log(sql)
    connection?.query(sql, (err, results, fields) => {
        console.log("found " + results.length + " results")
        msg += "found " + results.length + "<br/>\n"
        if (Array.isArray(results)) {
            msg += "found " + results.length + "<br/>\n"
            results.forEach((v, j) => {
                let ts = parseInt((new Date(v.recorded).getTime() + offset) / 1000)
                if (ts >= stop) {
                    //save the hour
                    sql = "REPLACE into hours (`start`, `data`) value(" + data.start + ",'" + JSON.stringify(data) + "')"
                    connection?.query(sql, (err, results, fields) => { })
                    msg += "Saved hr " + data.start + " with " + data.date.length + " records<br/>"
                    console.log("Saved hr " + data.start + " with " + data.date.length + " records")
                    // reset the data
                    start = stop
                    stop += 3600
                    data = {
                        start: start, date: [], speed: [], direction: [],
                        humidity: [], pressure: [], temperature: [],
                    }
                }
                data.date.push(ts - start)
                data.speed.push(v.speed)
                data.direction.push(v.direction)
                data.humidity.push(v.humidity)
                data.pressure.push(v.pressure)
                data.temperature.push(v.temperature)
            })
        }
    })
    console.log("Done with regeneration")
    res.send(msg)
})



app.get("/HandleHits", (req, res) => {
    let retString = handleHits()
    connection?.query("SELECT * FROM miscellaneous WHERE id='hit_stats'", function (err, results, fields) {
        const d = JSON.parse(results[0].data)
        retString += "***** DB ***** </br>"
        retString += "Day start           : " + d.day.day + "</br>"
        retString += "Week start          : " + d.week.day + "</br>"
        retString += "totals plot length  : " + d.totals.length + "</br>"
        retString += "last totaled        : " + d.total.date + "</br>"
        retString += "last Entry : " + lastEntry + "</br>"
        res.send(retString)
    })
})

app.get("/fixHistory", (req, res) => {
    let p = "database:<br/>"
    connection?.query(
        "SELECT * FROM code_history ORDER BY date DESC LIMIT 100",
        function (err, results, fields) {
            results.forEach((v, i) => {
                // console.log(v)
                const r = { date: v.date, data: JSON.parse(v.data) }
                let dt = new Date(r.date * 1000)
                if (dt.getHours() === 23) {
                    sql = "DELETE FROM code_history where `date`=" + v.date + ";"
                    connection?.query(sql, (err, results, fields) => { })
                    p += sql + "<br/>"
                    v.date += 3600
                    sql = "INSERT into code_history (`date`, `data`) value(" + v.date + ",'" + v.data + "')"
                    connection?.query(sql, (err, results, fields) => { })
                    p += sql + "<br/>"
                }
            })
            res.send(p)
        })

})

// called to add new wind Data to the db
app.post("/addData", async (req, res) => {
    console.log("++++++++ Adding Data ++++++++++++")
    let msg = ""
    if ("d" in req.body) {
        const d = JSON.parse(req.body.d)
        sql =
            "INSERT INTO gliderport (recorded, speed, direction, humidity, pressure, temperature ) VALUES "
        let e = ","
        firstRecord = d[0][0]
        numberRecords = d.length
        msg += numberRecords + " records added to gliderport"
        console.log("   received " + numberRecords + " records from PI3 and added them to the gliderport table")
        // console.log(msg)
        msg += "<br/>\n"
        d.forEach((v, i) => {
            if (i === d.length - 1) e = ""
            sql += '( "' + v[0] + '", ' + v[1] + ", " + v[2] + ", " + v[3] + ", " + v[4] + ", " + v[5] + ")" + e
        })
        connection?.query(sql, (err, results, fields) => {
            setLastRecord()
            tdLast = new Date()
            const last = d[d.length - 1]
            const ts = parseInt(new Date(last[0]).getTime() / 1000)
            sql =
                "UPDATE `server_sent` SET `last_record`=" + ts +
                ", `speed` = " + last[1] +
                ", `direction` = " + last[2] +
                ", `humidity` = " + last[3] +
                ", `pressure` = " + last[4] +
                ", `temperature` = " + last[5] +
                " WHERE `id`=1"
            connection?.query(sql, (err, results, fields) => { })
        })
        //check for texts that need sending
        const tsNow = parseInt((Date.now() + offset) / 1000)
        const fifteenMin = tsNow - 15 * 60
        const oneMin = tsNow - 1 * 60
        const fiveMin = tsNow - 5 * 60
        sql = "SELECT * FROM `gliderport` WHERE recorded > '" + timestampToString(fifteenMin) + "'"
        let res = await connection?.promise().query(sql)
        let aSpeed = 0, bSpeed = 0, cSpeed = 0
        let aDir = 0, bDir = 0, cDir = 0
        let aCnt = 0, bCnt = 0, cCnt = 0
        if (Array.isArray(res[0])) res[0].forEach(e => {
            aDir += e.direction
            aSpeed += e.speed
            aCnt += 1
            const ts = parseInt((new Date(e.recorded).getTime() + offset) / 1000)
            if (ts >= fiveMin) {
                bDir += e.direction
                bSpeed += e.speed
                bCnt += 1
            }
            if (ts >= oneMin) {
                cDir += e.direction
                cSpeed += e.speed
                cCnt += 1
            }
        })
        aDir /= (aCnt > 0 ? aCnt : 1)
        aSpeed /= (aCnt > 0 ? aCnt : 1)
        bDir /= (bCnt > 0 ? bCnt : 1)
        bSpeed /= (bCnt > 0 ? bCnt : 1)
        cDir /= (cCnt > 0 ? cCnt : 1)
        cSpeed /= (cCnt > 0 ? cCnt : 1)

        Object.keys(textWatch).forEach(async (v, i) => {
            const d = textWatch[v]
            if (d.text.sent != true) {
                console.log("not yet sent to", d.email)
                if (d.text.duration === 0 &&
                    cSpeed >= d.text.speed &&
                    Math.abs(270 - cDir) <= d.text.errorAngle) {
                    sendTextMessage(d.text.address, d.firstName,
                        {
                            speed: cSpeed,
                            direction: cDir,
                            duration: "1"
                        }
                    )
                    d.text.sent = true
                }
                if (d.text.duration === 1 &&
                    bSpeed >= d.text.speed &&
                    Math.abs(270 - bDir) <= d.text.errorAngle) {
                    sendTextMessage(d.text.address, d.firstName,
                        {
                            speed: bSpeed,
                            direction: bDir,
                            duration: "5"
                        }
                    )
                    d.text.sent = true
                }
                if (d.text.duration === 2 &&
                    aSpeed >= d.text.speed &&
                    Math.abs(270 - aDir) <= d.text.errorAngle) {
                    sendTextMessage(d.text.address, d.firstName,
                        {
                            speed: aSpeed,
                            direction: aDir,
                            duration: "15"
                        }
                    )
                    d.text.sent = true
                }
                if (d.text.sent === true) {
                    console.log("sending text to ", d.email)
                    await setDoc(doc(db, 'users', v), d)
                }
            }
            else {
                // console.log("already sent to", v, " => ", d)
            }
        })
    } else {
        msg += "addData called with no data\n"
        console.log("   addData called with no data")

    }
    //let's work on hours Db
    const dtd = (Date.now() + offset) / 1000 //+ 60 * tdLast.getTimezoneOffset()
    const thisHour = 3600 * Math.floor(dtd / 3600)
    const twoDaysAgo = thisHour - 48 * 3600

    // delete older records
    connection?.query(`DELETE FROM hours WHERE start < ${twoDaysAgo}`, (err, results, fields) => { })
    connection?.query(`DELETE FROM hours WHERE start > ${thisHour}`, (err, results, fields) => { })

    // get latest record (or 2 days ago if there are none)
    sql = `SELECT * FROM hours WHERE start > ${twoDaysAgo} ORDER BY start DESC LIMIT 1`
    connection?.query(sql, (err, results, fields) => {
        let hourLength = 0
        latestHours = twoDaysAgo
        if (Array.isArray(results)) {
            const d = JSON.parse(results[0].data)
            latestHours = d.start
            hourLength = d.date.length
        }
        // console.log(results[0].data)
        msg += "latest hour starts at " + latestHours + "\n"
        // for each hour starting at 'latestHour', thru 'thisHour'
        for (let i = latestHours; i <= thisHour; i += 3600) {
            const data = {
                start: i, date: [], speed: [], direction: [],
                humidity: [], pressure: [], temperature: [],
            }
            msg += "pull from gliderport: records from " + timestampToString(i) + " to " + timestampToString(i + 3600) + "\n"
            sql = "SELECT * FROM gliderport WHERE recorded >= '" + timestampToString(i) + "' AND recorded < '" + timestampToString(i + 3600) + "'"
            connection?.query(sql, (err, results, fields) => {
                if (Array.isArray(results)) {
                    msg += "found " + results.length + "\n"
                    results.forEach((v, j) => {
                        data.date.push(
                            (new Date(v.recorded).getTime() + offset) / 1000 - i
                        )
                        data.speed.push(v.speed)
                        data.direction.push(v.direction)
                        data.humidity.push(v.humidity)
                        data.pressure.push(v.pressure)
                        data.temperature.push(v.temperature)
                    })
                } else {
                    msg += "found none\n"
                }

                console.log("   latest hour in hours table starts at ", latestHours, " had ",
                    hourLength, " rows and now has ", data.date.length, " rows")
                msg += "replacing " + data.start + " with " + data.date.length + " records\n"
                sql = "REPLACE into hours (`start`, `data`) value(" + data.start + ",'" + JSON.stringify(data) + "')"
                connection?.query(sql, (err, results, fields) => { })
            })
        }
    })

    // read the last time we looked for the forecast
    let tsLast = 0, sunset = 0
    connection.query('SELECT * FROM `server_sent` WHERE `id`=1',
        function (err, results, fields) {
            if (Array.isArray(results)) {
                if (results[0].last_forecast) tsLast = results[0].last_forecast
                if (results[0].sunset_timestamp) sunset = results[0].sunset_timestamp
            }
            const tsNow = parseInt((new Date()).getTime() / 1000)
            // if it's been more than one hours, update the forecast
            console.log(`it has been ${toHMS((tsLast + 1 * 60 * 60) - tsNow)} sec since last forecast, wait at least 1hr`)

            if (tsNow > tsLast + 1 * 60 * 60) {
                console.log("Attempting to update forecast since last was ", tsLast, " and now is ", tsNow)
                // https://api.openweathermap.org/data/2.5/onecall?lat=32.8473&lon=-117.2742&exclude=minutely,daily&units=imperial&appid=483c6b4301f7069cbf4e266bffa6d5ff

                const url =
                    "https://api.openweathermap.org/data/2.5/onecall" +
                    "?lat=32.8473&lon=-117.2742" +
                    "&exclude=minutely,daily" +
                    "&units=imperial" +
                    "&appid=483c6b4301f7069cbf4e266bffa6d5ff"
                fetch(url)
                    .then((response) => response.json())
                    .then((responseJson) => {
                        if (!responseJson || !responseJson.hourly) {
                            msg += "OpenWeather Data Offline\n"
                            console.log("OpenWeather Data Offline")
                        } else {
                            let forecast = []
                            let todaysCodes = []
                            let lastCode = -1
                            console.log(`found ${responseJson.hourly.length} hours in forecast, starting at ${timestampToString(responseJson.hourly[0].dt + offset / 1000)} ending ${timestampToString(responseJson.hourly[responseJson.hourly.length - 1].dt + offset / 1000)}`)
                            console.log(`${responseJson.hourly[0].dt} to ${responseJson.hourly[responseJson.hourly.length - 1].dt}`)
                            responseJson.hourly.forEach((v, i) => {
                                if (v.dt > tsNow) {
                                    const code = getCode(v.wind_speed * 10, v.wind_deg, 0)
                                    forecast.push([v.dt, code])
                                    if (lastCode != code && v.dt < sunset) {
                                        lastCode = code
                                        todaysCodes.push([(new Date(1000 * v.dt)).getHours(), codesMeaning[code]])
                                    }
                                }
                            })
                            console.log("forecast: ", forecast)
                            console.log("todaysCodes: ", todaysCodes)
                            connection?.query("UPDATE `server_sent` SET `last_forecast`=" + tsNow + " WHERE `id`=1", (err, results, fields) => { })
                            connection?.query("UPDATE `miscellaneous` SET `data`='" + JSON.stringify(forecast) + "' WHERE `id`='forecast'")
                            const h = responseJson.hourly
                            h.forEach((v, i) => {
                                let z = v.weather
                                Object.keys(z[0]).forEach((w, j) => {
                                    v["weather_" + w] = z[0][w]
                                })
                                delete (h[i].weather)
                            })
                            connection?.query("UPDATE `miscellaneous` SET `data`='" + JSON.stringify(h) + "' WHERE `id`='forecast_full'")
                            connection?.query("UPDATE `miscellaneous` SET `data`='" + JSON.stringify(todaysCodes) + "' WHERE `id`='todays_codes'")
                        }
                    })
            }

            // get the last timestamp from code_history
            connection?.query(
                "SELECT * FROM code_history ORDER BY date DESC LIMIT 1",
                function (err, results, fields) {
                    const date = 24 * 3600 * parseInt(results[0].date / (24 * 3600))
                    console.log("   DEBUG: latest code history date reset to ", timestampToString(date), " ", date)
                    const r = { date: date, data: JSON.parse(results[0].data) }
                    // if it exists it will have at least two points, sunrise and sunset
                    // pop off sunset (it's always add to the end of a day)
                    r.data.codes.pop()
                    // at least sunrise should still be in the array
                    let tsLast = r.date + 3600 * r.data.limits[0]
                    let lc = 0
                    if (r.data.codes.length === 0) {
                        console.log("   ERROR: Found a zero length codes on ", timestampToString(r.date))
                    } else {
                        tsLast += r.data.codes[r.data.codes.length - 1][0]
                        lc = r.data.codes[r.data.codes.length - 1][1]
                    }

                    sql = "SELECT * FROM gliderport WHERE recorded > '" +
                        timestampToString(tsLast) + "'"
                    connection?.query(sql, (err, results, fields) => {
                        if (Array.isArray(results)) {
                            console.log("   Since the last record in code_history at ", timestampToString(tsLast), " with code ",
                                lc, ", there are ", results.length, " new data points in gliderport")
                            let c = 0
                            let lastTs = tsLast + 120 // 2 min after last
                            results.forEach((v, i) => {
                                c++
                                const ts = Math.round(((new Date(v.recorded)).getTime() + offset) / 1000)
                                // if (i % 1000 === 0) console.log(`   DEBUG: ${ts} : ${r.date + r.data.sun[0]} : ${r.date + r.data.sun[1]}`)
                                if (ts > r.date + r.data.sun[0]) {
                                    // after sunrise
                                    // if r.data.codes is empty then add sunrise point
                                    if (r.data.codes.length === 0) {
                                        if (i > 0)
                                            lc = getCode(results[i - 1].speed, results[i - 1].direction)
                                        else
                                            lc = getCode(v.speed, v.direction)
                                        r.data.codes.push([r.data.sun[0] - 3600 * r.data.limits[0], lc])
                                    }

                                    if (ts < r.date + r.data.sun[1]) {
                                        //before sunset
                                        // check code for change
                                        const c = getCode(v.speed, v.direction)
                                        // make a code last at least 5min (300s)
                                        if ((c != lc) && (ts - lastTs > 120)) {
                                            lc = c
                                            // add to r.data.codes code_history[ts, code]
                                            r.data.codes.push([ts - 3600 * r.data.limits[0] - r.date, lc])
                                            lastTs = ts
                                        }
                                    }
                                    // if it's after sunset OR it's the last data point AND there is stuff to save
                                    if (((i === results.length - 1) && (r.data.codes.length > 0)) || ts >= r.date + r.data.sun[1]) {
                                        // add sunset point
                                        r.data.codes.push([r.data.sun[1] - 3600 * r.data.limits[0], 0])
                                        // anything we save should now have at least sunrise AND sunset points (2)
                                        // save this day in code_history
                                        sql = "INSERT INTO `code_history` SET date="
                                            + r.date
                                            + ", data='"
                                            + JSON.stringify(r.data)
                                            + "' ON DUPLICATE KEY UPDATE data ='"
                                            + JSON.stringify(r.data) + "'"
                                        connection?.query(sql, () => { })
                                        // console.log(`   DEBUG: saving ${JSON.stringify(r)} `)
                                        console.log("   add ", r.data.codes.length, " new code(s) to code_history table for day ",
                                            timestampToString(r.date), " form ", c, " points")
                                        c = 0

                                        // if (r.date < 2665558000) {
                                        //     let s = "["
                                        //     r.data.codes.forEach((w, j) => {
                                        //         s += '[' + w[0] + ',' + w[1] + '],'
                                        //     })
                                        //     s += ']'
                                        //     console.log("date: ", r.date, ", data: {limits: [ ", r.data.limits[0], ", ",
                                        //         r.data.limits[1], " ], sun: [ ", r.data.sun[0], ", ", r.data.sun[1], " ], code:", s)
                                        // }

                                        // create a new day
                                        r.date += 24 * 3600
                                        //make sure the local time is in the next day (sub offset)
                                        const y = new Date((r.date * 1000) - offset)
                                        const sunData = calculateSunrise(y)
                                        // console.log(`   DEBUG: y:${y.getTime() / 1000} r.date: ${r.date} sunrise: ${sunData.sunriseTimestamp}`)
                                        r.data.codes = []
                                        //  sunriseTimestamp is true local sunrise, r.date is midnight UTC, so add the timezone offset
                                        r.data.sun = [sunData.sunriseTimestamp - r.date + offset / 1000, sunData.sunsetTimestamp - r.date + offset / 1000]
                                        r.data.limits = [Math.floor(24 * sunData.sunrise) - 1, Math.floor(24 * sunData.sunset) + 2]

                                        // console.log(`   DEBUG: y:${JSON.stringify(r.data)} `)
                                    }
                                }
                            })
                        }
                    })
                }
            )
        }
    )
    res.send(msg)
})

const c = {
    IT_IS_DARK: 0,
    SLED_RIDE_BAD_ANGLE: 1,
    SLED_RIDE_POOR_ANGLE: 2,
    SLED_RIDE: 3,
    BAD_ANGLE: 4,
    POOR_ANGLE: 5,
    GOOD: 6,
    EXCELLENT: 7,
    SPEED_BAR: 8,
    TOO_WINDY: 9,
    NO_DATA: 10,
}

const codesMeaning = [
    "it is dark",
    "sled ride, bad angle",
    "sled ride, poor angle",
    "sled ride",
    "bad angle",
    "poor angle",
    "good",
    "excellent",
    "speed bar",
    "too windy",
    "no data",
]

function getCode(speed, direction, isItDark) {
    if (isItDark) {
        return c.IT_IS_DARK
    } else {
        if (speed < 60) {
            if (direction > 310 || direction < 230) {
                return c.SLED_RIDE_BAD_ANGLE
            } else if (direction > 302 || direction < 236) {
                return c.SLED_RIDE_POOR_ANGLE
            } else {
                return c.SLED_RIDE
            }
        } else if (speed < 210) {
            if (direction > 310 || direction < 230) {
                return c.BAD_ANGLE
            } else if (direction > 302 || direction < 236) {
                return c.POOR_ANGLE
            } else {
                if (speed <= 110) {
                    return c.GOOD
                } else if (speed < 150) {
                    return c.EXCELLENT
                } else {
                    return c.SPEED_BAR
                }
            }
        } else {
            return c.TOO_WINDY
        }
    }
}

// called by gliderport Pi3 to see what needs updating
app.get("/getLastEntry", (req, res) => {
    if (lastRecord) res.send(lastRecord)
    else res.send("Failure")
})

// called from browser for debug to display latest happenings
app.get("/info", (req, res) => {
    let content = "<p><table>"
    content += `<tr><td>last Record in gliderport table:</td><td>${lastRecord}</td></tr><tr></tr>`
    if (firstRecord === undefined) {
        content += `<tr><td>Most recent addData at:</td><td>Never Called</td></tr>`
        content += `<tr><td></td><td>First Record of last added:</td><td>Never Called</td></tr>`
        content += `<tr><td></td><td>Number of Records added:</td><td>Never Called</td></tr>`
    } else {
        content += `<tr><td>Most recent addData at:</td><td>${tdLast.toDateString()}</td></tr>`
        content += `<tr><td></td><td>First Record of last added:</td><td>${firstRecord}</td></tr>`
        content += `<tr><td></td><td>Number of Records added:</td><td>${numberRecords}</td></tr>`

    }
    if (latestHours === 0)
        content += `<tr><td></td><td>Latest Hours table timestamp is:</td><td>Never Called</td></tr>`
    else
        content += `<tr><td></td><td>Latest Hours table timestamp is:</td><td>${latestHours}</td><td>${timestampToString(latestHours)}</td></tr>`
    content += `</table></p>`

    content +=
        "<p><table><tr><td>Sunrise</td><td>" +
        sunData.sunriseTime?.toLocaleString("en-US", {
            timeZone: "America/Los_Angeles",
        }) +
        "</td></tr>"
    content +=
        "<tr><td>Sunset</td><td>" +
        sunData.sunsetTime?.toLocaleString("en-US", {
            timeZone: "America/Los_Angeles",
        }) +
        "</td></tr></table></p>"

    sql = "SELECT * FROM `hours` ORDER BY start DESC"
    connection?.query(sql, (err, results, fields) => {
        content += `<h3>Hours has ${results.length} entries</h3>`
        content += `<p><table style="text-align: center;">`
        content += `<tr><th>Hour Start</th><th>Hours count</th><th>Gliderport count</th></tr>`
        let l = []
        results.forEach((v, i) => {
            const d = JSON.parse(v.data)
            l.push([v.start, d.date.length])

        })
        l.forEach((v, i) => {
            sql = "SELECT * FROM gliderport WHERE recorded >= '" + timestampToString(v[0]) +
                "' AND recorded < '" + timestampToString(v[0] + 3600) + "'"
            connection?.query(sql, (err, results, fields) => {
                content += `<tr><td>${timestampToString(v[0]).replace("00:00", "00")}</td><td>${v[1]}</td><td>${results.length}</td></tr>`
                if (i === l.length - 1) content += `</table></p>`
            })
        })

        connection.query('SELECT * FROM `server_sent` WHERE `id`=1',
            function (err, results, fields) {
                content += `<h3>Server Sent Table</h3><p><table>`
                const tsNow = parseInt((new Date()).getTime() / 1000)
                content += `<tr><td><b>Now</b></td><td>(${tsNow})  <b>${timestampToString(tsNow)}</b></td></tr><tr></tr>`
                for (const [key, value] of Object.entries(results[0])) {
                    if ('last_record' === key || 'last_image' === key || 'last_forecast' === key ||
                        'sunrise_timestamp' === key || 'sunset_timestamp' === key) {
                        let deltaStr = ""
                        let delta = tsNow - value
                        let end = "ago"
                        if (delta < 0) {
                            delta = -delta
                            end = "from now"
                        }
                        if (delta > 3600) {
                            deltaStr += parseInt(delta / 3600) + " hr, "
                            delta -= 3600 * parseInt(delta / 3600)
                        }
                        if (delta > 60) {
                            deltaStr += parseInt(delta / 60) + " min, "
                            delta -= 60 * parseInt(delta / 60)
                        }
                        deltaStr += parseInt(delta) + " sec " + end
                        content += `<tr><td>${key}</td><td>(${value})  <b>${timestampToString(value)}</b>   (${deltaStr})</td></tr>`
                    } else
                        content += `<tr><td>${key}</td><td>${value}</td></tr>`
                }
                content += `</table></p>`

                content += `<h3>Code History Table</h3><p><table>`
                connection?.query(
                    "SELECT * FROM code_history ORDER BY date DESC LIMIT 10",
                    function (err, results, fields) {
                        results.forEach((v, i) => {
                            const r = { date: v.date, data: JSON.parse(v.data) }
                            content += `<tr><td>${timestampToString(r.date).replace(/ .*/g, '')}</td><td>${r.data.codes.length} changes</td></tr>`
                        })
                        content += `</table></p>`
                        const r = { date: results[0].date, data: JSON.parse(results[0].data) }
                        const s = r.data.limits[0]
                        content += `<h3>Latest Code History Table for ${timestampToString(r.date).replace(/ .*/g, '')} with ${r.data.codes.length} code changes</h3><p><table>`
                        content += `<tr><td>start</td><td>${s} hr</td><td>${s * 3600} s</td></tr>`
                        content += `<tr><td>stop</td><td>${r.data.limits[1]} hr</td><td>${r.data.limits[1] * 3600} s</td></tr>`
                        content += `<tr><td>First at</td><td>${r.data.codes[0][0]}s after start</td><td>${3600 * s + r.data.codes[0][0]} from day start</td></tr>`
                        content += `<tr><td>Sunrise</td><td>${r.data.sun[0]}s</td></tr>`
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
                            "No data"
                        ]
                        r.data.codes.forEach((v, i) => content += `<tr><td>${v[0]}</td><td>${toHMS(v[0] + 3600 * s)}</td><td>${codes[v[1]]} (${v[1]})</td></tr>`)
                        content += `</table></p>`
                        res.send(content)
                    }
                )
            }
        )
    })
    console.log("info called")
})

app.get('/current.jpg', function (req, res) {
    res.contentType('image/jpeg');
    res.send(imageBuffer)
})
app.get('/currentBig.jpg', function (req, res) {
    res.contentType('image/jpeg');
    res.send(imageBigBuffer)
})

app.get("/UpdateStatus", (req, res) => {
    // defunct
    res.send("No longer does anything")
})

// defunct, no longer needed
app.get("/ImageAdded", (req, res) => {
    res.send("Ok")
})


app.get("/sendTestSms", (req, res) => {
    if ("to" in req.query && "name" in req.query) {
        sendTextMessage(req.query.to, req.query.name, null)
        res.send("Ok")
    } else {
        res.send("did not get name & to")
    }
})

// Call to find out carrier of a phone number
app.get("/PhoneFinder", (req, res) => {
    if ("area" in req.query && "prefix" in req.query && "number" in req.query) {
        // https://www.fonefinder.net/findome.php?npa=530&nxx=613&thoublock=5388&usaquerytype=Search+by+Number
        const url = `https://www.fonefinder.net/findome.php?npa=${req.query.area}&nxx=${req.query.prefix}` +
            `&thoublock=${req.query.number}&usaquerytype=Search+by+Number`
        fetch(url)
            .then((response) => response.text())
            .then((responseText) => {
                const secondTablePosition = responseText.split('<TABLE', 1).join('<TABLE').length;
                responseText = responseText.slice(secondTablePosition, responseText.length - 1)
                const secondTrPosition = responseText.split('<TR', 2).join('<TR').length;
                responseText = responseText.slice(secondTrPosition, responseText.length - 1)
                const secondTdPosition = responseText.split('<TD', 5).join('<TD').length;
                responseText = responseText.slice(secondTdPosition, responseText.length - 1)
                responseText = responseText.replace(/<TD><A HREF=\'http:\/\/fonefinder.net\//, "")
                responseText = responseText.replace(/\.php\'.*/, "")
                responseText = responseText.split('\n')[0];
                responseText = responseText.split('\r')[0];
                res.send(responseText)
            })
    }
    else {
        res.send("none")
    }
})


const getTsFromDate = (date) => {
    return parseInt(date.getTime() / 1000)
}

const getSQLDate = (date) => {
    return date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2)
}


const getWeekCount = (start, stop) => {
    let startDay = start
    let stopDay = stop
    console.log("******** Adding a week hitcount from: ", startDay, " to: ", stopDay)
    connection?.query(`select count(*) AS count from hit_counter where hit > '${startDay} 08:00:00' AND hit < '${stopDay} 08:00:00'`,
        (err, c, fields) => connection?.query(`select count(DISTINCT IP) AS count from hit_counter where hit > '${startDay} 08:00:00' AND hit < '${stopDay} 08:00:00'`,
            (err, d, fields) => connection?.query("INSERT INTO hit_counter_week (`day`, total, `unique`) VALUES ('" + startDay + "', " + c[0].count + ", " + d[0].count + ")")
        )
    )
}

const getDayCount = (start, stop) => {
    let startDay = start
    let stopDay = stop
    console.log("******** Adding a day hitcount from: ", startDay, " to: ", stopDay)
    connection?.query(`select count(*) AS count from hit_counter where hit > '${startDay} 08:00:00' AND hit < '${stopDay} 08:00:00'`,
        (err, c, fields) => connection?.query(`select count(DISTINCT IP) AS count from hit_counter where hit > '${startDay} 08:00:00' AND hit < '${stopDay} 08:00:00'`,
            (err, d, fields) => connection?.query("INSERT INTO hit_counter_day (`day`, total, `unique`) VALUES ('" + startDay + "', " + c[0].count + ", " + d[0].count + ")")
        )
    )
}


// Update Day and Week hit_counter databases on each new day
setInterval(async () => {
    if (d != new Date().getDate()) {
        //it is a new day of the month
        d = new Date().getDate()
        handleHits()
        resetAllSentTexts()
    }
}, 3 * 3600 * 1000) // every 3 hours


const handleHits = async () => {
    var dt
    var retString = ""
    // Check for needed updates on hit_counter_week
    let res = await connection?.promise().query(`SELECT MIN(hit) AS startDate FROM hit_counter WHERE 1`)
    const startDate = (res != undefined) ? (res[0] != undefined ? (Array.isArray(res[0]) ? res[0][0].startDate : 0) : 0) : 0

    res = await connection?.promise().query(`SELECT MAX(hit) AS endDate FROM hit_counter WHERE 1`)
    const endDate = (res != undefined) ? (res[0] != undefined ? (Array.isArray(res[0]) ? res[0][0].endDate : 0) : 0) : 0
    let lastEntry = new Date(endDate)

    retString +=
        res = await connection?.promise().query(`SELECT MAX(day) AS maxDate FROM hit_counter_week WHERE 1`)
    let results = res[0]
    dt = new Date()
    if (Array.isArray(results)) {
        dt = new Date(results[0].maxDate)
        dt.setDate(dt.getDate() + 7)
    } else {
        console.log("weeks table is empty")
        dt = new Date(startDate)
    }

    let startDay = getSQLDate(dt)
    dt.setDate(dt.getDate() + 7)
    let stopDay = getSQLDate(dt)

    retString += "**** WEEK ***** </br>"
    retString += "start day " + startDay + "</br>"
    retString += "stop day " + stopDay + "</br>"
    retString += "dt         : " + dt + "</br>"
    retString += "last Entry : " + lastEntry + "</br>"
    while (dt < lastEntry) {
        getWeekCount(startDay, stopDay);
        startDay = stopDay
        dt.setDate(dt.getDate() + 7)
        stopDay = getSQLDate(dt)
    }

    // Check for needed updates on hit_counter_day
    res = await connection?.promise().query(`SELECT MAX(day) AS maxDate FROM hit_counter_day WHERE 1`)
    results = res[0]
    if (Array.isArray(results)) {
        dt = new Date(results[0].maxDate)
        dt.setDate(dt.getDate() + 1)
    } else {
        console.log("weeks table is empty")
        dt = new Date(startDate)
    }
    startDay = getSQLDate(dt)
    dt.setDate(dt.getDate() + 1)
    stopDay = getSQLDate(dt)

    retString += "***** DAY ***** </br>"
    retString += "start day " + startDay + "</br>"
    retString += "stop day " + stopDay + "</br>"
    retString += "dt         : " + dt + "</br>"
    retString += "last Entry : " + lastEntry + "</br>"
    while (dt < lastEntry) {
        getDayCount(startDay, stopDay);
        startDay = stopDay
        dt.setDate(dt.getDate() + 1)
        stopDay = getSQLDate(dt)
    }

    //update hit_stats in miscellaneous
    let t
    results = await connection?.promise().query("SELECT * FROM miscellaneous WHERE id='hit_stats'")
    t = JSON.parse(results[0][0].data)
    const replacement = {}
    replacement.lastReset = t.lastReset

    const row = await connection?.promise().query(`select count(*) AS count from hit_counter where 1`)
    replacement.total = { count: row[0][0].count }

    const latest = await connection?.promise().query(`SELECT MAX(hit) AS latest FROM hit_counter WHERE 1`)
    dt = latest[0][0].latest
    dt.setTime(dt.getTime() + 2 * offset)
    replacement.total.date = dt.toISOString().replace("T", " ").replace(/\.[0-9]*Z/, "")

    const wks = await connection?.promise().query(`SELECT * FROM hit_counter_week WHERE 1`)
    const weeks = { start: "", totals: [], uniques: [] }
    weeks.start = wks[0][0].day.toISOString().replace(/T.*/, " ")
    let unique = 0, total = 0
    wks[0].forEach((v, i) => {
        weeks.totals.push(v.total)
        weeks.uniques.push(v.unique)
        unique += v.unique
    })
    replacement.total.unique = unique
    replacement.weeks = weeks

    replacement.week = wks[0][wks[0].length - 1]
    replacement.week.day = getSQLDate(replacement.week.day)
    unique = 0, total = 0
    for (let i = wks[0].length - 4; i < wks[0].length; i++) {
        const element = wks[0][i]
        unique += element.unique
        total += element.total
    }
    replacement.month = { unique, total }

    const y = await connection?.promise().query(`SELECT * FROM hit_counter_day ORDER BY day DESC LIMIT 1`)
    replacement.day = y[0][0]
    replacement.day.day = getSQLDate(replacement.day.day)

    connection?.query(`REPLACE into miscellaneous(id, data) VALUES('hit_stats', '${JSON.stringify(replacement)}')`, () => { })
}

const sendTextMessage = (to, name, data) => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'glider.port.wind.alert@gmail.com',
            pass: 'qxhzpfxewjdnqcky',
        },
    })

    var mailOptions = {
        from: 'glider.port.wind.alert@gmail.com',
        name: 'Gliderport Wind',
        to: to,
        subject: '',
    }
    if (data === null) {
        mailOptions.text = `Hi ${name}, This message is a test from the gliderport`
    } else {
        mailOptions.text = `${name}, Time to Fly!\n` +
            `Wind was at ${Math.round(data.direction)} deg at ${Math.round(data.speed / 10)} mph over the past ${data.duration} min, ` +
            "\nMake changes to your alert <a href='https://live.flytorrey.com'>here</a>"
    }
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    })
}