<?php

/**
 * Maintain a json file with the last 7 days of flying codes. 
 * 
 * PHP version 5
 *
 * @category   CategoryName
 * @package    PackageName
 * @author     Stephen Thilenius <stephen@thilenius.com>
 * @copyright  2000-2020 Thilenius Group
 * @license    http://www.php.net/license/3_01.txt  PHP License 3.01
 * @version    SVN: $Id$
 * @link       http://pear.php.net/package/PackageName
 * @see        NetOther, Net_Sample::Net_Sample()
 * @since      File available since Release 1.2.0
 * @deprecated File deprecated in Release 2.0.0
 */

require __DIR__ . '/vendor/autoload.php';


//https://googleapis.github.io/google-cloud-php/#/docs/cloud-firestore/v1.20.1/firestore/documentsnapshot?method=reference


use Google\Cloud\Firestore\FirestoreClient;




ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST,GET,OPTIONS');
header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept');
header("Content-Type: application/json; charset=ISO-8859-1");

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
 * Code
 */
class Code
{
    /**
     * Get the flying code 
     *
     * @param mixed $speed     Speed in tenths of a mph
     * @param mixed $direction div by 2 direction (0-180)
     * @param mixed $isItDark  1 if it is dark right now
     * 
     * @return void
     */
    public function getCode($speed, $direction, $isItDark)
    {
        // print "c $speed, $direction, $isItDark\n";
        if ($isItDark == 1) {
            $code = IT_IS_DARK;
        } else {
            if ($speed < 80) {
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
}

$c = new Code();
$lastCode = -1;
$dtStart = new DateTime("now", timezone_open('America/Los_Angeles'));
$dtStart->setTime(0, 0, 0);   // get the full day
$interval = new DateInterval('P7D');
$dtStart->sub($interval);

$interval = new DateInterval('P1D');
$dtEnd = new DateTime("now", timezone_open('America/Los_Angeles'));
$dtEnd->setTimestamp($dtStart->getTimestamp());
$dtEnd->add($interval);

$dtNow = new DateTime("now", timezone_open('America/Los_Angeles'));
$nowTimestamp = $dtNow->getTimestamp();

$days = [];
$startingUTC = [];

for ($i = 0; $i < 8; $i++) {
    $day = [];
    echo "Starting: " . $dtStart->getTimestamp() . " " .   $dtStart->format("Y-m-d H:i:s") . "\n";
    $startingTimestamp = $dtStart->getTimestamp();
    $startingUTC[] = $startingTimestamp;
    echo "Ending  : " . $dtEnd->getTimestamp() . " " .   $dtEnd->format("Y-m-d H:i:s") . "\n";
    $f = getSun($dtStart);
    $sr = $f[0] - $startingTimestamp;
    $ss = $f[1] - $startingTimestamp;
    echo "Sun Rise: " . $sr . " Sun Set: " . $ss . "\n";
    $query = $db->query(
        "SELECT * FROM `gliderport_esp32` WHERE UTC >" .
            $dtStart->getTimestamp() . " AND UTC <" .  $dtEnd->getTimestamp()
    );
    $count =  $query->rowCount();
    echo "Rows in dB: " . $count . "\n";

    if ($count == 0) {
        $day[] = [$sr, NO_DATA];
        $day[] = [$ss, IT_IS_DARK];
    } else {
        $j = 0;
        $rows = $query->fetchAll(PDO::FETCH_ASSOC);

        if (($rows[0]['UTC'] - $startingTimestamp > $sr) || (end($rows)['UTC'] - $startingTimestamp < $sr)) {
            // no entries before sunrise OR all entries are before sunrise => start out with 'no data'
            $code = NO_DATA;
            $day[] = [$sr, NO_DATA];
            if ((end($rows)['UTC'] - $startingTimestamp < $sr)) {
                //we are done... no more data
                $j = $count;
                echo "No points after SR\n";
            } else {

                echo "First point after SR\n";
            }
        } else {
            // find last entry before sunrise (there will be at least 1)
            while (($j < $count) && ($rows[$j + 1]['UTC'] - $startingTimestamp < $sr)) {
                $j++;
            }
            echo "First before sr: " . ($rows[$j]['UTC'] - $startingTimestamp) . "\n";
            if ($j > 0 &&  ($sr - $rows[$j]['UTC'] +  $startingTimestamp) > 30 * 60) {
                echo "no data in proximity of SR\n";
                $code = NO_DATA;
            } else {
                $code = $c->getCode($rows[$j]['speed'], $rows[$j]['direction'], 0);
            }
            $day[] = [$sr, $code];
            $j++;
        }
        while (($j < $count) && ($rows[$j]['UTC'] - $startingTimestamp < $ss)) {
            if ($j > 0 &&  ($rows[$j]['UTC'] - $rows[$j - 1]['UTC']) > 30 * 60) {
                $u = $rows[$j - 1]['UTC'] - $startingTimestamp + 2 * 60;
                if ($u > $sr) {
                    $day[] = [$u, NO_DATA];
                }
            }
            $testCode = $c->getCode($rows[$j]['speed'], $rows[$j]['direction'], 0);
            if ($testCode != $code) {
                $code = $testCode;
                $day[] = [$rows[$j]['UTC'] - $startingTimestamp, $code];
            }
            $j++;
        }
        $day[] = [$ss, IT_IS_DARK];
        //$day[] = [$dtEnd->getTimestamp() - $startingTimestamp, IT_IS_DARK];
    }

    $d = new DateTime("now", timezone_open('America/Los_Angeles'));
    $days[] = $day;
    $dtStart->setTimestamp($dtEnd->getTimestamp());
    $dtEnd->add($interval);
    echo "\n";
}

// if ($fp = fopen("../OpenWeather/forcast.json", "r")) {
//     // pop off the last sunset
//     $lastSunset = array_pop($days[7]);
//     $lastDataPoint = end($days[7]);
//     fread
// }
$json_data = file_get_contents('../../OpenWeather/forcast.json');
$json = json_decode($json_data, true);
// var_dump($json);
// foreach ($json as $day) {
//     foreach ($day as $pt) {
//         print "UTC:".$pt['u']." speed:".$pt["s"]." dir:".$pt['d']."\n";
//     }
//     print "\n";
// }

//make sure it's what we expect, two records
if (count($json) == 2) {
    //there are two days in the forecast, today and tomorrow, array 0 and 1
    $today = $json[0];
    $tomorrow = $json[1];
    foreach ($today as $i => $record) {
        $today[$i]['u'] -= $startingTimestamp;
        //print $record['u'] . " ";
    }
    // foreach ($today as $record) {
    //     print $record['u'] . " ";
    // }
    $lastToday = end($today);
    $todayCount = count($today);
    //$endOfDay = array_pop($days[7]); 
    $sunset = array_pop($days[7]);
    $lastRecorded = end($days[7])[0];
    $now = $nowTimestamp - $startingTimestamp;
    $i = 0;
    //print "\n" . $lastRecorded . " " . $now . "\n";

    if ($lastToday > $now) {
        // there should be a forecast point to add
        while ($i < (count($today) - 1) && $today[$i + 1]['u'] < $now) {
            $i++;
        }
        // $today[$i] is the last forecast less than now 
        // print $now . " " . $ss . " " . $today[1]['u']  . "\n";
        if ($now < $ss) {
            // print $now . " " . $today[$i]['s'] . " " . $today[1]['d']  . "\n";
            $code = $c->getCode(10 * $today[$i]['s'], $today[$i]['d'] / 2, 0);
            $days[7][] = [$now, $code];
        }
        $i++;

        while (($i < $todayCount) && ($today[$i]['u'] < $ss)) {
            $x = $c->getCode(intval(10 * $today[$i]['s']), intval($today[$i]['d'] / 2), 0);
            //print "s:" . intval(10 * $today[$i]['s']) . " and d:" . intval($today[$i]['d'] / 2) . " returned " . $x . "\n";
            if ($x != $code) {
                $code = $x;
                // add another point
                $days[7][] = [$today[$i]['u'], $code];
            }
            $i++;
        }
        $code = IT_IS_DARK;
        $days[7][] = [$ss, $code];
        //$days[7][] = $endOfDay;
    }
    //print "now: " . $nowTimestamp . " fc: " . $json[0][0]['u'] . " end: " . $t['u'] . "\n";
    // foreach ($json[0] as $forecastPoint) {print $forecastPoint['u'] . " ";}
}


//print  $dtStart->format("Y-m-d H:i:s") . "\n";
$tomorrowCount = count($tomorrow);
$f = getSun($dtStart);
$startingTimestamp = $dtStart->getTimestamp();
$sr = $f[0] - $startingTimestamp;
$ss = $f[1] - $startingTimestamp;
$day = [];
//$day[] = [0, 0];

//print $tomorrow[0]['u'] . " " . $startingTimestamp . "\n";
foreach ($tomorrow as $i => $record) {
    $tomorrow[$i]['u'] -= $startingTimestamp;
}
// foreach ($tomorrow as $record) {
//     print $record['u'] . " ";
// }

if ($tomorrow[0]['u'] > $sr) {
    $day[] = [$sr, NO_DATA];
}
$i = 0;
while (($i < ($tomorrowCount - 1)) && ($tomorrow[$i + 1]['u'] < $sr)) {
    $i++;
}
$code = $c->getCode(intval(10 * $tomorrow[$i]['s']), intval($tomorrow[$i]['d'] / 2), 0);
$day[] = [$sr, $code];
$i++;

while (($i < $tomorrowCount) && ($tomorrow[$i]['u'] < $ss)) {
    $x = $c->getCode(intval(10 * $tomorrow[$i]['s']), intval($tomorrow[$i]['d'] / 2), 0);
    if ($x != $code) {
        $code = $x;
        // add another point
        $day[] = [$tomorrow[$i]['u'], $code];
    }
    $i++;
}
$day[] = [$ss, IT_IS_DARK];
//$day[] = [3600 * 24, IT_IS_DARK];
$startingUTC[] = $startingTimestamp;
$days[] = $day;

// foreach ($days as $i => $k) {
//     foreach ($k as $time) {
//         print $time[0] . ": " . $d->setTimestamp($time[0] + $startingUTC[$i])->format("Y-m-d H:i:s") .
//             " " . $time[1] . "\n";
//     }
//     print "\n\n";
// }
// exit();


$firestore = new FirestoreClient();
$collection = $firestore->collection('codeHistory');

//empty out codeHistory 
$snapshot = $collection->documents();
foreach ($snapshot as $day) {
    $day->reference()->delete();
}


$collection = $firestore->collection('codeHistory');


foreach ($days as $i => $day) {
    $date = $startingUTC[$i];
    $sr = $day[0][0];
    $ss = end($day)[0];
    $start = intval($sr / 3600) - 1;
    $stop  = intval($ss / 3600) + 2;
    $codes =  json_encode($day);
    foreach ($day as $i => $point) {
        $day[$i][0] -=  3600 * $start;
    }
    $codes =  json_encode($day);

    $newDay = $collection->add([
        'date' => $date,
        'limits' => [$start, $stop],
        'sun' =>  [$sr, $ss],
        'codes' => $codes
    ]);
    // $newDay->collection('data')->add($day); 
}



//extra array has starting utc's
$days[] = $startingUTC;

$fp = fopen("sevenDays.json", "w") or die("no file");
fwrite($fp, json_encode($days));
fclose($fp);







/**
 * Get flying code
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
