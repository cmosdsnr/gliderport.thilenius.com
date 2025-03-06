import fs from "fs";

export function isDirectory(path: string): boolean {
  try {
    return fs.statSync(path).isDirectory();
  } catch (err) {
    // console.error(err);
    return false;
  }
}
