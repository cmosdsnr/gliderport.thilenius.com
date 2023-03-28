import mysql from "mysql2";
import { timestampToString } from "./timeConversion";
import { globals } from "./globals";
import { sendTextMessage } from "./sendTextMessage";
import { auth, db } from "./firebase.js";
import { onSnapshot, doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where } from "firebase/firestore";
import SunCalc from "suncalc";

export default class AddData {
  sunset: number;
  sunrise: number;
  tsLast: number;
  tsNow: number;
  connection: mysql.Connection;

  constructor(conn: mysql.Connection | null) {
    this.sunset = 0;
    this.sunrise = 0;
    this.tsLast = 0;
    this.tsNow = 0;
    if (conn) this.connection = conn;
    else this.connection = mysql.createConnection("");
  }

  #c = {
    IT_IS_DARK: 0,
    SLED_RIDE_BAD_ANGLE: 1,
    SLED_RIDE_POOR_ANGLE: 2,
    SLED_RIDE: 3,
    BAD_ANGLE: 4,
    POOR_ANGLE: 5,
    GOOD: 6,
    EXCELLENT: 7,
    SPEED_BAR: 8,
    TOO_WINDY: 9,
    NO_DATA: 10,
  };

  #codesMeaning = [
    "it is dark",
    "sled ride, bad angle",
    "sled ride, poor angle",
    "sled ride",
    "bad angle",
    "poor angle",
    "good",
    "excellent",
    "speed bar",
    "too windy",
    "no data",
  ];

  #getCode(speed: number, direction: number, isItDark: boolean = false): number {
    const c = this.#c;
    if (isItDark) {
      return c.IT_IS_DARK;
    } else {
      if (speed < 60) {
        if (direction > 310 || direction < 230) {
          return c.SLED_RIDE_BAD_ANGLE;
        } else if (direction > 302 || direction < 236) {
          return c.SLED_RIDE_POOR_ANGLE;
        } else {
          return c.SLED_RIDE;
        }
      } else if (speed < 210) {
        if (direction > 310 || direction < 230) {
          return c.BAD_ANGLE;
        } else if (direction > 302 || direction < 236) {
          return c.POOR_ANGLE;
        } else {
          if (speed <= 110) {
            return c.GOOD;
          } else if (speed < 150) {
            return c.EXCELLENT;
          } else {
            return c.SPEED_BAR;
          }
        }
      } else {
        return c.TOO_WINDY;
      }
    }
  }

  setLastRecord = () => {
    this.connection.query("SELECT * FROM gliderport ORDER BY recorded DESC LIMIT 1", (err, results, fields) => {
      if (Array.isArray(results) && results.length > 0) {
        let ts = Math.floor((new Date((results[0] as GliderportTable).recorded).getTime() + globals.offset) / 1000);
        globals.lastRecord = ts > 0 ? timestampToString(ts) : "0";
      } else globals.lastRecord = "0";
    });
  };

  #createNewDay = (ts: number): CodeHistoryData => {
    //make sure the local time is in the next day (sub globals.offset)
    const y = new Date(ts * 1000 - globals.offset);
    // La Jola lat/long
    const lat = 32.89;
    const long = -117.25;
    const sunData = SunCalc.getTimes(y, lat, long);
    const sunrise = Math.floor(sunData.sunrise.getTime() / 1000);
    const sunset = Math.floor(sunData.sunrise.getTime() / 1000);
    // const sunData = calculateSunrise(y)
    // console.log(`   DEBUG: y:${y.getTime() / 1000} r.date: ${r.date} sunrise: ${sunData.sunriseTimestamp}`)
    let r: CodeHistoryData = {
      date: ts,
      data: {
        codes: [],
        sun: [sunrise - ts + globals.offset / 1000, sunset - ts + globals.offset / 1000],
        limits: [sunData.sunrise.getHours() - 1, Math.floor(24 * sunData.sunset.getHours()) + 2],
      },
    };
    return r;
  };

  #fetchServerSentData = async () => {
    //fetch sunset, sunrise, tsLast info for this post
    let sql = "SELECT * FROM `server_sent` WHERE `id`=1";
    let results = await this.connection.promise().query(sql);
    let sunset = 0,
      sunrise = 0,
      tsLast = 0;

    if (Array.isArray(results) && Array.isArray(results[0])) {
      const r = results[0][0] as ServerSentTable;
      r.sunData = JSON.parse(r.sun as string);
      sunset = r.sunData ? r.sunData.sunset : 0;
      sunrise = r.sunData ? r.sunData.sunrise : 0;
      tsLast = r.last_forecast;
    }

    globals.debugInfo.tsLastPre = tsLast;
    // align tsLast (want to call forecast a few min after the hour)
    const secondsIntoHour = tsLast % (60 * 60);
    if (secondsIntoHour > 5 * 60) tsLast -= secondsIntoHour - 150;
    globals.debugInfo.tsLast = tsLast;

    return { sunset, sunrise, tsLast };
  };

  #insertData = async (data: string) => {
    const d: [string, number, number, number, number, number][] = JSON.parse(data);
    let sql = "INSERT INTO gliderport (recorded, speed, direction, humidity, pressure, temperature ) VALUES ";
    let e = ",";
    globals.firstRecord = d[0][0];
    globals.numberRecords = d.length;
    globals.debugInfo.numberRecords = globals.numberRecords;
    d.forEach((v, i) => {
      if (i === d.length - 1) e = "";
      sql += '( "' + v[0] + '", ' + v[1] + ", " + v[2] + ", " + v[3] + ", " + v[4] + ", " + v[5] + ")" + e;
    });
    await this.connection.promise().query(sql);
    // console.table(d);
    this.setLastRecord();
    globals.tdLast = new Date();
    const last = d[d.length - 1];
    const ts = Math.floor(new Date(last[0]).getTime() / 1000);
    sql =
      "UPDATE `server_sent` SET `last_record`=" +
      ts +
      ", `speed` = " +
      last[1] +
      ", `direction` = " +
      last[2] +
      ", `humidity` = " +
      last[3] +
      ", `pressure` = " +
      last[4] +
      ", `temperature` = " +
      last[5] +
      " WHERE `id`=1";
    this.connection.query(sql, (err, results, fields) => {});
  };

  #checkForTexts = async () => {
    //check for texts that need sending
    const fifteenMin = this.tsNow - 15 * 60;
    const oneMin = this.tsNow - 1 * 60;
    const fiveMin = this.tsNow - 5 * 60;
    //   console.log("checkForTexts: " + timestampToString(fifteenMin + globals.offset / 1000));
    let sql =
      "SELECT * FROM `gliderport` WHERE recorded > '" + timestampToString(fifteenMin + globals.offset / 1000) + "'";
    let res = await this.connection.promise().query(sql);
    //   console.log("res: " + res[0].length);
    //   console.log("sql: " + sql);
    let aSpeed = 0,
      bSpeed = 0,
      cSpeed = 0;
    let aDir = 0,
      bDir = 0,
      cDir = 0;
    let aCnt = 0,
      bCnt = 0,
      cCnt = 0;
    if (Array.isArray(res) && Array.isArray(res[0]))
      (res[0] as GliderportTable[]).forEach((e) => {
        aDir += e.direction;
        aSpeed += e.speed;
        aCnt += 1;
        const ts = Math.floor(new Date(e.recorded).getTime() / 1000);
        //   console.log("ts: " + ts, fiveMin);
        if (ts >= fiveMin) {
          bDir += e.direction;
          bSpeed += e.speed;
          bCnt += 1;
        }
        if (ts >= oneMin) {
          cDir += e.direction;
          cSpeed += e.speed;
          cCnt += 1;
        }
      });
    aDir /= aCnt > 0 ? aCnt : 1;
    aSpeed /= aCnt > 0 ? aCnt : 100000;
    bDir /= bCnt > 0 ? bCnt : 1;
    bSpeed /= bCnt > 0 ? bCnt : 1;
    cDir /= cCnt > 0 ? cCnt : 1;
    cSpeed /= cCnt > 0 ? cCnt : 1;
    aDir = Math.round(aDir);
    bDir = Math.round(bDir);
    cDir = Math.round(cDir);
    aSpeed = Math.round(aSpeed) / 10;
    bSpeed = Math.round(bSpeed) / 10;
    cSpeed = Math.round(cSpeed) / 10;

    //   console.log("Speeds: ", aSpeed, ", ", bSpeed, ", ", cSpeed, "  Dir: ", aDir, ", ", bDir, ", ", cDir);

    Object.keys(globals.textWatch).forEach(async (v, i) => {
      const d = globals.textWatch[v];
      if (d.text.sent != true) {
        //   console.log("not yet sent to", d.email, " ", d.text.speed);
        if (d.text.duration === 0 && cSpeed >= d.text.speed && Math.abs(270 - cDir) <= d.text.errorAngle) {
          sendTextMessage(d.text.address, d.firstName, {
            speed: cSpeed,
            direction: cDir,
            duration: "1",
          });
          d.text.sent = true;
        }
        if (d.text.duration === 1 && bSpeed >= d.text.speed && Math.abs(270 - bDir) <= d.text.errorAngle) {
          sendTextMessage(d.text.address, d.firstName, {
            speed: bSpeed,
            direction: bDir,
            duration: "5",
          });
          d.text.sent = true;
        }
        if (d.text.duration === 2 && aSpeed >= d.text.speed && Math.abs(270 - aDir) <= d.text.errorAngle) {
          sendTextMessage(d.text.address, d.firstName, {
            speed: aSpeed,
            direction: aDir,
            duration: "15",
          });
          d.text.sent = true;
        }
        if (d.text.sent === true) {
          // console.log("sending text to ", d.email)
          await setDoc(doc(db, "users", v), d);
        }
      } else {
        // console.log("already sent to", v, " => ", d)
      }
    });
  };

  updateHoursTable = async (forceRegeneration = false) => {
    //let's work on hours Db
    const dtd = (Date.now() + globals.offset) / 1000; //+ 60 * tdLast.getTimezoneOffset()
    const thisHour = 3600 * Math.floor(dtd / 3600);
    const twoDaysAgo = thisHour - 48 * 3600;

    // delete older records
    await this.connection.promise().query(`DELETE FROM hours WHERE start < ${twoDaysAgo}`);
    await this.connection.promise().query(`DELETE FROM hours WHERE start > ${thisHour}`);

    let hourLength = 0;
    if (!forceRegeneration) {
      // get latest record (or 2 days ago if there are none)
      const sql = `SELECT * FROM hours WHERE start > ${twoDaysAgo} ORDER BY start DESC LIMIT 1`;
      const results = await this.connection.promise().query(sql);
      globals.latestHours = twoDaysAgo;
      if (Array.isArray(results) && Array.isArray(results[0]) && results[0].length > 0) {
        const d = JSON.parse((results[0][0] as HoursTable).data);
        globals.latestHours = d.start;
        hourLength = d.date.length;
      }
    }
    // console.log(results[0].data)
    globals.debugInfo.hourLength = hourLength;
    globals.debugInfo.latestHours = globals.latestHours;
    globals.debugInfo.hours = [];
    // for each hour starting at 'globals.latestHour', thru 'thisHour'
    for (let i = globals.latestHours; i <= thisHour; i += 3600) {
      let hourInfo: DebugInfoHours = {
        ts: i,
        resultsFound: 0,
        l: 0,
      };
      const data: DataType = {
        start: i,
        date: [],
        speed: [],
        direction: [],
        humidity: [],
        pressure: [],
        temperature: [],
      };
      // msg += "pull from gliderport: records from " + timestampToString(i) + " to " + timestampToString(i + 3600) + "\n"
      let sql =
        "SELECT * FROM gliderport WHERE recorded >= '" +
        timestampToString(i) +
        "' AND recorded < '" +
        timestampToString(i + 3600) +
        "'";
      const results = await this.connection.promise().query(sql);

      if (Array.isArray(results) && Array.isArray(results[0]) && results[0].length > 0) {
        hourInfo.resultsFound = (results[0] as any[]).length;
        (results[0] as any[]).forEach((v, j) => {
          data.date.push((new Date(v.recorded).getTime() + globals.offset) / 1000 - i);
          data.speed.push(v.speed);
          data.direction.push(v.direction);
          data.humidity.push(v.humidity);
          data.pressure.push(v.pressure);
          data.temperature.push(v.temperature);
        });
      } else {
        hourInfo.resultsFound = 0;
        // msg += "found none\n"
      }
      hourInfo.l = data.date.length;
      // console.log("   latest hour in hours table starts at ", globals.latestHours, " had ",
      //     hourLength, " rows and now has ", data.date.length, " rows")
      // msg += "replacing " + data.start + " with " + data.date.length + " records\n"
      sql = "REPLACE into hours (`start`, `data`) value(" + data.start + ",'" + JSON.stringify(data) + "')";
      this.connection.query(sql, (err, results, fields) => {});
      globals.debugInfo.hours.push(hourInfo);
    }
  };

  #updateForecast = async () => {
    // console.log("Attempting to update forecast since last was ", tsLast, " and now is ",  this.tsNow)
    // https://api.openweathermap.org/data/2.5/onecall?lat=32.8473&lon=-117.2742&exclude=minutely,daily&units=imperial&appid=483c6b4301f7069cbf4e266bffa6d5ff

    const url =
      "https://api.openweathermap.org/data/2.5/onecall" +
      "?lat=32.8473&lon=-117.2742" +
      "&exclude=minutely,daily" +
      "&units=imperial" +
      "&appid=483c6b4301f7069cbf4e266bffa6d5ff";
    fetch(url)
      .then((response) => response.json())
      .then((responseJson) => {
        if (!responseJson || !responseJson.hourly) {
          // msg += "OpenWeather Data Offline\n"
          console.log("OpenWeather Data Offline");
        } else {
          let forecast: [number, number][] = [];
          let todaysCodes: [number, string][] = [];
          let lastCode = -1;
          globals.debugInfo.openWeather.hours = responseJson.hourly.length;
          globals.debugInfo.openWeather.start = responseJson.hourly[0].dt;
          globals.debugInfo.openWeather.stop = responseJson.hourly[responseJson.hourly.length - 1].dt;
          // console.log(`found ${responseJson.hourly.length} hours in forecast, starting at ${timestampToString(responseJson.hourly[0].dt + globals.offset / 1000)} ending ${timestampToString(responseJson.hourly[responseJson.hourly.length - 1].dt + globals.offset / 1000)}`)
          // console.log(`${responseJson.hourly[0].dt} to ${responseJson.hourly[responseJson.hourly.length - 1].dt}`)
          (responseJson.hourly as OpenWeatherReport[]).forEach((v, i) => {
            if (v.dt > this.tsNow) {
              const code = this.#getCode(v.wind_speed * 10, v.wind_deg);
              forecast.push([v.dt, code]);
              //   console.log("forecast: ", v.dt, ", ", this.sunset);
              if (lastCode != code && v.dt < this.sunset) {
                lastCode = code;
                todaysCodes.push([new Date(1000 * v.dt).getHours(), this.#codesMeaning[code]]);
              }
            }
          });
          // last_forecast will be teh next tsLast
          this.connection.query(
            "UPDATE `server_sent` SET `last_forecast`=" + this.tsNow + " WHERE `id`=1",
            (err, results, fields) => {}
          );
          this.connection.query(
            "UPDATE `miscellaneous` SET `data`='" + JSON.stringify(forecast) + "' WHERE `id`='forecast'"
          );
          const h: OpenWeatherReport[] = responseJson.hourly;
          h.forEach((v, i) => {
            if (v.weather) {
              h[i].weather_id = v.weather[0].id;
              h[i].weather_main = v.weather[0].main;
              h[i].weather_description = v.weather[0].description;
              h[i].weather_icon = v.weather[0].icon;
              delete h[i].weather;
            }
          });
          this.connection.query(
            "UPDATE `miscellaneous` SET `data`='" + JSON.stringify(h) + "' WHERE `id`='forecast_full'"
          );
          this.connection.query(
            "UPDATE `miscellaneous` SET `data`='" + JSON.stringify(todaysCodes) + "' WHERE `id`='todays_codes'"
          );
        }
      });
  };

  #updateCodeHistory = async () => {
    // get the last timestamp from code_history
    let r: any;
    let sql = "SELECT * FROM code_history ORDER BY date DESC LIMIT 1";
    let results = await this.connection.promise().query(sql);
    if (Array.isArray(results) && Array.isArray(results[0]) && results[0].length > 0) {
      let d = results[0][0] as { date: number; data: string };
      const dt = 24 * 3600 * Math.floor(d.date / (24 * 3600));
      r = { date: dt, data: JSON.parse(d.data) as CodeHistoryData };
      // if it exists it will have at least two points, sunrise and sunset
      // pop off sunset (it's always add to the end of a day)
      r.data.codes.pop();
    } else {
      // if it doesn't exist, create it
      r = this.#createNewDay(24 * 3600 * Math.floor(this.tsNow / (24 * 3600)));
      console.log("code_history table is empty, creating it");
    }
    // at least sunrise should still be in the array
    let tsLast = r.date + 3600 * r.data.limits[0];
    let lc = 0;
    if (r.data.codes.length === 0) {
      console.log("   ERROR: Found a zero length codes on ", timestampToString(r.date));
    } else {
      tsLast += r.data.codes[r.data.codes.length - 1][0];
      lc = r.data.codes[r.data.codes.length - 1][1];
    }

    globals.debugInfo.codeHistory = {
      length: r.data.codes.length,
      date: r.date,
      tsLast,
      code: lc,
      gpResults: 0,
      days: [],
    };

    sql = "SELECT * FROM gliderport WHERE recorded > '" + timestampToString(tsLast) + "'";
    results = await this.connection.promise().query(sql);

    if (Array.isArray(results) && Array.isArray(results[0])) {
      globals.debugInfo.codeHistory.gpResults = results.length;
      // console.log("   Since the last record in code_history at ", timestampToString(tsLast), " with code ",
      //     lc, ", there are ", results.length, " new data points in gliderport")
      let c = 0;
      let lastTs = tsLast + 120; // 2 min after last
      let res = results[0] as {
        recorded: string;
        speed: number;
        direction: number;
      }[];
      res.forEach((v, i) => {
        c++;
        const ts = Math.round((new Date(v.recorded).getTime() + globals.offset) / 1000);
        // if (i % 1000 === 0) console.log(`   DEBUG: ${ts} : ${r.date + r.data.sun[0]} : ${r.date + r.data.sun[1]}`)
        if (ts > r.date + r.data.sun[0]) {
          // after sunrise
          // if r.data.codes is empty then add sunrise point
          if (r.data.codes.length === 0) {
            if (i > 0) lc = this.#getCode(res[i - 1].speed, res[i - 1].direction);
            else lc = this.#getCode(v.speed, v.direction);
            r.data.codes.push([r.data.sun[0] - 3600 * r.data.limits[0], lc]);
          }

          if (ts < r.date + r.data.sun[1]) {
            //before sunset
            // check code for change
            const c = this.#getCode(v.speed, v.direction);
            // make a code last at least 5min (300s)
            if (c != lc && ts - lastTs > 120) {
              lc = c;
              // add to r.data.codes code_history[ts, code]
              r.data.codes.push([ts - 3600 * r.data.limits[0] - r.date, lc]);
              lastTs = ts;
            }
          }
          // if it's after sunset OR it's the last data point AND there is stuff to save
          if ((i === res.length - 1 && r.data.codes.length > 0) || ts >= r.date + r.data.sun[1]) {
            // add sunset point
            r.data.codes.push([r.data.sun[1] - 3600 * r.data.limits[0], 0]);
            // anything we save should now have at least sunrise AND sunset points (2)
            // save this day in code_history
            sql =
              "INSERT INTO `code_history` SET date=" +
              r.date +
              ", data='" +
              JSON.stringify(r.data) +
              "' ON DUPLICATE KEY UPDATE data ='" +
              JSON.stringify(r.data) +
              "'";
            this.connection.query(sql, () => {});
            // console.log(`   DEBUG: saving ${JSON.stringify(r)} `)
            globals.debugInfo.codeHistory.days.push({
              length: r.data.codes.length,
              date: r.date,
              c,
            });
            c = 0;
            // create a new day
            r = this.#createNewDay(r.date + 24 * 3600);
          }
        }
      });
    }
    sql =
      "INSERT INTO `miscellaneous` SET `id`='debug_info', data='" +
      JSON.stringify(globals.debugInfo) +
      "' ON DUPLICATE KEY UPDATE data ='" +
      JSON.stringify(globals.debugInfo) +
      "';";
    await this.connection.promise().query(sql);
  };

  updateCodeHistoryNew = async () => {
    // get the last timestamp from code_history
    let r: any;
    let sql = "SELECT * FROM code_history ORDER BY date DESC LIMIT 1";
    let results = await this.connection.promise().query(sql);
    if (Array.isArray(results) && Array.isArray(results[0]) && results[0].length > 0) {
      let d = results[0][0] as { date: number; data: string };
      const dt = 24 * 3600 * Math.floor(d.date / (24 * 3600));
      r = { date: dt, data: JSON.parse(d.data) as CodeHistoryData };
      // if it exists it will have at least two points, sunrise and sunset
      // pop off sunset (it's always add to the end of a day)
      r.data.codes.pop();
    } else {
      // if table is empty, create it
      r = this.#createNewDay(24 * 3600 * Math.floor(this.tsNow / (24 * 3600)));
      console.log("code_history table is empty, creating it");
    }
    console.table(r);
    // at least sunrise should still be in the array
    let tsLast = r.date + 3600 * r.data.limits[0];
    let lc = 0;
    if (r.data.codes.length === 0) {
      console.log("   ERROR: Found a zero length codes on ", timestampToString(r.date));
    } else {
      tsLast += r.data.codes[r.data.codes.length - 1][0];
      lc = r.data.codes[r.data.codes.length - 1][1];
    }

    globals.debugInfo.codeHistory = {
      length: r.data.codes.length,
      date: r.date,
      tsLast,
      code: lc,
      gpResults: 0,
      days: [],
    };

    sql = "SELECT * FROM gliderport WHERE recorded > '" + timestampToString(tsLast) + "'";
    results = await this.connection.promise().query(sql);

    if (Array.isArray(results) && Array.isArray(results[0])) {
      console.log(results[0].length);
      console.log(results[0][0].recorded);
      console.log(results[0][results[0].length - 1].recorded);
      //DELETE FROM `code_history` WHERE date >= 1675209600;

      globals.debugInfo.codeHistory.gpResults = results.length;
      // console.log("   Since the last record in code_history at ", timestampToString(tsLast), " with code ",
      //     lc, ", there are ", results.length, " new data points in gliderport")
      let c = 0;
      let lastTs = tsLast + 120; // 2 min after last
      let res = results[0] as {
        recorded: string;
        speed: number;
        direction: number;
      }[];
      res.forEach((v, i) => {
        c++;
        const ts = Math.round((new Date(v.recorded).getTime() + globals.offset) / 1000);
        // if (i % 1000 === 0) console.log(`   DEBUG: ${ts} : ${r.date + r.data.sun[0]} : ${r.date + r.data.sun[1]}`)
        if (ts > r.date + r.data.sun[0]) {
          // after sunrise
          // if r.data.codes is empty then add sunrise point
          if (r.data.codes.length === 0) {
            if (i > 0) lc = this.#getCode(res[i - 1].speed, res[i - 1].direction);
            else lc = this.#getCode(v.speed, v.direction);
            r.data.codes.push([r.data.sun[0] - 3600 * r.data.limits[0], lc]);
          }

          if (ts < r.date + r.data.sun[1]) {
            //before sunset
            // check code for change
            const c = this.#getCode(v.speed, v.direction);
            // make a code last at least 5min (300s)
            if (c != lc && ts - lastTs > 120) {
              lc = c;
              // add to r.data.codes code_history[ts, code]
              r.data.codes.push([ts - 3600 * r.data.limits[0] - r.date, lc]);
              lastTs = ts;
            }
          }
          // if it's after sunset OR it's the last data point AND there is stuff to save
          if ((i === res.length - 1 && r.data.codes.length > 0) || ts >= r.date + r.data.sun[1]) {
            // add sunset point
            r.data.codes.push([r.data.sun[1] - 3600 * r.data.limits[0], 0]);
            // anything we save should now have at least sunrise AND sunset points (2)
            // save this day in code_history
            sql =
              "INSERT INTO `code_history` SET date=" +
              r.date +
              ", data='" +
              JSON.stringify(r.data) +
              "' ON DUPLICATE KEY UPDATE data ='" +
              JSON.stringify(r.data) +
              "'";
            this.connection.query(sql, () => {});
            // console.log(`   DEBUG: saving ${JSON.stringify(r)} `)
            globals.debugInfo.codeHistory.days.push({
              length: r.data.codes.length,
              date: r.date,
              c,
            });
            c = 0;
            // create a new day
            r = this.#createNewDay(r.date + 24 * 3600);
          }
        }
      });
    }
    sql =
      "INSERT INTO `miscellaneous` SET `id`='debug_info', data='" +
      JSON.stringify(globals.debugInfo) +
      "' ON DUPLICATE KEY UPDATE data ='" +
      JSON.stringify(globals.debugInfo) +
      "';";
    await this.connection.promise().query(sql);
  };

  add = async (req: Request) => {
    //fetch sunset, sunrise, tsLast info for this post
    let { sunset, sunrise, tsLast } = await this.#fetchServerSentData();
    this.sunset = sunset;
    this.sunrise = sunrise;
    this.tsLast = tsLast;

    this.tsNow = Math.floor(Date.now() / 1000);
    globals.debugInfo.now = this.tsNow;

    //add data if it was present
    if (req && "d" in req) {
      await this.#insertData(req.d as string);
      if (this.tsNow > 3600 + sunrise && this.tsNow < sunset - 3600) this.#checkForTexts();
      this.updateHoursTable();
    } else console.log("   addData called with no data");

    // if it's been more than one hours, update the forecast
    // console.log("   tsNow: ", this.tsNow, " tsLast: ", tsLast);
    if (this.tsNow > tsLast + 1 * 60 * 60) this.#updateForecast();

    //this.#updateCodeHistory();
  };
}
