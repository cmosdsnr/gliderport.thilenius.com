import express from 'express'
import mysql from 'mysql2'
import dotenv from 'dotenv'
import fs from 'fs'
// const express = require('express')
const app = express()
// const mysql = require('mysql2');
// require('dotenv').config()
dotenv.config()
// const fs = require('fs');

// var connection = mysql.createConnection(process.env.DATABASE_URL)

// connection.connect(function (err) {
//     if (err) throw err;
//     console.log("Connected!");
// })

// connection.query(sql,
//     function (err, results, fields) {
//         ans = { sql, err, results, fields }
//     }
// )


app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(express.static(__dirname + '/public'))

lastAdded(req, res) {

}

app.get('/lastAdded', lastAdded)


app.post("/addData", (req, res) => {
    let ans = ""
    const d = req.body.d
    console.log(d)
    console.log(d.length)
    if (d != undefined) {
        let sql = "INSERT INTO gliderport (recorded, speed, direction, humidity, pressure, temperature ) VALUES ";
        let e = ','
        d.forEach((v, i) => {
            if (i === d.length - 1) e = ''
            sql += '( "' + v[0] + '", ' + v[1] + ', ' + v[2] + ', ' + v[3] + ', ' + v[4] + ', ' + v[5] + ')' + e;
        })
        // connection.query(sql,
        //     function (err, results, fields) {
        //         ans = { sql, err, results, fields }
        //     }
        // )

        let content = "<!doctype html>\
                        <html>\
                        <head>\
                            <title>This is the title of the webpage!</title>\
                        </head>\
                        <body>"

        td = new Date()
        content += "<p>recorded: " + td.toDateString() + " " + td.toTimeString() + "</p>"
        content += "<p>sql: " + sql + "</p>"

        content += "</body></html>"

        fs.writeFile(__dirname + '/public/lastAdd.html', content, err => {
            if (err) {
                console.error(err);
            }
            // file written successfully
        })
    }
    //     query = db->query(sql);
    // if (isset(_POST['d'])) {
    //     d = json_decode(_POST['d']);
    //     sql  = "INSERT INTO gliderport (recorded, speed, direction, humidity, pressure, temperature ) VALUES ";
    //     foreach (d as v) {
    //         sql .= '( "' . v[0] . '", ' . v[1] . ', ' . v[2] . ', ' . v[3] . ', ' . v[4] . ', ' . v[5] . '),';
    //     }
    //     sql = substr(sql, 0, -1);  // loose last comma
    //     // fwrite(myfile,  sql . "\n");

    //     fwrite(myfile,  "Was called with " . count(d) . " new entries\n");

    //     format = 'Y-m-d H:i:s';
    //     tz = new DateTimeZone('America/Los_Angeles');

    //     // set 2 timestamp variables: lastHour, twoDaysAgo
    //     dtd = new DateTime('now', tz);
    //     thisHour = 3600 * intval(dtd->getTimestamp() / 3600);
    //     lastHour = thisHour - 3600;
    //     twoDaysAgo = thisHour  - 48 * 3600;
    //     fwrite(myfile,  "\n----------------------------------------\n");
    //     fwrite(myfile,  "Some TimeStamps:\n");
    //     fwrite(myfile,  "It is {dtd->format("Y-m-d H:i:s")}\n");
    //     fwrite(myfile,  "this hour: thisHour\n");
    //     fwrite(myfile,  "last hour: lastHour\n");
    //     fwrite(myfile,  "two Days Ago: twoDaysAgo\n");   

    res.json(req.body)
})
// var connection = mysql.createConnection(process.env.DATABASE_URL)

// let c = "not"
// connection.connect(function (err) {
//     if (err) throw err;
//     console.log("Connected!");
//     c = ""
// })

// let currentData = {}
// connection.query(
//     'SELECT * FROM `server_sent` WHERE `id`=1',
//     function (err, results, fields) {
//         currentData = results[0]; // results contains rows returned by server
//     }
// );

// const http = require('http');


// const server = http.createServer((request, response) => {
//     if (request.url == "/addData") {
//         if(request.method == 'POST') {
//             processPost(request, response, function() {
//                 console.log(request.post);
//                 // Use request.post here

//                 response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
//                 response.end();
//             });
//         } else {
//             response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
//             response.end();
//         }  
//     }
//     else
//         res.end('Invalid Request!');
// });

const hostname = 'gliderportupdateserver.thilenius.org';
const port = process.env.PORT || 8080;
// server.listen(port, hostname, () => {
//     console.log(`Server running at http://{hostname}:{port}/`);
// });
app.listen(port, () => {
    console.log(`Example app listening on port {port}`)
})
// console.log("http up");

// sql  = "SELECT * FROM `server_sent` WHERE `id`=1";
// q = db->query(sql);
// i = q->fetch(PDO::FETCH_OBJ);
// timestamp = time();

// c = 0;
// while (true) {
//     ts = time();
//     q = db->query(sql);
//     j = q->fetch(PDO::FETCH_OBJ);
//     h = new stdClass();
//     update = 0;
//     foreach (j as key => value) {
//         if (i->{key} != value) {
//             // the value changed 
//             if (key == "sunrise_text" || key == "sunset_text" || key == "online_status_touched") {
//                 h->{key} = value;
//             } else {
//                 if (key == "sunrise_raw" || key == "sunset_raw") {
//                     h->{key} = floatval(value);
//                 } else {
//                     h->{key} = intval(value);
//                 }
//             }
//             i->{key} = value;
//             update = 1;
//         }
//     }
//     if (c == 0) {
//         foreach (i as key => value) {
//             if (key == "sunrise_text" || key == "sunset_text" || key == "online_status_touched") {
//                 h->{key} = value;
//             } else {
//                 if (key == "sunrise_raw" || key == "sunset_raw") {
//                     h->{key} = floatval(value);
//                 } else {
//                     h->{key} = intval(value);
//                 }
//             }
//         }
//         echo "data: " . json_encode(h) . "\n\n";
//         c++;
//         timestamp = ts;
//         ob_end_flush();
//         flush();
//     } else {
//         if (update == 1) {
//             echo "data: " . json_encode(h) . "\n\n";
//             timestamp = ts;
//         } else {
//             if ((ts - timestamp) > 45) {
//                 echo "event: ping\n";
//                 echo "data: c\n\n";
//                 c++;
//                 timestamp = ts;
//             }
//         }
//         ob_end_flush();
//         flush();
//     }


//     // Break the loop if the client aborted the connection (closed the page)
//     if (connection_aborted()) break;
//     sleep(5);
// }
