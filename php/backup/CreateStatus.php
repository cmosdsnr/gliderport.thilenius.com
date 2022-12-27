<?php

/**
 * Keep the Firestore database up to date with internet status
 * For now, this will get called every min, but should be changed to execute when called by the raspberry pi 4 at home
 */

require __DIR__ . '/vendor/autoload.php';

use Google\Cloud\Firestore\FirestoreClient;


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


require "config.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

/*****************************************************
 * Fetch last 10 days of status, one at a time
 */

$firestore = new FirestoreClient();
$collection = $firestore->collection('statusHistory');

$oneDay = new DateInterval('P1D');

$dtToday = DateTime::createFromFormat('m/d/Y', '12/3/2021', timezone_open('America/Los_Angeles'));
$dtToday->setTime(0, 0, 0);
$tsToday = $dtToday->getTimestamp();

$dtTomorrow = DateTime::createFromFormat('m/d/Y', '12/4/2021', timezone_open('America/Los_Angeles'));
$dtTomorrow->setTime(0, 0, 0);

$status = [];
$status[] = [0, 1];

for ($i = 0; $i < 11; $i++) {
    print($dtToday->format("Y-m-d H:i:s") . " " . $dtTomorrow->format("Y-m-d H:i:s") . "\n");
    $query = $db->query(
        "SELECT * FROM GliderportNetworkStatus WHERE recorded < '" .
            $dtTomorrow->format("Y-m-d H:i:s") . "' AND recorded > '" .
            $dtToday->format("Y-m-d H:i:s") . "' ORDER BY recorded ASC;"
    );

    while ($r = $query->fetch(PDO::FETCH_OBJ)) {
        $dtPt = new DateTime(
            $r->recorded,
            new DateTimeZone('America/Los_Angeles')
        );
        $tsPt = $dtPt->getTimestamp();
        $status[] = [$tsPt - $tsToday, intval($r->status)];
    }
    $collection->add([
        'date' => $dtToday->format("Y-m-d"),
        'status' => json_encode($status)
    ]);
    $lastStatus = (end($status))[1];
    $status = [[0, $lastStatus]];

    $dtToday = $dtToday->add($oneDay);
    $tsToday = $dtToday->getTimestamp();
    $dtTomorrow = $dtTomorrow->add($oneDay);
}
