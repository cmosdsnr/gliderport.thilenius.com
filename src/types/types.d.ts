import { ReactNode } from "react";

declare module "*.png";
// declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.svg";

declare module "*.jpg" {
  const value: string;
}

declare global {
  // Donor format from WebSocket Server
  type Donor = {
    id: number;
    name: string;
    amount: number;
    date: string;
  };

  // Post format from WebSocket Server PLACEHOLDER
  interface Post {
    d?: number[];
    sun?: number;
  }

  //

  interface Weeks {
    totals: number[];
    uniques: number[];
    start: string;
  }

  type StatsDay = { day: string; unique: number; total: number };
  type StatsWeek = { day: string; unique: number; total: number };
  type StatsMonth = { unique: number; total: number };

  interface Stats {
    lastReset?: string;
    total?: {
      date: string;
      count: number;
      unique: number;
    };
    day?: StatsDay;
    week?: StatsWeek;
    month?: StatsMonth;
    weeks?: Weeks;
  }

  interface Forecast {
    [index: number]: [number, string]; // hour of the day, forecast
  }

  // video data received from server
  type VideoItem = {
    years: [string];
    dates: [[string, string] | string]; // from date -> to date, or a single day
  };

  type TimeStamp = number;

  type Sun = {
    rise: TimeStamp;
    set: TimeStamp;
  };

  // possible fields of update data received from WebSocket Server
  type CurrentData = {
    sunrise: TimeStamp;
    sunset: TimeStamp;

    onlineStatus: 0 | 1;
    onlineStatusTouched: TimeStamp;

    lastRecord: TimeStamp;
    speed: number;
    direction: number;
    humidity: number;
    pressure: number;
    temperature: number;

    lastImage: TimeStamp;
    lastForecast: TimeStamp;

    videoWidth: number;
    videoHeight: number;
    numberConnections: number;
    videoServerOnline: number;
    sleeping: number;
  };

  type gpImageData = null | {
    A: string;
  };

  type Client = {
    id: number;
    name: string;
    amount: number;
    date: string;
    [key: string]: any; // Add this index signature
  };

  type UserSettings = {
    address?: string;
    phone?: string;
    provider?: string;
    errorAngle?: number;
    speed?: number;
    duration?: number;
    direction?: number;
  };

  interface User {
    id: string;
    email: string;
    verified: boolean;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar: null | string; // url of the avatar
    role: "Administrator" | "Member";
    textMe: boolean;
    settings: UserSettings;
  }

  type SignUp = {
    email: string;
    password: string;
    passwordConfirm: string;
    firstName: string;
    lastName: string;
  };
}
