import PocketBase from "pocketbase";
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

  // Code History format from WebSocket Server
  type Day = {
    date: number; //time stamp of midnight, UTC
    codes: CodePoint[];
    sun: [number, number]; //seconds into day for sunrise and sunset
    limits: [number, number]; //hour numbers for start and stop of the plot e.g. [5,19]
  };

  type CodePoint = [
    number, // seconds into day
    number // code
  ];

  //
  type Reading = {
    time: number;
    speed: number;
    direction: number;
    humidity: number;
    pressure: number;
    temperature: number;
  };

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

  type CameraImage = {
    image: string;
    date: number;
    dateString?: string;
  };

  type CameraImageSet = CameraImage[];
  type CameraImages = {
    camera1: CameraImageSet;
    camera2: CameraImageSet;
  };

  interface DataContextInterface {
    //states
    clients: Array<Client>;
    donors: Array<Donor>;
    posts: Array<Post>;
    history: Array<Day>;
    chart: Array<Reading>;
    latest: Reading;
    status: Array<number>;
    lastCheck: TimeStamp;
    forecast: Array<Forecast>;
    forecastFull: any;
    hitStats: Stats | null;
    passedSeconds: number;
    offline: boolean;
    cameraImages: CameraImages;
    sleeping: boolean;
    image1: string | null;
    bigImage1: string | null;
    image2: string | null;
    bigImage2: string | null;
    lastForecast: TimeStamp;
    sun: Sun;
    videoWidth: number;
    videoHeight: number;
    numberConnections: number;
    videoServerOnline: boolean;
    message: [string | null, string | null];
    //functions
    loadData: (name: string) => void;
    printDate: (ts: TimeStamp) => string;
  }

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

  interface Message {
    ts: number;
    date: string;
    uid: string;
    ownerName: string;
    msg: string;
  }

  interface AuthProviderProps {
    children: ReactNode;
  }

  interface MessageItem {
    id: string;
    created: string;
    message: string;
    username: string;
    name: string;
    avatar: string;
    uid: string;
  }

  interface AuthContextType {
    pb: PocketBase;
    currentUser: User | null;
    ChangePassword: (transaction: any) => void;
    avatar: string;
    login: (email: string, password: string) => any;
    googleLogin: () => void;
    logout: () => void;
    signUp: (data: any) => void;
    sendVerification: (email: string) => void;
    requestVerification: () => void;
    resetPassword: (email: string) => void;
    ChangeEmail: (newEmail: string) => void;
    changeAvatar: (data: FormData) => void;
    updateUser: (name: string, value: any) => Promise<boolean>;
    updateUserSettings: (obj: Partial<UserSettings>, textMe?: boolean) => Promise<boolean>;
    reloadUserInfo: () => Promise<void>;
    messages: MessageItem[];
    messagesLoaded: boolean;
    newMessage: (msg: string) => Promise<void>;
    deleteMessage: (msg: MessageItem) => Promise<void>;
  }

  type Limits = {
    tsStart: number;
    tsStop: number;
    yMin: number;
    yMax: number;
  };
  type FillReturnDataType = {
    filled: null | [number, number][][];
    limits: null | Limits;
  };
  type FffReturnDataType = {
    filled: [number, number][];
    limits: null | Limits;
  };
  type FilterReturnDataType = {
    filtered: [number, number][];
    fTop: [number, number][];
    fBottom: [number, number][];
    limits: null | Limits;
  };
  type SignUp = {
    email: string;
    password: string;
    passwordConfirm: string;
    firstName: string;
    lastName: string;
  };
}
