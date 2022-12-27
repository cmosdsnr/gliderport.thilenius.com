<?php

/**
 * Fetch code history data from sandiel8_live:history later than $_GET['ts']
 * Called by a cron job every min
 * Keep 48 hours in chartsEsp
 * Keep all data in chartsEsp
 * Make sure latest local dB data in chartsEsp
 * 
 */


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


// needed tables are in the sandiel8_live dB 
require "config.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;
if (!array_key_exists('days', $_GET)) {
    echo "didn't receive days\n";
    exit();
}
$dtStart = new DateTime();
$dtStart->setTimezone(timezone_open('America/Los_Angeles'));
$dtStart->setTime(0, 0, 0);
$dtStop = new DateTime();
$dtStop->setTimezone(timezone_open('America/Los_Angeles'));
$ts = $dtStart->getTimestamp() - (3600 * 24) * $_GET['days'];
$dtStart->setTimestamp($ts);
// echo "Fetch data later than $ts<br/>";

// get starting point
$sql = "SELECT * FROM `code_history` WHERE " .
    "date >= $ts " .
    "ORDER BY date ASC;";
$rows = $db->query($sql)->fetchAll();

$h = [];
foreach ($rows as $row) {
    $a = json_decode($row->data);
    // $a->codes = json_decode($a->codes);
    $a->date = $row->date;
    $h[] = $a;
}
echo json_encode($h);
