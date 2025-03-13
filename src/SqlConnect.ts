import mysql from "mysql2";

export let connection: mysql.Connection | null = null;

export const SqlConnect = () => {
  const sqlEnabled = !(typeof process.env.SQL !== "undefined");
  connection =
    typeof process.env.DATABASE_URL === "string" && sqlEnabled
      ? mysql.createConnection(process.env.DATABASE_URL)
      : null;

  connection?.connect(async function (err) {
    if (err) throw err;
    console.log("MySQL Connected!");
  });
};
