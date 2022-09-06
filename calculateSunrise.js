function radians(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
}

function degrees(radians) {
    var pi = Math.PI;
    return radians * (180 / pi);
}

const toString = (fractionOfDay) => {
    let sh, sm, ss, tmp = fractionOfDay
    sh = Math.floor(24 * tmp)
    tmp -= sh / 24
    sm = Math.floor(24 * 60 * tmp)
    tmp -= sm / (60 * 24)
    ss = Math.round(24 * 60 * 60 * tmp)
    if (ss < 10) ss = "0" + ss
    if (sm < 10) sm = "0" + sm
    return (sh + ":" + sm + ":" + ss)
}

export default function calculateSunrise(date) {
    const d = { latitude: 32.89, longitude: -117.25 }
    d.timeZone = -date.getTimezoneOffset() / 60;
    date.setHours(12, 0, 0)
    d.noon = date.getTime() / 1000
    d.julianDay = Math.floor(d.noon / 86400) - d.timeZone / 24 + 2440588;

    d.julianCentury = (d.julianDay - 2451545) / 36525;
    d.geomMeanLongSun = (280.46646 + d.julianCentury * (36000.76983 + d.julianCentury * 0.0003032)) % 360;
    d.geomMeanAnomSun = 357.52911 + d.julianCentury * (35999.05029 - 0.0001537 * d.julianCentury);
    d.EccentEarthOrbit = 0.016708634 - d.julianCentury * (0.000042037 + 0.0000001267 * d.julianCentury);
    d.SunEqofCtr =
        Math.sin(radians(d.geomMeanAnomSun)) * (1.914602 - d.julianCentury * (0.004817 + 0.000014 * d.julianCentury)) +
        Math.sin(radians(2 * d.geomMeanAnomSun)) * (0.019993 - 0.000101 * d.julianCentury) +
        Math.sin(radians(3 * d.geomMeanAnomSun)) * 0.000289;
    d.SunTrueLong = d.geomMeanLongSun + d.SunEqofCtr;
    d.SunAppLong = d.SunTrueLong - 0.00569 - 0.00478 * Math.sin(radians(125.04 - 1934.136 * d.julianCentury));
    d.MeanObliqEcliptic = 23 + (26 + ((21.448 - d.julianCentury * (46.815 + d.julianCentury * (0.00059 - d.julianCentury * 0.001813)))) / 60) / 60;
    d.ObliqCorr = d.MeanObliqEcliptic + 0.00256 * Math.cos(radians(125.04 - 1934.136 * d.julianCentury));
    d.SunDeclin = degrees(Math.asin(Math.sin(radians(d.ObliqCorr)) * Math.sin(radians(d.SunAppLong))));
    d.ha = degrees(
        Math.acos(
            Math.cos(radians(90.833)) /
            (Math.cos(radians(d.latitude)) * Math.cos(radians(d.SunDeclin))) -
            Math.tan(radians(d.latitude)) * Math.tan(radians(d.SunDeclin))));
    d.VarY = Math.tan(radians(d.ObliqCorr / 2)) * Math.tan(radians(d.ObliqCorr / 2));
    d.EqOfTime = 4 * degrees(d.VarY * Math.sin(2 * radians(d.geomMeanLongSun)) -
        2 * d.EccentEarthOrbit * Math.sin(radians(d.geomMeanAnomSun)) +
        4 * d.EccentEarthOrbit * d.VarY * Math.sin(radians(d.geomMeanAnomSun)) * Math.cos(2 * radians(d.geomMeanLongSun)) -
        0.5 * d.VarY * d.VarY * Math.sin(4 * radians(d.geomMeanLongSun)) -
        1.25 * d.EccentEarthOrbit * d.EccentEarthOrbit * Math.sin(2 * radians(d.geomMeanAnomSun)));
    d.SolarNoon = (720 - 4 * d.longitude - d.EqOfTime + d.timeZone * 60) / 1440;

    let tmp, sh, sm, ss
    d.sunrise = (d.SolarNoon * 1440 - d.ha * 4) / 1440;
    d.sunset = (d.SolarNoon * 1440 + d.ha * 4) / 1440;
    d.sunriseText = toString(d.sunrise)
    d.sunsetText = toString(d.sunset)

    d.sunriseTime = new Date()
    d.sunriseTime.setHours(0, 0, 0)
    d.sunriseTime.setTime(d.sunriseTime.getTime() + 1000 * 3600 * 24 * d.sunrise)
    d.sunsetTime = new Date()
    d.sunsetTime.setHours(0, 0, 0)
    d.sunsetTime.setTime(d.sunsetTime.getTime() + 1000 * 3600 * 24 * d.sunset)

    d.sunriseTimestamp = parseInt(d.sunriseTime.getTime() / 1000)
    d.sunsetTimestamp = parseInt(d.sunsetTime.getTime() / 1000)
    return (d)
}

