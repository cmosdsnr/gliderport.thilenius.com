import PocketBase from "pocketbase";

const pbURL = import.meta.env.VITE_PB_URL.toString();
console.log("connecting to: " + pbURL);
export const pb = new PocketBase(pbURL);
