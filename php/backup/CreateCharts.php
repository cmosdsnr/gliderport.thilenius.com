<?php

/**
 * Maintain a json file with the last 7 days of flying codes. 
 * 
 */

require __DIR__ . '/vendor/autoload.php';


//https://googleapis.github.io/google-cloud-php/#/docs/cloud-firestore/v1.20.1/firestore/documentsnapshot?method=reference


use Google\Cloud\Firestore\FirestoreClient;

define('TEMP_ADJUST', 40);
define('DIR_ADJUST', 33);    //out of 180! dir/2... data in esp database is wrong

ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


require "config.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

$interval = new DateInterval('P1D');
$dtStart = new DateTime("now", timezone_open('America/Los_Angeles'));
$dtStart->sub($interval);
$dtStart->setTime(9, 0);

$dtEnd = new DateTime("now", timezone_open('America/Los_Angeles'));

$rows = $db->query(
    "SELECT * FROM `gliderport_esp32` WHERE UTC >" .
        $dtStart->getTimestamp() . " AND UTC <" .  $dtEnd->getTimestamp()
)->fetchAll();

$times = [];
for ($i = 0; $i < count($rows); $i++) {
    $times[] = intval($rows[$i]->UTC);
    $speed[] = intval($rows[$i]->speed) / 10;
    $direction[] = intval(DIR_ADJUST + $rows[$i]->direction) * 2;
    $pressure[] = intval($rows[$i]->pressure);
    $humidity[] = intval($rows[$i]->humidity);
    $temperature[] = intval(TEMP_ADJUST + $rows[$i]->temp);
}



$firestore = new FirestoreClient();
$collection = $firestore->collection('chartsEsp');

$newDay = $collection->add([
    'times'     =>  json_encode($times),
    'speed'     =>  json_encode($speed),
    'direction' =>  json_encode($direction),
    'pressure'  =>  json_encode($pressure),
    'humidity'  =>  json_encode($humidity),
    'temperature'  =>  json_encode($temperature),
]);
