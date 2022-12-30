import express from "express"
import dotenv from "dotenv"
import mysql from "mysql2"
import base64url from "base64url"
import calculateSunrise from "./calculateSunrise.js"
import { Http2ServerRequest } from "http2"
dotenv.config()

let DEBUG = true

process.env.TZ = "America/Los_Angeles"
let offset = -60000 * new Date().getTimezoneOffset()
console.log("offset ", offset)
// A node server used to:
// 1. check every hour if it's a new day and update sunrise/set data (updateSunData)
// 2. respond to the following calls:
//  a. '/getLastEntry'  : called from Pi3: return the last entry in gliderport db
//  b. '/lastAdded'     : for browser    : Debug page to display latest happenings
//  c. '/ImageAdded'    : called from Pi3: Update the time the last image was added to now in the server_sent table
//  d. '/UpdateStatus'  : called from Pi4: Online status was checked so update those fields in server_sent and network_status
//  e. '/addData'       : called from Pi3: with new record(s)

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

//call every hour
let id = setInterval(() => {
    if (TodaysDay != new Date().getDate()) {
        TodaysDay = new Date().getDate()
        sunData = calculateSunrise(new Date())
        updateSunData()
    }
}, 3600000)

const setLastRecord = () => {
    connection?.query(
        "SELECT * FROM gliderport ORDER BY recorded DESC LIMIT 1",
        function (err, results, fields) {
            lastRecord = results ? new Date(new Date(results[0].recorded).getTime() + offset).toISOString() : "0"
            lastRecord = lastRecord.replace("T", " ")
            lastRecord = lastRecord.replace(".000Z", "")
            // console.log("last record: ", lastRecord)
        }
    )
}
setLastRecord()

const app = express()

const port = process.env.PORT || 1234
app.listen(port, () => {
    console.log(`Updater listening on port data.${port}`)
})

app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(express.json({ limit: "10mb" }))
app.use(express.static("./public"))

app.get("/getLastEntry", (req, res) => {
    if (lastRecord) res.send(lastRecord)
    else res.send("OK")
})

// called from browser to display latest happenings
app.get("/lastAdded", (req, res) => {
    let content = "<p>Last Data received at: " + tdLast.toDateString() + " " +
        tdLast.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }) + "</p>"
    content += "<p>first Record: " + firstRecord + "</p>"
    content += "<p>last Record: " + lastRecord + "</p>"
    content += "<p>number of Records: " + numberRecords + "</p>"
    if (latestHours > 0)
        content += "<p>Latest Hours timestamp is: " + latestHours + "</p>"
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
    res.send(content)
    console.log("lastAdded called")
})


let imageBuffer, imageBigBuffer
app.post("/updateSmallImage", (req, res) => {
    // console.log("post Data: ", req.body)
    imageBuffer = base64url.toBuffer(req.body.A)
    connection?.query("UPDATE images SET d=? WHERE `id`=1", imageBuffer, () => { })
    res.json("Ok")
})
app.post("/updateBigImage", (req, res) => {
    // console.log("post Data: ", req.body)
    imageBigBuffer = base64url.toBuffer(req.body.A)
    connection?.query(
        "UPDATE `server_sent` SET `last_image`=" +
        Math.floor(new Date().getTime() / 1000) +
        " WHERE `id`=1",
        () => { }
    )
    connection?.query("UPDATE images SET d=? WHERE `id`=2", imageBigBuffer, () => { })
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
        start: twoDaysAgo,
        date: [],
        speed: [],
        direction: [],
        humidity: [],
        pressure: [],
        temperature: [],
    }
    let msg = "pull from gliderport: records from " + dt.toISOString() + "<br/>\n"
    console.log("pull from gliderport: records from " + dt.toISOString())
    sql = "SELECT * FROM `gliderport` WHERE recorded > '" + dt.toISOString() + "'"
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
                        start: start,
                        date: [],
                        speed: [],
                        direction: [],
                        humidity: [],
                        pressure: [],
                        temperature: [],
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

// defunct, no longer needed
app.get("/ImageAdded", (req, res) => {
    res.send("Ok")
})

app.get('/current.jpg', function (req, res) {
    res.contentType('image/jpeg');
    res.send(imageBuffer)
})
app.get('/currentBig.jpg', function (req, res) {
    res.contentType('image/jpeg');
    res.send(imageBigBuffer)
})

// ping this page to update the "latest Image" field in the server_sent table
app.get("/UpdateStatus", (req, res) => {
    if (req.query.password != "ilove2fly") {
        console.log(req.query.password, " != ilove2fly")
        // res.send(req.query)
        res.send("Password incorrect")
        return
    }
    if (req.query.status === undefined) {
        res.send("no status given")
        return
    }
    let ts = (Date.now() + offset) / 1000
    if (req.query.status === 2) {
        sql = "UPDATE `server_sent` SET `online_status_touched`='" + ts + "' WHERE 1"
        connection?.query(sql, (err, results, fields) => { })
        res.send("online status touched updated to now")
    } else
        if (req.query.status === 0 || req.query.status === 1) {
            sql = "UPDATE `server_sent` SET `online_status`=" + req.query.status + " WHERE `id`=1"
            connection?.query(sql, (err, results, fields) => { })

            sql = "INSERT INTO `network_status`(`recorded`, `status`) VALUES ('" + ts + "'," + req.query.status + ")"
            connection?.query(sql, (err, results, fields) => { })
            res.send("online status updated to ", req.query.status === 0 ? "offline" : "online")
        } else
            console.log("Updated status called with a wrong number")
})

// called to add new wind Data to the db
app.post("/addData", (req, res) => {
    console.log("add data called")
    let msg = ""
    if ("d" in req.body) {
        const d = JSON.parse(req.body.d)
        sql =
            "INSERT INTO gliderport (recorded, speed, direction, humidity, pressure, temperature ) VALUES "
        let e = ","
        firstRecord = d[0][0]
        numberRecords = d.length
        msg += numberRecords + " records added to gliderport"
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
            sql =
                "UPDATE `server_sent` SET `last_record`=" +
                new Date(last[0]).getTime() / 1000 +
                ", `speed` = " + last[1] +
                ", `direction` = " + last[2] +
                ", `humidity` = " + last[3] +
                ", `pressure` = " + last[4] +
                ", `temperature` = " + last[5] +
                " WHERE `id`=1"
            connection?.query(sql, (err, results, fields) => { })
        })
    } else {
        msg += "addData called with no data\n"
    }
    //let's work on hours Db
    const dtd = (Date.now() + offset) / 1000 //+ 60 * tdLast.getTimezoneOffset()
    const thisHour = 3600 * Math.floor(dtd / 3600)
    const twoDaysAgo = thisHour - 48 * 3600

    // delete older records
    sql = "DELETE FROM hours WHERE `start` < " + twoDaysAgo
    connection?.query(sql, (err, results, fields) => { })
    sql = "DELETE FROM hours WHERE `start` > " + thisHour
    connection?.query(sql, (err, results, fields) => { })

    // get latest record (or 2 days ago if there are none)
    sql = "SELECT * FROM `hours` WHERE `start` > " + twoDaysAgo + " ORDER BY start DESC LIMIT 1"
    connection?.query(sql, (err, results, fields) => {
        latestHours = Array.isArray(results) ? results[0].start : twoDaysAgo
        msg += "latest hour starts at " + latestHours + "\n"
        // for each hour starting at 'latestHour', thru 'thisHour'
        for (let i = latestHours; i <= thisHour; i += 3600) {
            const data = {
                start: i,
                date: [],
                speed: [],
                direction: [],
                humidity: [],
                pressure: [],
                temperature: [],
            }
            let dt1 = new Date(i * 1000)
            let dt2 = new Date((3600 + i) * 1000)
            msg += "pull from gliderport: records from " + dt1.toISOString() + " to " + dt2.toISOString() + "\n"
            sql = "SELECT * FROM `gliderport` WHERE recorded > '" + dt1.toISOString() + "' AND recorded <= '" + dt2.toISOString() + "'"
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

                msg += "replacing " + data.start + " with " + data.date.length + " records\n"
                console.log(msg)
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
            console.log("last Forecast: ", tsLast)
            const tsNow = (new Date()).getTime() / 1000
            console.log("Now: ", tsNow)
            // if it's been more than one hours, update the forecast
            if (tsNow > tsLast + 1 * 60 * 60) {
                msg += "Updated forecast\n"
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
                        } else {
                            let forecast = []
                            let todaysCodes = []
                            let lastCode = -1
                            responseJson.hourly.forEach((v, i) => {
                                if (v.dt > tsNow) {
                                    const code = getCode(v.wind_speed * 10, v.wind_deg, 0)
                                    forecast.push([v.dt, code])
                                    // console.log((new Date(1000 * v.dt)).getHours())
                                    if (lastCode != code && v.dt < sunset) {
                                        lastCode = code
                                        todaysCodes.push([(new Date(1000 * v.dt)).getHours(), codesMeaning[code]])
                                    }
                                }
                            })
                            // console.log("forecast: ", forecast)
                            // console.log("todaysCodes: ", todaysCodes)
                            connection?.query("UPDATE `server_sent` SET `last_forecast`=" + tsNow + " WHERE `id`=1", (err, results, fields) => { })
                            connection?.query("UPDATE `miscellaneous` SET `data`='" + JSON.stringify(forecast) + "' WHERE `id`='forecast'")
                            connection?.query("UPDATE `miscellaneous` SET `data`='" + JSON.stringify(todaysCodes) + "' WHERE `id`='todays_codes'")
                        }
                    })
            }

            // get the last timestamp from code_history
            connection?.query(
                "SELECT * FROM code_history ORDER BY date DESC LIMIT 1",
                function (err, results, fields) {
                    const r = { date: results[0].date, data: JSON.parse(results[0].data) }
                    const tsLast = r.date + 3600 * r.data.limits[0] + r.data.codes[r.data.codes.length - 1][0]
                    console.log("last record: ", tsLast)
                    let lc = r.data.codes[r.data.codes.length - 1][1]
                    console.log("last code: ", lc)
                    console.log((new Date(tsLast * 1000)).toISOString())
                    sql = "SELECT * FROM `gliderport` WHERE recorded > '" + (new Date(tsLast * 1000)).toISOString() + "'"
                    connection?.query(sql, (err, results, fields) => {
                        if (Array.isArray(results)) {
                            console.log("found: ", results.length)
                            console.log("last: ", results[results.length - 1].recorded)
                            results.forEach((v, i) => {
                                const ts = Math.round((new Date(v.recorded)).getTime / 1000)
                                if (ts > r.date + r.data.sun[0]) {
                                    if (ts < r.date + r.data.sun[1]) {
                                        // if r.data.codes is empty then add sunrise point
                                        if (r.data.codes.length === 0) {
                                            if (i > 0)
                                                lc = getCode(results[i - 1].speed, results[i - 1].direction)
                                            else
                                                lc = getCode(v.speed, v.direction)
                                            r.data.codes.push(
                                                [
                                                    r.data.sun[0] - 3600 * r.data.limits[0],
                                                    lc
                                                ]
                                            )
                                        }
                                        // check code for change
                                        const c = getCode(v.speed, v.direction)
                                        if (c != lc) {
                                            lc = c
                                            // add to r.data.codes [ts, code]
                                            r.data.codes.push(
                                                [
                                                    ts - 3600 * r.data.limits[0] - r.date,
                                                    lc
                                                ]
                                            )
                                        }
                                    } else {
                                        // add sunset point
                                        r.data.codes.push([r.data.sun[1] - 3600 * r.data.limits[0], 0])
                                        // save this day in code_history
                                        sql = "INSERT INTO `code_history` SET date="
                                            + r.date
                                            + ", data='"
                                            + JSON.stringify(r.data)
                                            + "' ON DUPLICATE KEY UPDATE data ='"
                                            + JSON.stringify(r.data) + "'"
                                        connection?.query(sql, () => { })
                                        console.log(r)
                                        // create a new day
                                        r.date += 24 * 3600
                                        const sunData = calculateSunrise(new Date(r.date * 1000))
                                        r.data.codes = []
                                        r.data.sun = [sunData.sunriseTimestamp - r.date, sunData.sunsetTimestamp - r.date]
                                        r.data.limits = [Math.round(sunData.sunriseTimestamp / 3600) - 1, Math.round(sunData.sunsetTimestamp / 3600) + 2]
                                    }
                                }
                            })
                            if (r.data.codes.length > 0) {
                                //save it
                                sql = "INSERT INTO `code_history` SET date="
                                    + r.date
                                    + ", data='"
                                    + JSON.stringify(r.data)
                                    + "' ON DUPLICATE KEY UPDATE data ='"
                                    + JSON.stringify(r.data) + "'"
                                connection?.query(sql, () => { })
                            }
                        }
                    })
                }
            )
        }
    )
    res.send(msg)
    console.log(msg)
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
