import mysql from "mysql2";
import { getSQLDate } from "./timeConversion";
import { globals } from "./globals";

const getWeekCount = (start: string, stop: string, connection: mysql.Connection) => {
  let startDay = start;
  let stopDay = stop;
  console.log("******** Adding a week hit count from: ", startDay, " to: ", stopDay);
  connection.query(
    `select count(*) AS count from hit_counter where hit > '${startDay} 08:00:00' AND hit < '${stopDay} 08:00:00'`,
    (err, c, fields) =>
      connection.query(
        `select count(DISTINCT IP) AS count from hit_counter where hit > '${startDay} 08:00:00' AND hit < '${stopDay} 08:00:00'`,
        (err, d, fields) => {
          if (Array.isArray(c) && Array.isArray(d))
            connection.query(
              "INSERT INTO hit_counter_week (`day`, total, `unique`) VALUES ('" +
                startDay +
                "', " +
                (c[0] as { count: number }).count +
                ", " +
                (d[0] as { count: number }).count +
                ")"
            );
        }
      )
  );
};

const getDayCount = (start: string, stop: string, connection: mysql.Connection) => {
  let startDay = start;
  let stopDay = stop;
  console.log("******** Adding a day hit count from: ", startDay, " to: ", stopDay);
  connection.query(
    `select count(*) AS count from hit_counter where hit > '${startDay} 08:00:00' AND hit < '${stopDay} 08:00:00'`,
    (err, c, fields) =>
      connection.query(
        `select count(DISTINCT IP) AS count from hit_counter where hit > '${startDay} 08:00:00' AND hit < '${stopDay} 08:00:00'`,
        (err, d, fields) => {
          if (Array.isArray(c) && Array.isArray(d))
            connection.query(
              "INSERT INTO hit_counter_day (`day`, total, `unique`) VALUES ('" +
                startDay +
                "', " +
                (c[0] as { count: number }).count +
                ", " +
                (d[0] as { count: number }).count +
                ")"
            );
        }
      )
  );
};

export const handleHits = async (connection: mysql.Connection) => {
  var dt;
  var retString = "";
  // Check for needed updates on hit_counter_week
  let res = await connection.promise().query(`SELECT MIN(hit) AS startDate FROM hit_counter WHERE 1`);
  const startDate = Array.isArray(res) && Array.isArray(res[0]) ? (res[0][0] as { startDate: number }).startDate : 0;

  res = await connection.promise().query(`SELECT MAX(hit) AS endDate FROM hit_counter WHERE 1`);
  const endDate = Array.isArray(res) && Array.isArray(res[0]) ? (res[0][0] as { endDate: number }).endDate : 0;
  let lastEntry = new Date(endDate);

  res = await connection.promise().query(`SELECT MAX(day) AS maxDate FROM hit_counter_week WHERE 1`);
  dt = new Date();
  if (Array.isArray(res) && Array.isArray(res[0])) {
    dt = new Date((res[0][0] as { maxDate: number }).maxDate);
    dt.setDate(dt.getDate() + 7);
  } else {
    console.log("weeks table is empty");
    dt = new Date(startDate);
  }

  let startDay = getSQLDate(dt);
  dt.setDate(dt.getDate() + 7);
  let stopDay = getSQLDate(dt);

  retString += "**** WEEK ***** </br>";
  retString += "start day " + startDay + "</br>";
  retString += "stop day " + stopDay + "</br>";
  retString += "dt         : " + dt + "</br>";
  retString += "last Entry : " + lastEntry + "</br>";
  while (dt < lastEntry) {
    getWeekCount(startDay, stopDay, connection);
    startDay = stopDay;
    dt.setDate(dt.getDate() + 7);
    stopDay = getSQLDate(dt);
  }

  // Check for needed updates on hit_counter_day
  res = await connection.promise().query(`SELECT MAX(day) AS maxDate FROM hit_counter_day WHERE 1`);
  if (Array.isArray(res) && Array.isArray(res[0])) {
    dt = new Date((res[0][0] as { maxDate: number }).maxDate);
    dt.setDate(dt.getDate() + 1);
  } else {
    console.log("weeks table is empty");
    dt = new Date(startDate);
  }
  startDay = getSQLDate(dt);
  dt.setDate(dt.getDate() + 1);
  stopDay = getSQLDate(dt);

  retString += "***** DAY ***** </br>";
  retString += "start day " + startDay + "</br>";
  retString += "stop day " + stopDay + "</br>";
  retString += "dt         : " + dt + "</br>";
  retString += "last Entry : " + lastEntry + "</br>";
  while (dt < lastEntry) {
    getDayCount(startDay, stopDay, connection);
    startDay = stopDay;
    dt.setDate(dt.getDate() + 1);
    stopDay = getSQLDate(dt);
  }

  //update hit_stats in miscellaneous
  let t = {} as HitStats;
  res = await connection.promise().query("SELECT * FROM miscellaneous WHERE id='hit_stats'");
  if (Array.isArray(res) && Array.isArray(res[0])) {
    t = JSON.parse((res[0][0] as MiscellaneousTable).data) as HitStats;
  } else {
    t = {
      lastReset: 0,
      total: { count: 0, date: "", unique: 0 },
      weeks: { start: 0, totals: [], uniques: [] },
      week: { day: "", total: 0, unique: 0 },
      month: { total: 0, unique: 0 },
      day: { day: "", total: 0, unique: 0 },
    };
  }

  const row = await connection.promise().query(`select count(*) AS count from hit_counter where 1`);
  let count = 0;
  if (Array.isArray(row) && Array.isArray(row[0])) {
    t.total.count = (row[0][0] as { count: number }).count;
  }
  const latest = await connection.promise().query(`SELECT MAX(hit) AS latest FROM hit_counter WHERE 1`);
  if (Array.isArray(latest) && Array.isArray(latest[0])) {
    dt = (latest[0][0] as { latest: Date }).latest;
    dt.setTime(dt.getTime() + 2 * globals.offset);
    t.total.count = count;
    t.total.date = dt
      .toISOString()
      .replace("T", " ")
      .replace(/\.[0-9]*Z/, "");
  }

  let wks;
  if (t.week.day === "") wks = await connection.promise().query(`SELECT * FROM hit_counter_week WHERE 1`);
  else wks = await connection.promise().query(`SELECT * FROM hit_counter_week WHERE day > ${t.week.day}`);
  if (Array.isArray(wks) && Array.isArray(wks[0])) {
    //there are new weeks
    (wks[0] as HitTable[]).forEach((v, i) => {
      t.weeks.totals.push(v.total);
      t.weeks.uniques.push(v.unique);
      t.total.unique += v.unique;
    });
    const w = wks[0][wks[0].length - 1] as HitTable;
    t.week.day = getSQLDate(w.day);
    t.week.total = w.total;
    t.week.unique = w.unique;
  }

  const m = await connection.promise().query(`SELECT * FROM hit_counter_week WHERE 1 LIMIT 4`);
  if (Array.isArray(m) && Array.isArray(m[0])) {
    t.month.total = 0;
    t.month.unique = 0;
    (m[0] as HitTable[]).forEach((v, i) => {
      t.month.unique += v.unique;
      t.month.total += v.total;
    });
  }

  const y = await connection.promise().query(`SELECT * FROM hit_counter_day ORDER BY day DESC LIMIT 1`);
  if (Array.isArray(y) && Array.isArray(y[0])) {
    const x = y[0][0] as HitTable;
    t.day = {
      day: getSQLDate(x.day),
      total: x.total,
      unique: x.unique,
    };
  }
  await connection.promise().query(`REPLACE into miscellaneous(id, data) VALUES('hit_stats', '${JSON.stringify(t)}')`);

  retString += "</br>***** DB ***** </br>";
  retString += "Day start           : " + t.day.day + "</br>";
  retString += "Week start          : " + t.week.day + "</br>";
  retString += "totals plot length  : " + t.weeks.totals.length + "</br>";
  retString += "uniques plot length : " + t.weeks.uniques.length + "</br>";
  retString += "last totaled        : " + t.total.date + "</br>";

  return retString;
};
