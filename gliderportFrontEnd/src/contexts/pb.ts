import PocketBase from "pocketbase";
import { pbUrl } from "@/components/paths";

console.log("connecting to: " + pbUrl);
export const pb = new PocketBase(pbUrl);
