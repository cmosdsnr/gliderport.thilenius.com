import PocketBase from "pocketbase";
import dotenv from "dotenv";
import { dirname } from "path";
import fs from "fs";
import { fileURLToPath } from "url";

export let pb: any = null;
export let authData = null;

dotenv.config();

// const __f = fileURLToPath(import.meta.url);
// const __dirname = dirname(__f);
// export let logsDir = __dirname + `/../public/logs/`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function testConnection(firstPass: boolean) {
  try {
    const health = await pb.health.check();
    console.log("✅ Connection successful:", health);
    return true;
  } catch (error: any) {
    if (!firstPass) console.error("❌ Connection failed:", error.message);
    return false;
  }
}

export const pbInit = () => {
  return new Promise<void>(async (resolve, reject) => {
    let url = "";
    let connected = false;
    let loggedIn = false;
    let firstPass = true;
    console.log("connecting to pocketbase...");
    while (!connected) {
      url = "http://pocketbase.web:5000";
      // let res = await fetch(url);
      pb = new PocketBase(url);
      pb.autoCancellation(false);
      // logsDir = __dirname + `/../../public/logs/`;
      // if (!fs.existsSync(logsDir)) console.log("ERROR!!! could not find server directory", logsDir);
      connected = await testConnection(firstPass);

      //   if (!connected) {
      //     url = "https://pocketbase.thilenius.com";
      //     // let res = await fetch(url);
      //     pb = new PocketBase(url);
      //     pb.autoCancellation(false);
      //     //   logsDir = __dirname + `/../public/logs/`;
      //     //   if (!fs.existsSync(logsDir)) console.log("ERROR!!! could not find local directory", logsDir);
      //     connected = await testConnection(false);
      //   }
      firstPass = false;
      if (!connected) {
        console.log("Retrying in 15 seconds...");
        await delay(15000); // Wait for 15 seconds before retrying
      }
    }
    console.log("url: ", url);
    while (!loggedIn) {
      try {
        authData = await pb.admins.authWithPassword("stephen@thilenius.com", "Qwe123qwe!");
        console.log("pocketbase logged in to: " + url);
        loggedIn = true;
        resolve();
      } catch (error: any) {
        console.error("pb connected but failed to login", error.message);
        console.log("Retrying in 15 seconds...");
        await delay(15000); // Wait for 30 seconds before retrying
      }
    }
  });
};
