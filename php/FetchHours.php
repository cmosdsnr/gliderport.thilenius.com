<?php

/**
 * Fetch hours data from sandiel8_live:hours later than $_GET['ts']
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

/**
 * Add data to hit counter
 *
 * @param mixed $db The Database
 *
 * @return string[] $h
 */
function addHit()
{
    global $db;
    //add to the hit counter
    if (array_key_exists('HTTP_X_FORWARDED_FOR', $_SERVER)) {
        // if ($_SERVER['HTTP_X_FORWARDED_FOR']) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    $date = new DateTime("now", new DateTimeZone('America/Los_Angeles'));
    $query = $db->query("INSERT INTO hit_counter SET `hit` = '{$date->format('Y-m-d H:i:s')}', `ip` = '$ip'");
}

addHit();

if (isset($_GET['ts'])) {
    $sql = "SELECT * FROM `hours` WHERE start >= '{$_GET['ts']}'  ORDER BY start ASC;";
    $rows = $db->query($sql)->fetchAll();

    $h = new stdClass();
    $h->time = [];
    $h->speed = [];
    $h->direction = [];
    $h->humidity = [];
    $h->pressure = [];
    $h->temperature = [];
    $h->start = $rows[0]->start;

    foreach ($rows as $row) {
        $hr = json_decode($row->data);
        for ($i = 0; $i < count($hr->date); $i++) {
            $h->time[] = $row->start - $h->start + $hr->date[$i];
            $h->speed[] = $hr->speed[$i];
            $h->direction[] = $hr->direction[$i];
            $h->humidity[] = $hr->humidity[$i];
            $h->pressure[] = $hr->pressure[$i];
            $h->temperature[] = $hr->temperature[$i];
        }
    }
    echo json_encode($h);
}
