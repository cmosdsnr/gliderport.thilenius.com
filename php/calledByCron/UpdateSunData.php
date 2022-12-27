<?php

/**
 * Maintain sunrise and sunset data (cron call daily) in the dB
 * 
 */


ini_set('display_errors', 1);
error_reporting(E_ERROR | E_WARNING | E_PARSE);


require "../config.php";
require "../libs/Database.php";
require "../libs/Controller.php";

$Controller = new Controller();
$db = $Controller->db;

$h = new stdClass();

//Gliderport coordinates
$h->latitude  =   32.89;
$h->longitude = -117.25;


$date = new DateTime();
$date->setTime(12, 0, 0);
$date->setTimezone(new DateTimeZone('America/Los_Angeles'));
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
$h->SolarNoonRaw = $SolarNoon;
$h->SolarNoon = $sh . ":" . $sm . ":" . $ss;
$Sunrise = ($SolarNoon * 1440 - $h->ha * 4) / 1440;
$h->SunriseRaw = $Sunrise;
$sh = floor(24 * $Sunrise);
$Sunrise -= $sh / 24;
$sm = floor(24 * 60 * $Sunrise);
$Sunrise -= $sm / (60 * 24);
$ss = round(24 * 60 * 60 * $Sunrise);
if ($ss < 10) {
    $ss = "0" . $ss;
}
if ($sm < 10) {
    $sm = "0" . $sm;
}
$h->Sunrise = $sh . ":" . $sm . ":" . $ss;
$Sunset  = ($SolarNoon * 1440 + $h->ha * 4) / 1440;
$h->SunsetRaw = $Sunset;
$sh = floor(24 * $Sunset);
$Sunset -= $sh / 24;
$sm = floor(24 * 60 * $Sunset);
$Sunset -= $sm / (60 * 24);
$ss = round(24 * 60 * 60 * $Sunset);
if ($ss < 10) {
    $ss = "0" . $ss;
}
if ($sm < 10) {
    $sm = "0" . $sm;
}
$h->Sunset = $sh . ":" . $sm . ":" . $ss;

$date = new DateTime('now', setTimezone(new DateTimeZone('America/Los_Angeles'));
$h->epoc = $date->getTimestamp();
$h->epoc +=  $h->timeZone * 3600;
$h->epoc /= 3600 * 24;
$h->dp = $h->epoc - floor($h->epoc);


$date->setTime(0, 0, 0);
$h->dayTimestamp = $date->getTimestamp();
$h->sunriseTimestamp = $h->dayTimestamp + intval(3600 * 24 * $h->SunriseRaw);
$h->sunsetTimestamp = $h->dayTimestamp + intval(3600 * 24 * $h->SunsetRaw);

var_dump($h);

$sql  = "UPDATE `server_sent` SET `sunrise_raw`=" . $h->SunriseRaw .
    ",`sunrise_timestamp`=" . $h->sunriseTimestamp .
    ",`sunrise_text`='" . $h->Sunrise .
    "',`sunset_raw`=" . $h->SunsetRaw .
    ",`sunset_timestamp`=" . $h->sunsetTimestamp .
    ",`sunset_text`='" . $h->Sunset .
    "' WHERE `id`=1";

$db->query($sql);
