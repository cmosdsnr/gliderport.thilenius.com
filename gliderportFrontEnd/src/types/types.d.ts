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
  /**
   * A donor record as received from the WebSocket server.
   */
  type Donor = {
    /** Unique donor identifier. */
    id: number;
    /** Display name of the donor. */
    name: string;
    /** Donation amount. */
    amount: number;
    /** ISO date string of the donation. */
    date: string;
  };

  /**
   * Placeholder post format received from the WebSocket server.
   * Fields are optional and subject to change.
   */
  interface Post {
    /** Array of data values. */
    d?: number[];
    /** Sun-related numeric value. */
    sun?: number;
  }

  /**
   * A daily forecast indexed by hour.
   * Each entry is a tuple of `[hourOfDay, forecastDescription]`.
   */
  interface Forecast {
    [index: number]: [number, string];
  }

  /**
   * Video archive data received from the server.
   */
  type VideoItem = {
    /** List of years for which video is available. */
    years: [string];
    /** Date entries — either a `[fromDate, toDate]` range or a single day string. */
    dates: [[string, string] | string];
  };

  /** Unix timestamp (milliseconds since epoch). */
  type TimeStamp = number;

  /**
   * Sunrise and sunset timestamps for a given day.
   */
  type Sun = {
    /** Sunrise time as a Unix timestamp. */
    rise: TimeStamp;
    /** Sunset time as a Unix timestamp. */
    set: TimeStamp;
  };

  /**
   * Live sensor and status data received from the WebSocket server.
   * All fields are optional in practice — only updated fields are sent on each push.
   */
  type CurrentData = {
    /** Today's sunrise as a Unix timestamp. */
    sunrise: TimeStamp;
    /** Today's sunset as a Unix timestamp. */
    sunset: TimeStamp;

    /** Whether the weather station is online (`1`) or offline (`0`). */
    onlineStatus: 0 | 1;
    /** Timestamp of the last online-status change. */
    onlineStatusTouched: TimeStamp;

    /** Timestamp of the most recent sensor record. */
    lastRecord: TimeStamp;
    /** Current wind speed (mph or km/h depending on server config). */
    speed: number;
    /** Current wind direction in degrees (0–360). */
    direction: number;
    /** Current relative humidity percentage. */
    humidity: number;
    /** Current barometric pressure (hPa). */
    pressure: number;
    /** Current temperature (°C or °F depending on server config). */
    temperature: number;

    /** Timestamp of the most recent camera image. */
    lastImage: TimeStamp;
    /** Timestamp of the most recent forecast update. */
    lastForecast: TimeStamp;

    /** Width of the live video stream in pixels. */
    videoWidth: number;
    /** Height of the live video stream in pixels. */
    videoHeight: number;
    /** Number of active WebSocket connections to the server. */
    numberConnections: number;
    /** Whether the video server is online (`1`) or offline (`0`). */
    videoServerOnline: number;
    /** Whether the system is in low-power sleep mode (`1` = sleeping). */
    sleeping: number;
  };

  /**
   * Raw image payload from the gliderport camera.
   * `null` when no image is available; otherwise contains a base-64-encoded JPEG string.
   */
  type gpImageData = null | {
    /** Base-64-encoded image data. */
    A: string;
  };

  /**
   * A generic client record with a flexible extra-fields escape hatch.
   */
  type Client = {
    /** Unique client identifier. */
    id: number;
    /** Display name. */
    name: string;
    /** Account amount. */
    amount: number;
    /** ISO date string. */
    date: string;
    /** Additional arbitrary fields. */
    [key: string]: any;
  };

  /**
   * Per-user notification and alert preferences stored in PocketBase.
   */
  type UserSettings = {
    /** Street address for SMS alerts. */
    address?: string;
    /** Phone number for SMS alerts. */
    phone?: string;
    /** SMS provider gateway (e.g. `"@vtext.com"`). */
    provider?: string;
    /** Acceptable wind-direction error margin in degrees before an alert fires. */
    errorAngle?: number;
    /** Minimum wind speed threshold (same units as `CurrentData.speed`) for alerts. */
    speed?: number;
    /** Minimum consecutive duration (minutes) at threshold before alerting. */
    duration?: number;
    /** Ideal wind direction in degrees for this user's flying preference. */
    direction?: number;
  };

  /**
   * Authenticated user record, sourced from PocketBase via `AuthContext`.
   */
  interface User {
    /** PocketBase record ID. */
    id: string;
    /** User's email address. */
    email: string;
    /** Whether the user's email has been verified in PocketBase. */
    verified: boolean;
    /** Optional given name. */
    firstName?: string;
    /** Optional family name. */
    lastName?: string;
    /** Optional unique username. */
    username?: string;
    /** URL of the user's avatar image, or `null` if none is set. */
    avatar: null | string;
    /** Access role controlling which features are visible. */
    role: "Administrator" | "Member";
    /** Whether the user has opted in to SMS wind alerts. */
    textMe: boolean;
    /** User-specific alert and notification settings. */
    settings: UserSettings;
  }

  /**
   * Fields submitted during new-account registration.
   */
  type SignUp = {
    /** Email address for the new account. */
    email: string;
    /** Chosen password. */
    password: string;
    /** Must match `password` exactly. */
    passwordConfirm: string;
    /** User's given name. */
    firstName: string;
    /** User's family name. */
    lastName: string;
  };
}
