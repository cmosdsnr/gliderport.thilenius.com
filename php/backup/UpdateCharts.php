<?php

/**
 * Update the 
 * Called by a cron job every min
 * Keep 48 hours in chartsEsp
 * Keep all data in chartsEsp
 * Make sure latest local dB data in chartsEsp
 * 
 */


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


// needed tables are in the sandiel8_live dB 
require "../config.php";
require "../libs/Database.php";
require "../libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

$format = 'Y-m-d H:i:s';
$tz = new DateTimeZone('America/Los_Angeles');

// set 2 timestamp variables: lastHour, twoDaysAgo
$dtd = new DateTime('now', $tz);
$thisHour = 3600 * intval($dtd->getTimestamp() / 3600);
$lastHour = $thisHour - 3600;
$twoDaysAgo = $thisHour  - 48 * 3600;
echo "\n----------------------------------------\n";
echo "Some TimeStamps:\n";
echo "It is {$dtd->format("Y-m-d H:i:s")}\n";
echo "this hour: $thisHour\n";
echo "last hour: $lastHour\n";
echo "two Days Ago: $twoDaysAgo\n";


//*********************************************************************************************************
//*********************************************************************************************************
//************************          DO  IT  FOR LOCAL DB              *************************************
//*********************************************************************************************************
//*********************************************************************************************************
//*********************************************************************************************************

//get the last hour entry in sandiel8_live:hours (two days ago at the latest)
$latest = $twoDaysAgo;
$dtd->setTimestamp($latest);
$sql = "SELECT * FROM `hours` WHERE `start` > $latest ORDER BY start DESC LIMIT 1;";
$row = $db->query($sql)->fetch();
if ($row) {
    $latest = $row->start;
}
$dtd->setTimestamp($latest);
echo "most recent in sandiel8_live:hours is {$dtd->format("Y-m-d H:i:s")}\n";

// get local dB rows later than that
echo "\n----------------------------------------\n";
echo "Update sandiel8_live:hours from sandiel8_live:gliderport \n";
$sql = "SELECT * FROM `gliderport` WHERE recorded > '{$dtd->format("Y-m-d H:i:s")}'";
$rows = $db->query($sql)->fetchAll();
echo "found " . count($rows) . " local Db rows later than {$dtd->format("Y-m-d H:i:s")}\n";

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
            echo "added/updated " . count($speed) . " on hour {$dtd->format("m-d H:i:s")} to sandiel8_live:hours\n";
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
    echo "added/updated " . count($speed) . " on hour {$dtd->format("m-d H:i:s")} to sandiel8_live:hours\n";
} else {
    $latest -= 3600;
}

// lets keep 48 hours in the db
// delete older
$dtd->setTimestamp($twoDaysAgo);
echo "\n----------------------------------------\n";
echo "Delete records older than 48hrs: {$dtd->format("Y-m-d H:i:s")}\n";
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
}
