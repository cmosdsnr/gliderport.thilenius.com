import express from "express"
import dotenv from "dotenv"
import mysql from "mysql2"
import base64url from "base64url"
import ping from "web-pingjs"
import calculateSunrise from "./calculateSunrise.js"
import { Http2ServerRequest } from "http2"
dotenv.config()

let DEBUG = true

const timestampToString = (ts) => {
    return new Date(ts * 1000).toISOString().replace("T", " ").replace(".000Z", "")
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

const setLastRecord = () => {
    connection?.query(
        "SELECT * FROM gliderport ORDER BY recorded DESC LIMIT 1",
        function (err, results, fields) {
            const ts = (new Date(results[0].recorded).getTime() + offset) / 1000
            lastRecord = results ? timestampToString(ts) : "0"
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
    let msg = "pull from gliderport: records from " + timestampToString(twoDaysAgo) + "<br/>\n"
    console.log("pull from gliderport: records from " + timestampToString(twoDaysAgo))
    sql = "SELECT * FROM `gliderport` WHERE recorded > '" + timestampToString(twoDaysAgo) + "'"
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
app.post("/addData", (req, res) => {
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
        console.log("   addData called with no data")

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
                start: i,
                date: [],
                speed: [],
                direction: [],
                humidity: [],
                pressure: [],
                temperature: [],
            }
            msg += "pull from gliderport: records from " + timestampToString(i) + " to " + timestampToString(i + 3600) + "\n"
            sql = "SELECT * FROM `gliderport` WHERE recorded >= '" + timestampToString(i) + "' AND recorded < '" + timestampToString(i + 3600) + "'"
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
            const tsNow = (new Date()).getTime() / 1000
            // if it's been more than one hours, update the forecast
            if (tsNow > tsLast + 1 * 60 * 60) {
                msg += "Updated forecast\n"
                console.log("   attempting to update forecast since last was ", tsLast, " and now is ", tsNow)
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

                    sql = "SELECT * FROM `gliderport` WHERE recorded > '" +
                        timestampToString(tsLast) + "'"
                    connection?.query(sql, (err, results, fields) => {
                        if (Array.isArray(results)) {
                            console.log("   Since the last record in code_history at ", timestampToString(tsLast), " with code ",
                                lc, ", there are ", results.length, " new data points in gliderport")
                            let c = 0
                            results.forEach((v, i) => {
                                c++
                                const ts = Math.round((new Date(v.recorded)).getTime() / 1000)
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
                                        if (c != lc) {
                                            lc = c
                                            // add to r.data.codes code_history[ts, code]
                                            r.data.codes.push([ts - 3600 * r.data.limits[0] - r.date, lc])
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
                                        // connection?.query(sql, () => { })
                                        console.log(`   DEBUG: saving ${JSON.stringify(r)} `)
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
        content += `<p><table>`
        let l = []
        results.forEach((v, i) => {
            const d = JSON.parse(v.data)
            l.push([v.start, d.date.length])

        })
        l.forEach((v, i) => {
            sql = "SELECT * FROM `gliderport` WHERE recorded >= '" + timestampToString(v[0]) +
                "' AND recorded < '" + timestampToString(v[0] + 3600) + "'"
            connection?.query(sql, (err, results, fields) => {
                content += `<tr><td>${timestampToString(v[0])}</td><td>${v[1]} items</td><td>gliderport has ${results.length}</td></tr>`
                if (l.length === i + 1) content += `</table></p>`
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
