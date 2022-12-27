<?php

/**
 * Keep the sandiel8_live:code_history in sync with the sandiel8_live:gliderport data
 * Called on Namecheap by a cron job every 5 minutes
 * code_history has 2 columns date timestamp(start time of a day) and data(json encoded)
 * code_history has 1 record with date=0 which has data set to the last time this script was called
 * code changes are inserted as code_history also contains forecast data
 */

ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);

require "../config.php";
require "../libs/Database.php";
require "../libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;


// $t = (object)[
//     'date' => 0,
//     'limits' => [0, 0],
//     'sun' =>  [0, 0],
//     'codes' => [0]
// ];

// if (is_object($t)) echo "Is an object\n";
// if (is_array($t)) echo "Is an array\n";

// exit();


function initialize($ts)
{
    global $tz;
    $dt = (new DateTime('now', $tz))->setTimestamp($ts)->setTime(12, 0, 0);
    $f = getSun($dt);
    $sr = $f[0] - $ts;
    $ss = $f[1] - $ts;
    $start = intval($sr / 3600) - 1;
    $stop  = intval($ss / 3600) + 2;
    return ((object)[
        'limits' => [$start, $stop],
        'sun' =>  [$sr, $ss],
        'codes' => []
    ]);
}

function safeFetch($ts)
{
    global $db;
    $query = $db->query("SELECT * FROM `code_history` WHERE date=$ts;");;
    if ($query->rowCount() > 0) {
        $obj = json_decode($query->fetch()->data);
        if (!is_object($obj)) initialize($ts);
        else if (!property_exists($obj, 'codes')) initialize($ts);
    } else {
        $ary = initialize($ts);
        insertOrUpdate($ts, $ary);
        return ($ary);
    }
}


$tz = new DateTimeZone('America/Los_Angeles');
$dtToday = new DateTime("now", $tz);
$tsNow = $dtToday->getTimestamp();
$dtToday->setTime(0, 0, 0);   // get the full day
$tsToday = $dtToday->getTimestamp();
$tsTomorrow = (new DateTime("now", $tz))->add(new DateInterval('P1D'))->setTime(0, 0, 0)->getTimestamp();


$query = $db->query("SELECT * FROM `code_history` WHERE date=$tsToday;");;
if ($query->rowCount() > 0) {
    echo "today exists\n";
} else {

    echo "today doesn't exists\n";
}

$query = $db->query("SELECT * FROM `code_history` WHERE date=$tsTomorrow;");;
if ($query->rowCount() > 0) {
    echo "tomorrow exists\n";
} else {

    echo "tomorrow doesn't exists\n";
}

$d = safeFetch($tsToday);
$d = safeFetch($tsTomorrow);

$query = $db->query("SELECT * FROM `code_history` WHERE date=$tsToday;");;
if ($query->rowCount() > 0) {
    echo "today exists\n";
} else {

    echo "today doesn't exists\n";
}

$query = $db->query("SELECT * FROM `code_history` WHERE date=$tsTomorrow;");;
if ($query->rowCount() > 0) {
    echo "tomorrow exists\n";
} else {

    echo "tomorrow doesn't exists\n";
}




exit(0);


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

$codesMeaning = [];
$codesMeaning[] = "it is dark";
$codesMeaning[] = "sled ride, bad angle";
$codesMeaning[] = "sled ride, poor angle";
$codesMeaning[] = "sled ride";
$codesMeaning[] = "bad angle";
$codesMeaning[] = "poor angle";
$codesMeaning[] = "good";
$codesMeaning[] = "excellent";
$codesMeaning[] = "speed bar";
$codesMeaning[] = "too windy";
$codesMeaning[] = "no data";

/*****************************************************
 * See if tomorrow is in the database
 * if not, fetch it and add it in
 */

$format = 'Y-m-d H:i:s';
$tz = new DateTimeZone('America/Los_Angeles');
$dtToday = new DateTime("now", $tz);
$tsNow = $dtToday->getTimestamp();
$dtToday->setTime(0, 0, 0);   // get the full day
$tsToday = $dtToday->getTimestamp();

//update forecast if necessary
$f = json_decode($db->query("SELECT * FROM `miscellaneous` WHERE `id`='forecast';")->fetch()->data);
if (is_array($f)) {
    $forecast = $f;
    $tsLast = $forecast[count($f) - 1][0];
} else {
    $forecast = [];
    $tsLast = 0;
}

// strip off past elements, leave current hour though
while ((count($forecast) > 0) && $forecast[0][0] < ($tsNow - 3600)) {
    array_shift($forecast);
}

if ($tsLast - $tsNow < 45 * 3600) {
    if ($tsLast - $tsNow > 0) {
        echo "database has next " . intval(($tsLast - $tsNow) / 3600) . " in it\n";
    }
    echo "need to fetch\n";
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

        $data = json_decode($k[0]);

        if (count((array)$data) == 0) {
            echo "OpenWeather Data Offline";
        } else {
            foreach ($data->hourly as $v) {
                if ($v->dt > $tsLast) {
                    $code = getCode($v->wind_speed * 10, $v->wind_deg, 0);
                    $forecast[] = [$v->dt, $code];
                }
            }
        }
    } catch (Exception $e) {
        echo "could not load openweathermap: " . $e->getMessage() . "\n";
        // exit();
    }
}
$db->query("UPDATE `miscellaneous` SET `data`='" . json_encode($forecast) . "' WHERE `id`='forecast';");
print "Updated forecast\n";

// update todays codes

$old = json_decode($db->query("SELECT * FROM `miscellaneous` WHERE `id`='todays_codes';")->fetch()->data);
$i = 0;
$todays_codes = [];
// go to 6am
while (($i < count($forecast) - 1) && (($tsToday + 6 * 3600) > $forecast[$i][0])) {
    $i++;
}
$last_code = -1;
$last_i = $i;
while (($i < count($forecast) - 1) && (($tsToday + 19 * 3600) > $forecast[$i][0])) {
    $code = $forecast[$i][1];
    if (($last_code != $code) || $i - $last_i == 2) {
        $todays_codes[] = [intval(($forecast[$i][0] - $tsToday) / 3600), $codesMeaning[$forecast[$i][1]]];
        $last_code = $code;
        $last_i = $i;
    }
    $i++;
}

if (serialize($old) != serialize($todays_codes)) {
    $db->query("UPDATE `miscellaneous` SET `data`='" . json_encode($todays_codes) . "' WHERE `id`='todays_codes';");
    $db->query("UPDATE `server_sent` SET `last_forecast`=" . $tsNow . " WHERE `id`=1;");
    // var_dump($todays_codes);
    print "Updated todays codes\n";
} else {
    print "no change to todays_codes\n";
}

/*****************************************************
 * Insert any new changes into today 
 * if not, fetch it and add it in
 */
/************************************************/

// load last update time (was saved by this script last run)
$tsLast = json_decode($db->query("SELECT * FROM `code_history` WHERE date=0;")->fetch()->data);

//load today's data
$query = $db->query("SELECT * FROM `code_history` WHERE date=$tsToday;");;
if ($query->rowCount() > 0) {
    $today  = json_decode($query->fetch()->data);
} else {
    $today = [];
}

$day = $today->codes;

//seconds past starting hour, the one where sunrise occurs
$now = $tsLast - $tsToday - (3600 * $today->limits[0]);

//look for last day array element earlier or equal the file record lastUpdate.txt
$i = 0;
while ($i + 1 < count($day) && $day[$i + 1][0] <= $now) {
    $i++;
}
echo $i . ": {$day[$i][0]} with code {$day[$i][1]} \n";

//remove the rest of the day
$day = array_slice($day, 0, $i + 1);
echo "day is now " . count($day) . " long\n";

//get database rows later than $day[$i][0] + $tsToday + (3600 * $data['limits'][0])
//and less than $data['sun'][1] (sunset)
$dtA = new DateTime("now", $tz);
$dtB = new DateTime("now", $tz);
$dtA->setTimestamp($day[$i][0] + $tsToday + (3600 * $today->limits[0]));
$dtB->setTimestamp($today->sun[1] + $tsToday);

echo "from {$dtA->format($format)} to {$dtB->format($format)}\n";

$sql = "SELECT * FROM gliderport WHERE  `recorded` > '{$dtA->format($format)}' AND `recorded` < '{$dtB->format($format)}' ORDER BY `recorded` ASC";
$rows = $db->query($sql)->fetchAll();

echo count($day) . " records between last update and now or sunset, whichever is first\n";

$lastCode =  $day[$i][1];
$updateCount = 0;
for ($j = 0; $j < count($rows); $j += 8) {
    //Average 8 rows at a time
    $k = 0;
    $s = 0;
    $d = 0;
    while ($k < 8 && $k < count($rows)) {
        $s += $rows[$j]->speed;
        $d += $rows[$j]->direction;
        $k++;
    }
    $s /= $k;
    $d /= $k;
    $code = getCode($s, $d, 0);
    if ($code != $lastCode) {
        $tm = DateTime::createFromFormat($format, $rows[$j]->recorded, $tz)->getTimestamp() - $tsToday - (3600 * $today->limits[0]);
        $updateCount++;
        $day[] = [$tm, $code];
        $i++;
        $lastCode = $code;
    }
}

//last point had time $rows[last row]->recorded
$tm = DateTime::createFromFormat($format, $rows[count($rows) - 1]->recorded, $tz)->getTimestamp();
$i = 0;
for ($i = 0; $i < count($forecast); $i++) {
    if ($forecast[$i][0] > $tm) {
        $i--;
        break;
    }
}

echo "last row has ts: " . $tm . " and selected forecast tm is: " . $forecast[$i][0] . "\n";
$day[] = [$tm + 1 - $tsToday - 3600 * $today->limits[0], $forecast[$i][1]];
$i++;
while ($forecast[$i][0] < $dtB->getTimestamp()) {
    $day[] = [$forecast[$i][0] - $tsToday - 3600 * $today->limits[0], $forecast[$i][1]];
    $i++;
}
$day[] = [$today->sun[1] - 3600 * $today->limits[0], 0];

if ($updateCount > 0) {
    echo "$updateCount new records\n";
    $today->codes = $day;
    $db->query("UPDATE `code_history` SET `data`='" . json_encode($today) . "' WHERE date=$tsToday;");
    $db->query("UPDATE `code_history` SET `data`=$tm WHERE date=0;");
} else {
    echo "Nothing Updated\n";
}



$next = [];
$tsTomorrow = (new DateTime("now", $tz))->add(new DateInterval('P1D'))->setTime(0, 0, 0)->getTimestamp();
$f = getSun((new DateTime("now", $tz))->add(new DateInterval('P1D'))->setTime(12, 0, 0));
$sr = $f[0] - $tsTomorrow;
$ss = $f[1] - $tsTomorrow;
$start = intval($sr / 3600) - 1;
$stop  = intval($ss / 3600) + 2;
while (($i < count($forecast)) && ($forecast[$i][0] < $f[0])) {
    $i++;
}
$next[] = [$sr - 3600 * $start, $forecast[$i - 1][1]];
while (($i < count($forecast)) && ($forecast[$i][0] < $f[1])) {
    $next[] = [$forecast[$i][0] - $tsTomorrow - 3600 * $start, $forecast[$i][1]];
    $i++;
}
$next[] = [$ss - 3600 * $start, 0];

$record = [
    'limits' => [$start, $stop],
    'sun' =>  [$sr, $ss],
    'codes' => $next
];

// var_dump($record);
$db->query("UPDATE `code_history` SET `data`='" . json_encode($record) . "' WHERE date=$tsTomorrow;");
print "Added tomorrow " . $tsTomorrow . " with data " . json_encode($record) . "\n";


$next = [];
$tsTomorrow = (new DateTime("now", $tz))->add(new DateInterval('P2D'))->setTime(0, 0, 0)->getTimestamp();
$f = getSun((new DateTime("now", $tz))->add(new DateInterval('P2D'))->setTime(12, 0, 0));
$sr = $f[0] - $tsTomorrow;
$ss = $f[1] - $tsTomorrow;
$start = intval($sr / 3600) - 1;
$stop  = intval($ss / 3600) + 2;
while (($i < count($forecast)) && ($forecast[$i][0] < $f[0])) {
    $i++;
}
$next[] = [$sr - 3600 * $start, $forecast[$i - 1][1]];
while (($i < count($forecast)) && ($forecast[$i][0] < $f[1])) {
    $next[] = [$forecast[$i][0] - $tsTomorrow - 3600 * $start, $forecast[$i][1]];
    $i++;
}
$next[] = [$ss - 3600 * $start, 0];

$record = [
    'limits' => [$start, $stop],
    'sun' =>  [$sr, $ss],
    'codes' => $next
];

// var_dump($record);
$db->query("UPDATE `code_history` SET `data`='" . json_encode($record) . "' WHERE date=$tsTomorrow;");
print "Added day  " . $tsTomorrow . "\n";



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
            if ($direction > 310 || $direction < 230) {
                $code = SLED_RIDE_BAD_ANGLE;
            } elseif ($direction > 302 || $direction < 236) {
                $code = SLED_RIDE_POOR_ANGLE;
            } else {
                $code = SLED_RIDE;
            }
        } elseif ($speed < 210) {
            if ($direction > 310 || $direction < 230) {
                $code = BAD_ANGLE;
            } elseif ($direction > 302 || $direction < 236) {
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
