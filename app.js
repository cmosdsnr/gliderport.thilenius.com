import express from 'express'
// import mysql from 'mysql2'
import dotenv from 'dotenv'
import mysql from 'mysql2'

var connection = mysql.createConnection(process.env.DATABASE_URL)

connection.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
})

let lastRecord = "2022-09-05 13:27:20", firstRecord, numberRecords, tdLast = new Date()
connection.query("SELECT * FROM gliderport ORDER BY recorded DESC LIMIT 1",
    function (err, results, fields) {
        lastRecord = results[0].recorded
        console.log(lastRecord)
    }
)

const app = express()
dotenv.config()

const port = process.env.PORT || 1234;
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('./public'))


app.get('/getLastEntry', (req, res) => {
    res.send(lastRecord)
})

app.get('/lastAdded', (req, res) => {
    let content = "<p>Last Data received at: " + tdLast.toDateString() + " " +
        tdLast.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }) + "</p>"
    content += '<p>first Record: ' + firstRecord + '</p>'
    content += '<p>last Record: ' + lastRecord + '</p>'
    content += '<p>number of Records: ' + numberRecords + '</p>'
    res.send(content)
})


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
            if (i === d.length - 1) {
                e = ''
                lastRecord = v[0]
            }
            sql += '( "' + v[0] + '", ' + v[1] + ', ' + v[2] + ', ' + v[3] + ', ' + v[4] + ', ' + v[5] + ')' + e;
        })
        // connection.query(sql,
        //     function (err, results, fields) {
        //         ans = { sql, err, results, fields }
        //     }
        // )
        tdLast = new Date()
    }
    res.json(sql)
})