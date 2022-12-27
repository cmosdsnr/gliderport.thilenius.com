<?php

/**
 * Keep the Firestore database up to date with internet status
 * For now, this will get called every min, but should be changed to execute when called by the raspberry pi 4 at home
 */

//when called from web, this is not set, so set it
putenv("GOOGLE_APPLICATION_CREDENTIALS=netninja-game-guidez-1d8c2-firebase-adminsdk-w55cp-e90b7fc724.json");
require __DIR__ . '/vendor/autoload.php';


use Google\Cloud\Firestore\FirestoreClient;


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "config_raspberry.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

/*****************************************************
 * Fetch last 10 days of status, one at a time
 */

$firestore = new FirestoreClient();
$collection = $firestore->collection('statusHistory');

$snapshot = $collection->orderBy('date', 'ASC')->documents();
$last = -1;
foreach ($snapshot as $document) {
    $status = json_decode($document->data()['status']);
    //$status = $document->data()['status'];
    $date = $document->data()['date'];
    $dt = DateTime::createFromFormat('Y-m-d', $document->data()['date'], timezone_open('America/Los_Angeles'));
    $dt->setTime(0, 0, 0);
    $ts = $dt->getTimestamp();
    foreach ($status as $stat) {
        if ($stat[1] != $last) {
            $last = $stat[1];
            $s = $dt->setTimestamp($ts + $stat[0]);
            $sql  = "INSERT INTO `network_status`(`recorded`, `status`) VALUES ('{$dt->format("Y-m-d H:i:s")}',{$stat[1]})";
            $db->query($sql);
            // echo "$last : $sql<br/>";
        }
    }
}
