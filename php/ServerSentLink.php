<?php

/*
* Lookup and report thru an open event-stream changes to:
* sunset/sunrise data
* gliderport online status
*/

// find latest sun data
date_default_timezone_set("America/New_York");
header("Cache-Control: no-store");
header("Content-Type: text/event-stream");

require "config.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

$sql  = "SELECT * FROM `server_sent` WHERE `id`=1";
$q = $db->query($sql);
$i = $q->fetch(PDO::FETCH_OBJ);
$timestamp = time();

$c = 0;
while (true) {
    $ts = time();
    $q = $db->query($sql);
    $j = $q->fetch(PDO::FETCH_OBJ);
    $h = new stdClass();
    $update = 0;
    foreach ($j as $key => $value) {
        if ($i->{$key} != $value) {
            // the value changed 
            if ($key == "sunrise_text" || $key == "sunset_text" || $key == "online_status_touched") {
                $h->{$key} = $value;
            } else {
                if ($key == "sunrise_raw" || $key == "sunset_raw") {
                    $h->{$key} = floatval($value);
                } else {
                    $h->{$key} = intval($value);
                }
            }
            $i->{$key} = $value;
            $update = 1;
        }
    }
    if ($c == 0) {
        foreach ($i as $key => $value) {
            if ($key == "sunrise_text" || $key == "sunset_text" || $key == "online_status_touched") {
                $h->{$key} = $value;
            } else {
                if ($key == "sunrise_raw" || $key == "sunset_raw") {
                    $h->{$key} = floatval($value);
                } else {
                    $h->{$key} = intval($value);
                }
            }
        }
        echo "data: " . json_encode($h) . "\n\n";
        $c++;
        $timestamp = $ts;
        ob_end_flush();
        flush();
    } else {
        if ($update == 1) {
            echo "data: " . json_encode($h) . "\n\n";
            $timestamp = $ts;
        } else {
            if (($ts - $timestamp) > 45) {
                echo "event: ping\n";
                echo "data: $c\n\n";
                $c++;
                $timestamp = $ts;
            }
        }
        ob_end_flush();
        flush();
    }


    // Break the loop if the client aborted the connection (closed the page)
    if (connection_aborted()) break;
    sleep(5);
}
