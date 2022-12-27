<?php

/**
 *  Called daily from Cron 'Daily'. 
 *  Updates `hit_stats` and `videos_available` record in sandiel8_live:miscellaneous with latest 
 *  stats from sandiel8_live:hit_counter
 */

ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "../config.php";
require "../libs/Database.php";
require "../libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;


$s = json_decode($db->query("select * from miscellaneous where id='hit_stats';")->fetch()->data);
$s->lastReset = "6/30/2017 16:30";

if (!property_exists($s, "day")) {
    $s->day = new stdClass();
}
if (!property_exists($s, "week")) {
    $s->week = new stdClass();
}
if (!property_exists($s, "month")) {
    $s->month = new stdClass();
}

$now = (new DateTime("now", new DateTimeZone('America/Los_Angeles')));
$day = (new DateTime("now", new DateTimeZone('America/Los_Angeles')))->sub(new DateInterval("P1D"))->format('Y-m-d H:i:s');
$week = (new DateTime("now", new DateTimeZone('America/Los_Angeles')))->sub(new DateInterval("P7D"))->format('Y-m-d H:i:s');
$month = (new DateTime("now", new DateTimeZone('America/Los_Angeles')))->sub(new DateInterval("P1M"))->format('Y-m-d H:i:s');

if (!property_exists($s, "total")) {
    $s->total = new stdClass();
    $s->total->date = $now->format('Y-m-d H:i:s');
    $s->total->count = $db->query("select count(*) from hit_counter where 1;")->fetchColumn();
    $s->total->unique = $db->query("select count(DISTINCT IP) from hit_counter where 1;")->fetchColumn();
    echo ("create totals\n");
} else {
    if (property_exists($s->total, "date")) {
        $from  = $s->total->date;
    } else {
        $from = "2000-01-01 00:00:00";
    }
    $s->total->count += $db->query("select count(*) from hit_counter where hit >'$from';")->fetchColumn();
    $s->total->unique += $db->query("select count(DISTINCT IP) from hit_counter where hit >'$from';")->fetchColumn();
}
$s->total->date = $now->format('Y-m-d H:i:s');

$db->query("UPDATE miscellaneous SET `data`='" . json_encode($s) . "' WHERE id='hit_stats';");


$s->day->count = $db->query("select count(*) from `hit_counter` where hit >'$day';")->fetchColumn();
$s->week->count = $db->query("select count(*) from hit_counter where hit >'$week';")->fetchColumn();
$s->month->count = $db->query("select count(*) from hit_counter where hit >'$month';")->fetchColumn();

$s->day->unique = $db->query("select count(DISTINCT IP) from hit_counter where hit >'$day';")->fetchColumn();
$s->week->unique = $db->query("select count(DISTINCT IP) from hit_counter where hit >'$week';")->fetchColumn();
$s->month->unique = $db->query("select count(DISTINCT IP) from hit_counter where hit >'$month';")->fetchColumn();

if (!property_exists($s, "weeks")) {
    // create weeks
    echo ("create weeks\n");
    $start = DateTime::createFromFormat('m/d/Y', '7/1/2017', timezone_open('America/Los_Angeles'));
    $stop = clone $start;
    $stop->add(new DateInterval("P7D"));
    $s->weeks = new stdClass();
    $s->weeks->data = [];

    echo ("add week {$stop->format('Y-m-d H:i:s')} which is earlier than {$now->format('Y-m-d H:i:s')}\n");
    while ($stop < $now) {
        echo ("add week {$start->format('Y-m-d H:i:s')}\n");
        $s->weeks->data[] = $db->query("select count(*) from hit_counter where hit >'{$start->format('Y-m-d H:i:s')}' AND hit <='{$stop->format('Y-m-d H:i:s')}' ;")->fetchColumn();
        $start->add(new DateInterval("P7D"));
        $stop->add(new DateInterval("P7D"));
    }
    $s->weeks->last = $start->getTimestamp();
} else {
    $start = (new DateTime("now", new DateTimeZone('America/Los_Angeles')))->setTimestamp($s->weeks->last);
    // $start = DateTime::createFromFormat('m/d/Y', '7/1/2017', timezone_open('America/Los_Angeles'));
    // $s->weeks->data = [];
    $stop = clone $start;
    $stop->add(new DateInterval("P7D"));
    while ($stop < $now) {
        echo ("add week {$start->format('Y-m-d H:i:s')}\n");
        $s->weeks->data[] = $db->query("select count(*) from hit_counter where hit >'{$start->format('Y-m-d H:i:s')}' AND hit <='{$stop->format('Y-m-d H:i:s')}' ;")->fetchColumn();
        $start->add(new DateInterval("P7D"));
        $stop->add(new DateInterval("P7D"));
        $s->weeks->last = $start->getTimestamp();
    }
}


$db->query("UPDATE miscellaneous SET `data`='" . json_encode($s) . "' WHERE id='hit_stats';");


//update videos as well

$dir    = '/home1/sandiel8/www/live/video';
$f = scandir($dir);
$files = [];
foreach ($f as $key => $file) {
    $pos = strpos($file, "mp4");
    if (!($pos === false)) {
        $files[] = strtotime(str_replace(".mp4", "", $file));
        sort($files);
    }
}
print(count($files) . " videos\n");

$pairs = [];
$start = 0;
$current = 0;

foreach ($files as $ts) {
    if ($start == 0) {
        $start = $ts;
        $current = $ts;
    } else {
        if ($ts - $current > (3600 * 25)) { //time can change adjusting 1 hr, i.e. day can be 25 hrs
            $pairs[] = [$start, $current];
            $start = $ts;
        }
        $current = $ts;
    }
}
$pairs[] = [$start, $current];

foreach ($pairs as $k => $pair) {
    $pairs[$k] = [date("Y-m-d", $pair[0]), date("Y-m-d", $pair[1])];
}

$db->query("UPDATE miscellaneous SET `data`='" . json_encode($pairs) . "' WHERE id='videos_available';");
