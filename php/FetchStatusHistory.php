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

$format = 'Y-m-d H:i:s';
$tz = new DateTimeZone('America/Los_Angeles');

$dt = new DateTime();
$dt->setTimezone(timezone_open('America/Los_Angeles'));

if (isset($_GET['ts'])) {
    $dt->setTimestamp($_GET['ts']);
    // echo "{$dt->format($format)}\n";
    $sql = "SELECT * FROM `network_status` WHERE recorded >= '{$dt->format($format)}'  ORDER BY recorded ASC;";
    // echo $sql . "\n";
    $rows = $db->query($sql)->fetchAll();
    // echo count($rows) . "\n";
    $h = new stdClass();

    $ts = DateTime::createFromFormat($format, $rows[0]->recorded, $tz)->getTimestamp();
    $tStart = $ts;
    $ds = $rows[0]->status;
    $h->start = [$ts, $ds];
    $h->delta = [];

    foreach ($rows as $row) {
        if ($ds != $row->status) {
            $ds = $row->status;
            $ts = DateTime::createFromFormat($format, $row->recorded, $tz)->getTimestamp();
            $h->delta[] = $ts - $tStart;
        }
    }
    echo json_encode($h);
}
// $_GET['days'] = 8;
if (isset($_GET['days'])) {
    $dtStart = new DateTime();
    $dtStart->setTimezone(timezone_open('America/Los_Angeles'));
    $dtStart->setTime(0, 0, 0);
    $dtStop = new DateTime();
    $dtStop->setTimezone(timezone_open('America/Los_Angeles'));
    $ts = $dtStart->getTimestamp() - (3600 * 24) * $_GET['days'];
    $dtStart->setTimestamp($ts);

    // get starting point
    $sql = "SELECT * FROM `network_status` WHERE " .
        "recorded <= '{$dtStart->format($format)}' " .
        "ORDER BY recorded DESC LIMIT 1;";
    $stat = $db->query($sql)->fetch()->status;
    // echo "$stat<br/>";

    $h = [];

    for ($i = 0; $i <= $_GET['days']; $i++) {
        $dtStart->setTimestamp($ts);
        $dtStop->setTimestamp($ts + (3600 * 24));
        $day = new stdClass();
        $day->date = $dtStart->format('m-d-Y');
        $day->start = intval($stat);
        $day->changes = [];

        $sql = "SELECT * FROM `network_status` WHERE " .
            "recorded >= '{$dtStart->format($format)}' AND " .
            "recorded < '{$dtStop->format($format)}' " .
            "ORDER BY recorded ASC;";
        $rows = $db->query($sql)->fetchAll();
        $n = count($rows);
        // echo "from: {$dtStart->format($format)} to: {$dtStop->format($format)}  has  $n rows<br/>";
        foreach ($rows as $row) {
            if ($stat != $row->status) {
                $stat = $row->status;
                $day->changes[] = DateTime::createFromFormat($format, $row->recorded, $tz)->getTimestamp() - $ts;
            }
        }
        $ts += (3600 * 24);
        $h[] = $day;
    }
    echo json_encode($h);
}
