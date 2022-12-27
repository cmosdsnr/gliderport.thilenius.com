<?php

/**
 * Keep the Firestore database up to date with internet status
 * For now, this will get called every min, but should be changed to execute 
 * when called by the raspberry pi 4 at home
 */

require __DIR__ . '/vendor/autoload.php';

use Google\Cloud\Firestore\FirestoreClient;

ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "config_raspberry.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;


$firestore = new FirestoreClient();

setTableStats($db, $firestore);
updateWeeks($db, $firestore);
updateVideos($firestore);



function setTableStats($db, $firestore)
{
    $sql = 'select count(*) from hitCounter';
    $h['totalCnt'] = $db->query($sql)->fetchColumn();

    $sql = 'select count(DISTINCT IP) from hitCounter';
    $h['UniqueTotalCnt'] = $db->query($sql)->fetchColumn();

    // day hits
    $date = new DateTime();
    $date->setTimezone(new DateTimeZone('America/Los_Angeles'));
    $date->sub(new DateInterval("P1D"));
    $sql = 'select count(*) from hitCounter where hit >"' .
        $date->format('Y-m-d H:i:s') . '"';
    $h['dayCnt']   = $db->query($sql)->fetchColumn();

    $sql = 'select count(DISTINCT IP) from hitCounter where hit >"' .
        $date->format('Y-m-d H:i:s') . '"';
    $h['UniqueDayCnt']   = $db->query($sql)->fetchColumn();

    // month hits
    $date->add(new DateInterval("P1D"));
    $date->sub(new DateInterval("P1M"));
    $sql = 'select count(*) from hitCounter where hit >"' .
        $date->format('Y-m-d H:i:s') . '"';
    $h['monthCnt'] = $db->query($sql)->fetchColumn();
    $sql = 'select count(DISTINCT IP) from hitCounter where hit >"' .
        $date->format('Y-m-d H:i:s') . '"';
    $h['UniqueMonthCnt'] = $db->query($sql)->fetchColumn();


    $collection = $firestore->collection('stats');
    $collection->document("counts")->update([
        ['path' => 'total', 'value' =>  intval($h['totalCnt'])],
        ['path' => 'UniqueTotal', 'value' =>  intval($h['UniqueTotalCnt'])],
        ['path' => 'day', 'value' =>  intval($h['dayCnt'])],
        ['path' => 'UniqueDay', 'value' =>  intval($h['UniqueDayCnt'])],
        ['path' => 'month', 'value' =>  intval($h['monthCnt'])],
        ['path' => 'UniqueMonth', 'value' =>  intval($h['UniqueMonthCnt'])]
    ]);
}


function updateWeeks($db, $firestore)
{
    // Get the lastest day from Firebase
    $collection = $firestore->collection('stats/weeks/weeks');
    $query = $collection->orderBy("day", 'DESC')->limit(1);
    $snapshot = $query->documents();
    foreach ($snapshot as $document) {
        $day = $document->data()['day'];
    }

    // print_r($day . "\n");


    // get any new days in local Db that are later than $day from filrebase
    $sql = "SELECT * FROM HitCountWeekStats WHERE day > '" . $day . "'";
    $query = $db->prepare($sql);
    $query->execute();
    $h = $query->fetchAll(PDO::FETCH_OBJ);

    // Add these new days into the firbase
    foreach ($h as $k => $v) {
        $data = [
            'day' => $v->day,
            'total' => intval($v->total),
            'unique' => intval($v->unique),
        ];
        $collection->document($v->day)->set($data);
    }
}


function updateVideos($firestore)
{

    $dir    = '/home/thillnea/www/gliderport/video';
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
    // print_r($pairs);


    $collection = $firestore->collection('stats');
    $docRef = $collection->document('files');
    $snapshot = $docRef->snapshot();

    if ($snapshot->exists()) {
        print_r(strlen($snapshot->data()['data']));
        $d = json_encode($pairs);
        if (strlen($d) != strlen($snapshot->data()['data'])) {
            $collection->document("files")->update(
                [
                    ['path' => 'data', 'value' =>  $d]
                ]
            );
        }
    } else {
        printf('Document %s does not exist!' . PHP_EOL, $snapshot->id());
    }
}
