import fs from "fs";
import { isDirectory } from "./fileOps.js";

const logsDir = isDirectory("/app/gliderport/logs") ? "/app/gliderport/logs/" : "/public/logs/";
let __logFile = logsDir + `gpUpdate.log`;

export const log = (...args: any[]) => {
  const d = new Date();
  const date = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  // buffer with leading 0 if needed
  const time = `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}:${d
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
  // make the first argument 20 chars long by padding the end with spaces
  args[0] += ":";
  args[0] = args[0].toString().padEnd(17, " ");
  const message = args.join(" "); // Join all arguments into a single string
  fs.appendFileSync(__logFile, `${date} ${time} ${message}\n`);
};
