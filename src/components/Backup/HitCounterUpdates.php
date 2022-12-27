<?php

/**
 * Update Day and Week hit_counter databases when needed
 * Called from Cron Daily job
 * 
 */

require "config_raspberry.php";
require "libs/Database.php";
require "libs/Controller.php";

// set up the database
$Controller = new Controller();
$db = $Controller->db;

$now = new DateTime("now", new DateTimeZone('America/Los_Angeles'));

// find the last week we added
$sql = "SELECT MAX(day) AS maxdate FROM hit_counter_week WHERE 1";
$s = ($db->query($sql)->fetch())->maxdate;

// 7 days later than the last entry into hit_counter_week
$start = new DateTime($s, new DateTimeZone('America/Los_Angeles'));
$start->add(new DateInterval("P7D"));

// 14 days later than the last entry into hit_counter_week
$stop = new DateTime($s, new DateTimeZone('America/Los_Angeles'));
$stop->add(new DateInterval("P14D"));

$day = $start->format('Y-m-d');
echo "adding week starting $day\n";

while ($stop < $now) {
    // get hit count 
    $sql = 'select count(*) from hit_counter where hit >"' .
        $start->format('Y-m-d H:i:s') . '" AND hit <"' .
        $stop->format('Y-m-d H:i:s') . '"';
    $all    = $db->query($sql)->fetchColumn();

    // get distinct hit count 
    $sql = 'select count(DISTINCT IP) from hit_counter where hit >"' .
        $start->format('Y-m-d H:i:s') . '" AND hit <"' .
        $stop->format('Y-m-d H:i:s') . '"';
    $unique = $db->query($sql)->fetchColumn();

    // insert into hit_counter_week  
    $sql = "INSERT INTO `hit_counter_week` (`day`, `total`, `unique`) 
            VALUES ('$day', '$all', '$unique')";
    $db->query($sql);


    echo "week from $day to {$stop->format('Y-m-d')} all:$all unique:$unique\n";
    // move one week forward
    $start->add(new DateInterval("P7D"));
    $stop->add(new DateInterval("P7D"));
    $day = $start->format('Y-m-d');
}

// find the last day we added
$sql = "SELECT MAX(day) AS maxdate FROM hit_counter_day WHERE 1";
$s = ($db->query($sql)->fetch())->maxdate;

$now = new DateTime("now", new DateTimeZone('America/Los_Angeles'));

// 1 day later than the last entry into hit_counter_day
$start = new DateTime($s, new DateTimeZone('America/Los_Angeles'));
$start->add(new DateInterval("P1D"));

// 2 day later than the last entry into hit_counter_day
$stop = new DateTime($s, new DateTimeZone('America/Los_Angeles'));
$stop->add(new DateInterval("P2D"));

$day = $start->format('Y-m-d');
echo "adding days starting $day\n";

while ($stop < $now) {
    $sql = 'select count(*) from hit_counter where hit >"' .
        $start->format('Y-m-d H:i:s') . '" AND hit <"' .
        $stop->format('Y-m-d H:i:s') . '"';
    $all    = $db->query($sql)->fetchColumn();

    $sql = 'select count(DISTINCT IP) from hit_counter where hit >"' .
        $start->format('Y-m-d H:i:s') . '" AND hit <"' .
        $stop->format('Y-m-d H:i:s') . '"';
    $unique = $db->query($sql)->fetchColumn();

    $sql = "INSERT INTO `hit_counter_day` (`day`, `total`, ` unique`) 
    VALUES ('$day', '$all', '$unique');";
    $db->query($sql);

    echo "day from $day to {$stop->format('Y-m-d')} all:$all unique:$unique\n";
    $start->add(new DateInterval("P1D"));
    $stop->add(new DateInterval("P1D"));
    $day = $start->format('Y-m-d');
}
