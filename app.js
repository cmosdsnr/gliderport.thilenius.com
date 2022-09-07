import express from 'express'
// import mysql from 'mysql2'
import dotenv from 'dotenv'
import mysql from 'mysql2'
import calculateSunrise from './calculateSunrise.js'
dotenv.config()

const sqlEnabled = !(typeof process.env.SQL !== 'undefined')


var connection = sqlEnabled ? mysql.createConnection(process.env.DATABASE_URL) : 0

if (sqlEnabled)
    connection.connect(function (err) {
        if (err) throw err;
        console.log("Connected!");
    })

let lastRecord = "2022-09-05 13:27:20", firstRecord, numberRecords, tdLast = new Date()
let latestHours = 0;

let changes = {
    'lastForecast': 0
}

// to do with sunrise and sunset
let TodaysDay = (new Date()).getDate()
let sunData = calculateSunrise(new Date())

const updateSunData = () => {
    const sql = "UPDATE `server_sent` SET `sunrise_raw`=" + sunData.sunrise +
        ",`sunrise_timestamp`=" + sunData.sunriseTimestamp +
        ",`sunrise_text`='" + sunData.sunriseText +
        "',`sunset_raw`=" + sunData.sunset +
        ",`sunset_timestamp`=" + sunData.sunsetTimestamp +
        ",`sunset_text`='" + sunData.sunsetText +
        "' WHERE `id`=1";
    if (sqlEnabled)
        connection.query(sql, function (err, results, fields) { })
}
updateSunData()

//call every hour
let id = setInterval(() => {
    if (TodaysDay != (new Date()).getDate()) {
        TodaysDay = (new Date()).getDate()
        sunData = calculateSunrise(new Date())
        updateSunData()
    }
}, 3600000)

const setLastRecord = () => {
    if (sqlEnabled)
        connection.query("SELECT * FROM gliderport ORDER BY recorded DESC LIMIT 1",
            function (err, results, fields) {
                lastRecord = results[0].recorded
                // console.log(lastRecord)
            }
        )
}
setLastRecord()


const app = express()

const port = process.env.PORT || 1234;
app.listen(port, () => {
    console.log(`Updater listening on port data.${port}`)
})


app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.static('./public'))


app.get('/getLastEntry', (req, res) => {
    res.send(lastRecord)
})

// called from browser to display latest happenings
app.get('/lastAdded', (req, res) => {
    let content = "<p>Last Data received at: " + tdLast.toDateString() + " " +
        tdLast.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) + "</p>"
    content += '<p>first Record: ' + firstRecord + '</p>'
    content += '<p>last Record: ' + lastRecord + '</p>'
    content += '<p>number of Records: ' + numberRecords + '</p>'
    if (latestHours > 0) content += '<p>Latest Hours timestamp is: ' + latestHours + '</p>'
    content += "<p><table><tr><td>Sunrise</td><td>" + sunData.sunriseTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) + "</td></tr>"
    content += "<tr><td>Sunset</td><td>" + sunData.sunsetTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) + "</td></tr></table></p>"
    res.send(content)
})

// ping this page to update the "latest Image" field in the server_sent table
app.get('/ImageAdded', (req, res) => {
    if (sqlEnabled)
        connection.query("UPDATE `server_sent` SET `last_image`=" + parseInt((new Date()).getTime() / 1000) + " WHERE `id`=1",
            function (err, results, fields) { }
        )
})


// ping this page to update the "latest Image" field in the server_sent table
app.get('/UpdateStatus', (req, res) => {
    if (req.params.password != "ilove2fly") {
        res.send("Password incorrect")
        return
    }
    if (req.params.status === undefined) {
        res.send("no status given")
        return
    }
    let sql
    ts = Date.now()
    if (req.params.status === 2) {
        sql = "UPDATE `server_sent` SET `online_status_touched`='" + ts + "' WHERE 1"
        if (sqlEnabled) connection.query(sql, (err, results, fields) => { })
        return
    }
    let i = 0
    if (req.params.status === 1) i = 1
    sql = "UPDATE `server_sent` SET `online_status`=" + i + " WHERE `id`=1";
    if (sqlEnabled) connection.query(sql, (err, results, fields) => { })

    sql = "INSERT INTO `network_status`(`recorded`, `status`) VALUES ('" + ts + "'," + i + ")"
    if (sqlEnabled) connection.query(sql, (err, results, fields) => { })
})

// called to add new wind Data to the db
app.post("/addData", (req, res) => {
    const d = JSON.parse(req.body.d)
    if (d != undefined) {
        let sql = "INSERT INTO gliderport (recorded, speed, direction, humidity, pressure, temperature ) VALUES ";
        let e = ','
        firstRecord = d[0][0]
        numberRecords = d.length
        d.forEach((v, i) => {
            if (i === d.length - 1) e = ''
            sql += '( "' + v[0] + '", ' + v[1] + ', ' + v[2] + ', ' + v[3] + ', ' + v[4] + ', ' + v[5] + ')' + e;
        })
        connection.query(sql, (err, results, fields) => {
            setLastRecord()
            tdLast = new Date()

            const last = d[d.length - 1]
            sql = "UPDATE `server_sent` SET `last_record`=" + ((new Date(last[0])).getTime() / 1000) +
                ", `speed` = " + last[1] +
                ", `direction` = " + last[2] +
                ", `humidity` = " + last[3] +
                ", `pressure` = " + last[4] +
                ", `temperature` = " + last[5] +
                " WHERE `id`=1";
            connection.query(sql, (err, results, fields) => { })

            //let's work on hours Db
            const dtd = Date.now()
            const thisHour = 3600 * parseInt(dtd / 3600);
            const twoDaysAgo = thisHour - 48 * 3600;

            // delete older records
            sql = "DELETE FROM hours WHERE `start` < " + twoDaysAgo
            connection.query(sql, (err, results, fields) => { })

            // get latest record (or 2 days ago if there are none)
            sql = "SELECT * FROM `hours` WHERE `start` > " + twoDaysAgo + " ORDER BY start DESC LIMIT 1;";
            connection.query(sql, (err, results, fields) => {
                latestHours = results[0] ? results[0].start : twoDaysAgo
                // console.log(dt1.toISOString() + " " + thisHour + " " + twoDaysAgo + " " + latestHours)
                // for each hour starting at 'latestHour', thru 'thisHour'
                for (let i = latestHours; i <= thisHour; i += 3600) {
                    const data = { start: i, date: [], speed: [], direction: [], humidity: [], pressure: [], temperature: [] }
                    var dt1 = new Date(i * 1000)
                    var dt2 = new Date((3600 + i) * 1000)
                    console.log(i + " " + dt1.toISOString() + " " + latestHours)
                    sql = "SELECT * FROM `gliderport` WHERE recorded > '" + dt1.toISOString() + "' AND recorded <= '" + dt2.toISOString() + "'";
                    connection.query(sql, (err, results, fields) => {
                        results?.forEach((v, j) => {
                            data.date.push((new Date(v.recorded)).getTime() / 1000 - i);
                            data.speed.push(parseInt(v.speed))
                            data.direction.push(parseInt(v.direction))
                            data.humidity.push(parseInt(v.humidity))
                            data.pressure.push(parseInt(v.pressure))
                            data.temperature.push(parseInt(v.temperature))
                        })
                    })
                    console.log(sql)
                    console.log("pushing hour: " + data.start + " with " + data.date.length + " records")
                    sql = "REPLACE into hours (`start`, `data`) value(" + data.start + ",'" + JSON.stringify(data) + "')"
                    connection.query(sql, (err, results, fields) => { })
                }
            })
        })
    }
    res.send(numberRecords + " records inserted")
})