
const express = require('express')
const app = express()
const mysql = require('mysql2');

app.get('/', (req, res) => {
    res.send('Hello World!')
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
//     console.log(`Server running at http://${hostname}:${port}/`);
// });
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
// console.log("http up");

// $sql  = "SELECT * FROM `server_sent` WHERE `id`=1";
// $q = $db->query($sql);
// $i = $q->fetch(PDO::FETCH_OBJ);
// $timestamp = time();

// $c = 0;
// while (true) {
//     $ts = time();
//     $q = $db->query($sql);
//     $j = $q->fetch(PDO::FETCH_OBJ);
//     $h = new stdClass();
//     $update = 0;
//     foreach ($j as $key => $value) {
//         if ($i->{$key} != $value) {
//             // the value changed 
//             if ($key == "sunrise_text" || $key == "sunset_text" || $key == "online_status_touched") {
//                 $h->{$key} = $value;
//             } else {
//                 if ($key == "sunrise_raw" || $key == "sunset_raw") {
//                     $h->{$key} = floatval($value);
//                 } else {
//                     $h->{$key} = intval($value);
//                 }
//             }
//             $i->{$key} = $value;
//             $update = 1;
//         }
//     }
//     if ($c == 0) {
//         foreach ($i as $key => $value) {
//             if ($key == "sunrise_text" || $key == "sunset_text" || $key == "online_status_touched") {
//                 $h->{$key} = $value;
//             } else {
//                 if ($key == "sunrise_raw" || $key == "sunset_raw") {
//                     $h->{$key} = floatval($value);
//                 } else {
//                     $h->{$key} = intval($value);
//                 }
//             }
//         }
//         echo "data: " . json_encode($h) . "\n\n";
//         $c++;
//         $timestamp = $ts;
//         ob_end_flush();
//         flush();
//     } else {
//         if ($update == 1) {
//             echo "data: " . json_encode($h) . "\n\n";
//             $timestamp = $ts;
//         } else {
//             if (($ts - $timestamp) > 45) {
//                 echo "event: ping\n";
//                 echo "data: $c\n\n";
//                 $c++;
//                 $timestamp = $ts;
//             }
//         }
//         ob_end_flush();
//         flush();
//     }


//     // Break the loop if the client aborted the connection (closed the page)
//     if (connection_aborted()) break;
//     sleep(5);
// }
