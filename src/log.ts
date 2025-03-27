import fs from "fs";
import cron from "node-cron";

/**
 * Checks whether the specified file system path is a directory.
 *
 * @param {string} path - The path to check.
 * @returns {boolean} True if the path is a directory; otherwise, false.
 */
export function isDirectory(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory();
  } catch (err) {
    // If an error occurs (e.g., the path does not exist), return false.
    return false;
  }
}

// Determine the logs directory based on the existence of the "/app/gliderport/logs" folder.
const logsDir = isDirectory("/home/pi/logs/")
  ? "/home/pi/logs"
  : "/Git/web/buddStServer/thilenius.com/gliderport/gp_pi3_server/";
// Define the log file path.
let __logFile = logsDir + `gp_pi3_server.log`;

/**
 * Logs a message to a file.
 *
 * Prepends the message with the current date and time in the format MM-DD-YYYY HH:mm:ss.
 * The first argument is padded to a fixed width for alignment.
 *
 * @param {...any} args - The message components to log. The first element is used as a label.
 */
export const log = (...args: any[]) => {
  const d = new Date();
  const date = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  // Format the current time with leading zeros.
  const time = `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}:${d
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;
  // Append a colon to the first argument and pad it to 17 characters.
  args[0] += ":";
  args[0] = args[0].toString().padEnd(17, " ");
  // Join all arguments into a single string.
  const message = args.join(" ");
  // Append the formatted log entry to the log file.
  fs.appendFileSync(__logFile, `${date} ${time} ${message}\n`);
  //   console.log(`${date} ${time} ${message}`);
};

const max = 5000;
const limitLogLineNumbers = () => {
  const data = fs.readFileSync(__logFile, "utf8");
  const lines = data.split("\n");
  if (lines.length > max) {
    const newLines = lines.slice(lines.length - max).join("\n");
    fs.writeFileSync(__logFile, newLines);
  }
};

// Schedule the resetTextUsers job to run at 02:00 every day in LA time.
cron.schedule("0 2 * * *", limitLogLineNumbers, { timezone: "America/Los_Angeles" });
