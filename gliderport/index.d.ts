/**
 * This file is used to define types for the project.
 * It is automatically included in the project.
 *
 * @module  Types
 */

declare module "web-pingjs";

declare module "*.jpg" {
  const value: any;
  export = value;
}

type Forecast = [number, number][]; // [time, value]
type VideoList = [string, string][]; // [from, to]
type ForecastFull = ForecastFullItem[];

type ForecastFullItem = {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust: number;
  pop: number;
  weather_id: number;
  weather_main: string;
  weather_description: string;
  weather_icon: string;
};

type OpenWeatherReport = {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather?: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  weather_id?: number;
  weather_main?: string;
  weather_description?: string;
  weather_icon?: string;
  pop: number;
};

type OpenWeatherMapData = {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: OpenWeatherReport;
  hourly: OpenWeatherReport[];
};

type DataType = {
  start: number;
  date: number[];
  speed: number[];
  direction: number[];
  humidity: number[];
  pressure: number[];
  temperature: number[];
};

type Globals = {
  DEBUG: boolean;
  textWatch: Record<string, any>; // or you can use `any` if you prefer
  firstRecord: any | null;
  lastRecord: string;
  tdLast: Date;
  numberRecords: number;
  latestHours: number;
};
