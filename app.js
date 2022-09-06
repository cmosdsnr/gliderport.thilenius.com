import express from 'express'
// import mysql from 'mysql2'
import dotenv from 'dotenv'
import mysql from 'mysql2'
import calculateSunrise from './calculateSunrise.js'
dotenv.config()

const enableSql = !(typeof process.env.SQL !== 'undefined')

const dt = new Date()
const d = calculateSunrise(dt)
console.log(d)

var connection = enableSql ? mysql.createConnection(process.env.DATABASE_URL) : 0

if (enableSql)
    connection.connect(function (err) {
        if (err) throw err;
        console.log("Connected!");
    })

let lastRecord = "2022-09-05 13:27:20", firstRecord, numberRecords, tdLast = new Date()
let latestHours = 0;

let changes = {
    'sunrise': 0,
    'sunset': 0,
    'onlineStatus': 0,
    'onlineStatusTouched': 0,
    'lastRecord': 0,
    'speed': 0,
    'direction': 0,
    'humidity': 0,
    'pressure': 0,
    'temperature': 0,
    'lastImage': 0,
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
    if (enableSql)
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
    if (enableSql)
        connection.query("SELECT * FROM gliderport ORDER BY recorded DESC LIMIT 1",
            function (err, results, fields) {
                lastRecord = results[0].recorded
                console.log(lastRecord)
            }
        )
}
setLastRecord()


const app = express()

const port = process.env.PORT || 1234;
app.listen(port, () => {
    console.log(`Example app listening on port data.${port}`)
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
    if (enableSql)
        connection.query("UPDATE `server_sent` SET `last_image`=" + parseInt((new Date()).getTime() / 1000) + " WHERE `id`=1",
            function (err, results, fields) {
                lastRecord = results[0].recorded
                console.log(lastRecord)
            }
        )
})

// called to add new wind Data to the db
app.post("/addData", (req, res) => {
    let ans = ""
    const d = JSON.parse(req.body.d)
    console.log(d)
    console.log(d.length)
    if (d != undefined) {
        let sql = "INSERT INTO gliderport (recorded, speed, direction, humidity, pressure, temperature ) VALUES ";
        let e = ','
        firstRecord = d[0][0]
        numberRecords = d.length
        d.forEach((v, i) => {
            if (i === d.length - 1) e = ''
            sql += '( "' + v[0] + '", ' + v[1] + ', ' + v[2] + ', ' + v[3] + ', ' + v[4] + ', ' + v[5] + ')' + e;
        })
        if (enableSql)
            connection.query(sql, (err, results, fields) => { })
        setLastRecord()
        tdLast = new Date()

        //let's work on hours Db
        const dtd = Date.now()
        const thisHour = 3600 * parseInt(dtd / 3600);
        const lastHour = thisHour - 3600;
        const twoDaysAgo = thisHour - 48 * 3600;

        // delete older records
        data.sql = "DELETE FROM hours WHERE `start` < " + data.twoDaysAgo
        if (enableSql)
            connection.query(sql, (err, results, fields) => { })

        //get latest record (or 2 days ago if there are none)
        data.sql = "SELECT * FROM `hours` WHERE `start` > " + twoDaysAgo + " ORDER BY start DESC LIMIT 1;";
        if (enableSql)
            connection.query(sql, (err, results, fields) => {
                latestHours = results[0] ? results[0].start : twoDaysAgo
            })

        //for each hour starting at 'latestHour', thru 'thisHour'
        for (let i = latestHour; i <= thisHour; i += 3600) {
            const data = { start: i, date: [], speed: [], direction: [], humidity: [], pressure: [], temperature: [] }
            var dt1 = new Date(i * 1000);
            var dt2 = new Date((3600 + i) * 1000);
            sql = "SELECT * FROM `gliderport` WHERE recorded > " + dt1 + " AND recorded <= " + dt2;
            if (enableSql)
                connection.query(sql, (err, results, fields) => {
                    results?.forEach((v, i) => {
                        data.time.push((new Date(v.recorded)).getTime() - i);
                        data.speed.push(parseInt(v.speed))
                        data.direction.push(parseInt(v.direction))
                        data.humidity.push(parseInt(v.humidity))
                        data.pressure.push(parseInt(v.pressure))
                        data.temperature.push(parseInt(v.temperature))
                    })
                })
            sql = "REPLACE into hours (`start`, `data`) value(" + data.start + ",'" + JSON.stringify($data) + "')"
            if (enableSql)
                connection.query(sql, (err, results, fields) => { })
        }

        // 
    }
    res.send(numberRecords + " records inserted")
})