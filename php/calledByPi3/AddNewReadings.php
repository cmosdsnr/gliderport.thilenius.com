<?php
/**
 * Maintain graphs data 
 * Add POST data to local Db sandiel8_live
 */

ini_set('display_errors', 1);

error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "../config.php";  // use Sandiel8_live data base on HostMonster, table gliderport
require "../libs/Database.php";
require "../libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;
// $f = json_decode($_GET['d']);
$myfile = fopen("/home1/sandiel8/www/live/php/calledByPi3/AddNewReadings.log", "w") or die("Unable to open file!");
fwrite($myfile,  "Opened\n");

if (isset($_POST['d'])) {
    $d = json_decode($_POST['d']);
    $sql  = "INSERT INTO gliderport (recorded, speed, direction, humidity, pressure, temperature ) VALUES ";
    foreach ($d as $v) {
        $sql .= '( "' . $v[0] . '", ' . $v[1] . ', ' . $v[2] . ', ' . $v[3] . ', ' . $v[4] . ', ' . $v[5] . '),';
    }
    $sql = substr($sql, 0, -1);  // loose last comma
    // fwrite($myfile,  $sql . "\n");
    $query = $db->query($sql);
    fwrite($myfile,  "Was called with " . count($d) . " new entries\n");

    $format = 'Y-m-d H:i:s';
    $tz = new DateTimeZone('America/Los_Angeles');

    // set 2 timestamp variables: lastHour, twoDaysAgo
    $dtd = new DateTime('now', $tz);
    $thisHour = 3600 * intval($dtd->getTimestamp() / 3600);
    $lastHour = $thisHour - 3600;
    $twoDaysAgo = $thisHour  - 48 * 3600;
    fwrite($myfile,  "\n----------------------------------------\n");
    fwrite($myfile,  "Some TimeStamps:\n");
    fwrite($myfile,  "It is {$dtd->format("Y-m-d H:i:s")}\n");
    fwrite($myfile,  "this hour: $thisHour\n");
    fwrite($myfile,  "last hour: $lastHour\n");
    fwrite($myfile,  "two Days Ago: $twoDaysAgo\n");

    //get the last hour entry in sandiel8_live:hours (two days ago at the latest)
    $latest = $twoDaysAgo;
    $dtd->setTimestamp($latest);
    $sql = "SELECT * FROM `hours` WHERE `start` > $latest ORDER BY start DESC LIMIT 1;";
    $row = $db->query($sql)->fetch();
    if ($row) {
        $latest = $row->start;
    }
    $dtd->setTimestamp($latest);
    fwrite($myfile,  "most recent in sandiel8_live:hours is {$dtd->format("Y-m-d H:i:s")}\n");

    // get local dB rows later than that
    fwrite($myfile,  "\n----------------------------------------\n");
    fwrite($myfile,  "Update sandiel8_live:hours from sandiel8_live:gliderport \n");
    $sql = "SELECT * FROM `gliderport` WHERE recorded > '{$dtd->format("Y-m-d H:i:s")}'";
    $rows = $db->query($sql)->fetchAll();
    fwrite($myfile,  "found " . count($rows) . " local Db rows later than {$dtd->format("Y-m-d H:i:s")}\n");

    $time = [];
    $speed = [];
    $direction = [];
    $humidity = [];
    $pressure = [];
    $temperature = [];
    // add them to firebase
    foreach ($rows as $row) {
        $t = DateTime::createFromFormat($format, $row->recorded, $tz)->getTimestamp() - $latest;
        if ($t < 3600) {
            $time[] = $t;
            $speed[] = intval($row->speed);
            $direction[] = intval($row->direction);
            $humidity[] = intval($row->humidity);
            $pressure[] = intval($row->pressure);
            $temperature[] = intval($row->temperature);
        } else {
            if (count($speed) > 0) {
                $data = [
                    'start' => $latest,
                    'date' => $time,
                    'speed' => $speed,
                    'direction' => $direction,
                    'humidity' => $humidity,
                    'pressure' => $pressure,
                    'temperature' => $temperature
                ];
                $sql = "REPLACE into hours (`start`, `data`) value(" . $data['start'] . ",'" . json_encode($data) . "')";
                $db->query($sql);
                fwrite($myfile,  "added/updated " . count($speed) . " on hour {$dtd->format("m-d H:i:s")} to sandiel8_live:hours\n");
            }
            //start the array over again        
            $time = [$t - 3600];
            $speed = [intval($row->speed)];
            $direction = [intval($row->direction)];
            $humidity = [intval($row->humidity)];
            $pressure = [intval($row->pressure)];
            $temperature = [intval($row->temperature)];
            $latest += 3600;
            $dtd->setTimestamp($latest);
        }
    }

    // add in the last incomplete hour (usually the only one)
    if (count($speed) > 0) {
        $data = [
            'start' => $latest,
            'date' => $time,
            'speed' => $speed,
            'direction' => $direction,
            'humidity' => $humidity,
            'pressure' => $pressure,
            'temperature' => $temperature
        ];
        $sql = "REPLACE into hours (`start`, `data`) value(" . $data['start'] . ",'" . json_encode($data) . "')";
        $db->query($sql);
        fwrite($myfile,  "added/updated " . count($speed) . " on hour {$dtd->format("m-d H:i:s")} to sandiel8_live:hours\n");
    } else {
        $latest -= 3600;
    }

    // lets keep 48 hours in the db
    // delete older
    $dtd->setTimestamp($twoDaysAgo);
    fwrite($myfile,  "\n----------------------------------------\n");
    fwrite($myfile,  "Delete records older than 48hrs: {$dtd->format("Y-m-d H:i:s")}\n");
    $db->query("DELETE FROM hours WHERE `start` < $twoDaysAgo;");


    // Update server_sent latest record
    if (count($rows) > 0) {

        $lastRow = $rows[count($rows) - 1];
        $t = DateTime::createFromFormat($format, $lastRow->recorded, $tz)->getTimestamp();

        $sql  = "UPDATE `server_sent` SET `last_record`=$t,  
                    `speed` = $lastRow->speed,
                    `direction` = $lastRow->direction,
                    `humidity` = $lastRow->humidity,
                    `pressure` = $lastRow->pressure,
                    `temperature` = $lastRow->temperature
                    WHERE `id`=1";
        $db->query($sql);
        fwrite($myfile,  "Updated ServerSent table\n");
    }  
}
fclose($myfile);

