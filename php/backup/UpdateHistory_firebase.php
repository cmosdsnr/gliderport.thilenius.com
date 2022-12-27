<?php

/**
 * Keep the Firestore database up to date
 */

require __DIR__ . '/vendor/autoload.php';


//https://googleapis.github.io/google-cloud-php/#/docs/cloud-firestore/v1.20.1/firestore/documentsnapshot?method=reference


use Google\Cloud\Firestore\FirestoreClient;

ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "config.php";
require "libs/Database.php";
require "libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

define("IT_IS_DARK", 0);
define("SLED_RIDE_BAD_ANGLE", 1);
define("SLED_RIDE_POOR_ANGLE", 2);
define("SLED_RIDE", 3);
define("BAD_ANGLE", 4);
define("POOR_ANGLE", 5);
define("GOOD", 6);
define("EXCELLENT", 7);
define("SPEED_BAR", 8);
define("TOO_WINDY", 9);
define("NO_DATA", 10);

/**
 * Get the flying code 
 *
 * @param  mixed $speed     Speed in tenths of a mph
 * @param  mixed $direction div by 2 direction (0-180)
 * @param  mixed $isItDark  1 if it is dark right now
 * 
 * @return void
 */

function getCode($speed, $direction, $isItDark)
{
    // print "c $speed, $direction, $isItDark\n";
    if ($isItDark == 1) {
        $code = IT_IS_DARK;
    } else {
        if ($speed < 60) {
            if ($direction > 155 || $direction < 115) {
                $code = SLED_RIDE_BAD_ANGLE;
            } elseif ($direction > 151 || $direction < 118) {
                $code = SLED_RIDE_POOR_ANGLE;
            } else {
                $code = SLED_RIDE;
            }
        } elseif ($speed < 210) {
            if ($direction > 155 || $direction < 115) {
                $code = BAD_ANGLE;
            } elseif ($direction > 151 || $direction < 118) {
                $code = POOR_ANGLE;
            } else {
                if ($speed <= 110) {
                    $code = GOOD;
                } elseif ($speed < 150) {
                    $code = EXCELLENT;
                } else {
                    $code = SPEED_BAR;
                }
            }
        } else {
            $code = TOO_WINDY;
        }
    }
    return $code;
}

/*****************************************************
 * see if tomorrow is in the database
 * if not, fetch it and add it in
 */

$oneDay = new DateInterval('P1D');
$dtStart = new DateTime();
$dtStart->setTimezone(timezone_open('America/Los_Angeles'));
//file_put_contents("lastUpdate.txt", $dtStart->getTimestamp());
$dtStart->setTime(0, 0, 0);   // get the full day
$tsToday = $dtStart->getTimestamp();
$dtStart->add($oneDay);
$tsTomorrow = $dtStart->getTimestamp();

$firestore = new FirestoreClient();
$collection = $firestore->collection('codeHistory');

$query = $collection->where('date', '=', $tsTomorrow);
$snapshot = $query->documents();

$query = $collection->where('date', '=', $tsToday);
$snapToday = $query->documents();

function addDay($dtDay, $tsDay, $data, $collection)
{
    $dtDay->setTime(12, 0, 0);   // I think it needs noon       
    $f = getSun($dtDay);
    $sr = $f[0] - $tsDay;
    $ss = $f[1] - $tsDay;
    $start = intval($sr / 3600) - 1;
    $stop  = intval($ss / 3600) + 2;
    $codes = array();

    $foundSunRise = false;
    $lastInserted = -1;
    $lastCode = 0;
    foreach ($data->hourly as $v) {
        $code = getCode($v->wind_speed * 10, $v->wind_deg / 2, 0);

        if (($v->dt - $tsDay) > $sr && ($v->dt - $tsDay) < $ss) {
            if (!$foundSunRise) {
                // print "$sr, $lastCode\n";
                // var_dump($v);
                $foundSunRise = true;
                $codes[] = [$sr - 3600 * $start, $lastCode];
            } else {
                // print $v->dt . ", $code\n";
                if ($lastInserted != $lastCode) {
                    $codes[] = [$v->dt - $tsDay - 3600 * $start,  $lastCode];
                }
            }
            $lastInserted = $lastCode;
        }
        $lastCode = $code;
    }
    // print "$ss, 0\n";
    $codes[] = [$ss - 3600 * $start, 0];

    $newDay = $collection->add([
        'date' => $tsDay,
        'limits' => [$start, $stop],
        'sun' =>  [$sr, $ss],
        'codes' => json_encode($codes)
    ]);
    print "Added day for " . $dtDay->format("Y-m-d") . "\n";
}


function addTodaysForcast($dtDay, $tsDay, $data, $firestore)
{
    $dtDay->setTime(12, 0, 0);   // I think it needs noon       
    $f = getSun($dtDay);
    $sr = $f[0] - $tsDay;
    $ss = $f[1] - $tsDay;
    $start = intval($sr / 3600) - 1 - 24;
    $stop  = intval($ss / 3600) + 2 - 24;
    $codes = array();
    $lastCode = -1;
    foreach ($data->hourly as $v) {
        if (($v->dt - $tsDay) >= 3600 * $start && ($v->dt - $tsDay) <= 3600 * $stop) {
            $code = getCode($v->wind_speed * 10, $v->wind_deg / 2, 0);
            if ($code != $lastCode) {
                $codes[] = [($v->dt - $tsDay) / 3600, $code];
                $lastCode = $code;
            }
        }
    }

    $collection = $firestore->collection('todaysForecast');
    $snapshot = $collection->documents();
    $id = ($snapshot->rows())[0]->id();
    $collection->document($id)->update([
        ['path' => 'codes', 'value' => json_encode($codes)],
        ['path' => 'offset', 'value' => $data->timezone_offset],
        ['path' => 'date', 'value' => $tsDay],
    ]);

    print "Added todays forcast\n";
}
// $url =
//     "https://api.openweathermap.org/data/2.5/onecall" .
//     "?lat=32.8900&lon=-117.2523" .
//     "&exclude=minutely,daily" .
//     "&units=imperial" .
//     "&appid=483c6b4301f7069cbf4e266bffa6d5ff";

// try {
//     $k = file($url, FILE_IGNORE_NEW_LINES);
// } catch (Exception $e) {
//     return $e->getMessage();
// }
// $data = json_decode($k[0]);

// if (count((array)$data) == 0) {
//     return "OpenWeather Data Offline";
// }
// foreach ($data->hourly as $v) {
//     $code = getCode($v->wind_speed * 10, $v->wind_deg / 2, 0);
//     print "time: " . $v->dt . " speed:" . $v->wind_speed . " Dir:" . $v->wind_deg . " code:" . $code . "\n";
// }

if ($snapshot->isEmpty() || $snapToday->isEmpty()) {
    // we need to get and add a day
    // https://api.openweathermap.org/data/2.5/onecall?lat=32.8473&lon=-117.2742&exclude=minutely,daily&units=imperial&appid=483c6b4301f7069cbf4e266bffa6d5ff
    $url =
        "https://api.openweathermap.org/data/2.5/onecall" .
        "?lat=32.8473&lon=-117.2742" .
        "&exclude=minutely,daily" .
        "&units=imperial" .
        "&appid=483c6b4301f7069cbf4e266bffa6d5ff";

    try {
        $k = file($url, FILE_IGNORE_NEW_LINES);
    } catch (Exception $e) {
        return $e->getMessage();
    }
    $data = json_decode($k[0]);

    if (count((array)$data) == 0) {
        return "OpenWeather Data Offline";
    }
    addTodaysForcast($dtStart, $tsToday, $data, $firestore);

    if ($snapshot->isEmpty()) {
        addDay($dtStart, $tsTomorrow, $data, $collection);
    }

    if ($snapToday->isEmpty()) {
        $dtStart->sub($oneDay);
        addDay($dtStart, $tsToday, $data, $collection);
    }
}


/*****************************************************
 * Insert and new changes into today 
 * if not, fetch it and add it in
 */
/************************************************/
// load last update time
$tsLast = file_get_contents("lastUpdate.txt");

$query = $collection->where('date', '=', $tsToday);
$snapshot = $query->documents();

$id = ($snapshot->rows())[0]->id();
$data = ($snapshot->rows())[0]->data();
$day = json_decode($data['codes']);
$now = $tsLast - $tsToday - (3600 * $data['limits'][0]);

//look for last day array element ealier or equal the file record lastUpdate.txt
$i = 0;
while ($i + 1 < count($day) && $day[$i + 1][0] <= $now) {
    $i++;
}
//$i has the last real data point (non-forcast) in Firebase

//get database rows later than $day[$i][0] + $tsToday + (3600 * $data['limits'][0])
//and less than $data['sun'][1] (sunset)
$last = $day[$i][0] + $tsToday + (3600 * $data['limits'][0]);
$ss = $data['sun'][1] + $tsToday;

$sql = "SELECT * FROM gliderport_esp32 WHERE  UTC > $last AND UTC < $ss ORDER BY UTC ASC";
$rows = $db->query($sql)->fetchAll();

$lastCode =  $day[$i][1];
$updateCount = 0;
foreach ($rows as $key => $value) {

    $code = getCode($value->speed, $value->direction, 0);
    if ($code != $lastCode) {
        $tm = $value->UTC - $tsToday - (3600 * $data['limits'][0]);
        $updateCount++;
        $smallerRecordCount = 0;
        while ($day[$i + 1 + $smallerRecordCount] && $tm >= $day[$i + 1 + $smallerRecordCount][0]) {
            $smallerRecordCount++;
        }
        array_splice($day, $i + 1, $smallerRecordCount, [[$tm, $code]]);
        $i++;
        $lastCode = $code;
    }
}

if ($updateCount > 0) {
    echo "$updateCount new records\n";
    $collection->document($id)->update([['path' => 'codes', 'value' => json_encode($day)]]);
    $UTC = $tm + $tsToday + (3600 * $data['limits'][0]);
    file_put_contents("lastUpdate.txt", $UTC);
} else {
    echo "Nothing Updated\n";
}


/**
 * Get sunrise and sunset for a date 
 *
 * @param mixed $date to get sunrise and sunset for
 *
 * @return mixed $ary of sunset and sunrise
 */
function getSun($date)
{
    $h = new stdClass();

    //Gliderport coordinates
    $h->latitude  =   32.89;
    $h->longitude = -117.25;
    $h->julianDay = $date->getTimestamp() / 86400.0 + 2440587.5;
    $h->timeZone = $date->getOffset() / 3600;
    $h->julianCentury = ($h->julianDay - 2451545.0) / 36525.0;
    $h->geomMeanLongSun = (280.46646 +
        $h->julianCentury *
        (36000.76983 + $h->julianCentury * 0.0003032));
    $h->geomMeanLongSun =  $h->geomMeanLongSun -
        360 *
        floor($h->geomMeanLongSun / 360);
    $h->geomMeanAnomSun =  357.52911 + $h->julianCentury *
        (35999.05029 - 0.0001537 * $h->julianCentury);
    $h->EccentEarthOrbit = 0.016708634 - $h->julianCentury *
        (0.000042037 + 0.0000001267 * $h->julianCentury);
    $h->SunEqofCtr =       sin(deg2rad($h->geomMeanAnomSun)) *
        (1.914602 - $h->julianCentury *
            (0.004817 + 0.000014 * $h->julianCentury)) +
        sin(deg2rad(2 * $h->geomMeanAnomSun)) *
        (0.019993 - 0.000101 * $h->julianCentury) +
        sin(deg2rad(3 * $h->geomMeanAnomSun)) *
        0.000289;
    $h->SunTrueLong =       $h->geomMeanLongSun + $h->SunEqofCtr;
    $h->SunAppLong =        $h->SunTrueLong - 0.00569 - 0.00478 *
        sin(deg2rad(125.04 - 1934.136 * $h->julianCentury));
    $h->MeanObliqEcliptic = 23 + (26 + (
        (21.448 - $h->julianCentury *
            (46.815 + $h->julianCentury *
                (0.00059 - $h->julianCentury *
                    0.001813)))) / 60) / 60;
    $h->ObliqCorr  = $h->MeanObliqEcliptic + 0.00256 *
        cos(deg2rad(125.04 - 1934.136 * $h->julianCentury));
    $h->SunDeclin =  rad2deg(
        asin(
            sin(deg2rad($h->ObliqCorr)) *
                sin(deg2rad($h->SunAppLong))
        )
    );
    $h->ha = rad2deg(
        acos(
            cos(deg2rad(90.833)) /
                (cos(deg2rad($h->latitude)) * cos(deg2rad($h->SunDeclin))) -
                tan(deg2rad($h->latitude)) * tan(deg2rad($h->SunDeclin))
        )
    );
    $h->VarY =  tan(deg2rad($h->ObliqCorr / 2)) *
        tan(deg2rad($h->ObliqCorr / 2));
    $h->EqOfTime =  4 * rad2deg(
        $h->VarY * sin(2 * deg2rad($h->geomMeanLongSun)) -
            2 * $h->EccentEarthOrbit *
            sin(deg2rad($h->geomMeanAnomSun)) +
            4 * $h->EccentEarthOrbit * $h->VarY *
            sin(deg2rad($h->geomMeanAnomSun)) *
            cos(2 * deg2rad($h->geomMeanLongSun)) -
            0.5 * $h->VarY * $h->VarY *
            sin(4 * deg2rad($h->geomMeanLongSun)) -
            1.25 * $h->EccentEarthOrbit * $h->EccentEarthOrbit *
            sin(2 * deg2rad($h->geomMeanAnomSun))
    );
    $SolarNoon = (720 -
        4 * $h->longitude -
        $h->EqOfTime +
        $h->timeZone * 60) / 1440;
    $sh = floor(24 * $SolarNoon);
    $SolarNoon -= $sh / 24;
    $sm = floor(24 * 60 * $SolarNoon);
    $SolarNoon -= $sm / (60 * 24);
    $ss = round(24 * 60 * 60 * $SolarNoon);
    $SolarNoon = $sh / 24 + $sm / (60 * 24) + $ss / (24 * 60 * 60);
    if ($ss < 10) {
        $ss = "0" . $ss;
    }
    if ($sm < 10) {
        $sm = "0" . $sm;
    }
    $Sunrise = ($SolarNoon * 1440 - $h->ha * 4) / 1440;
    $Sunset  = ($SolarNoon * 1440 + $h->ha * 4) / 1440;
    $date->setTime(0, 0, 0);
    $d = $date->getTimestamp();

    $sr = $d + intval($Sunrise * 24 * 3600);
    $ss = $d + intval($Sunset * 24 * 3600);

    return [$sr, $ss];
}
