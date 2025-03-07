declare module "web-pingjs";

declare module "*.jpg" {
  const value: any;
  export = value;
}

type CodeHistoryTable = {
  date: number;
  data: string;
};

type HoursTable = {
  date: number;
  data: string;
};

type CodeHistoryData = {
  date: number;
  data: {
    codes: [number, number][];
    sun: [number, number];
    limits: [number, number];
  };
};

type GliderportTable = {
  recorded: string;
  speed: number;
  direction: number;
  humidity: number;
  pressure: number;
  temperature: number;
};

type ServerSentTable = {
  id: number;
  sun: string;
  sunData?: {
    solarNoon: number;
    nadir: number;
    sunrise: number;
    sunset: number;
    sunriseEnd: number;
    sunsetStart: number;
    dawn: number;
    dusk: number;
    nauticalDawn: number;
    nauticalDusk: number;
    nightEnd: number;
    night: number;
    goldenHourEnd: number;
    goldenHour: number;
  };
  online_status: number;
  online_status_touched: number;
  last_record: number;
  speed: number;
  direction: number;
  humidity: number;
  pressure: number;
  temperature: number;
  last_image: number;
  last_forecast: number;
  video: number;
};

type MiscellaneousTable = {
  id: string;
  data: string;
};

type HitTable = {
  day: Date;
  total: number;
  unique: number;
};

type HitStats = {
  lastReset: number;
  total: {
    count: number;
    date: string;
    unique: number;
  };
  weeks: {
    start: number;
    totals: number[];
    uniques: number[];
  };
  week: {
    day: string;
    total: number;
    unique: number;
  };
  month: {
    total: number;
    unique: number;
  };
  day: {
    day: string;
    total: number;
    unique: number;
  };
};

type Forecast = [number, number][]; // [time, value]
type VideoList = [string, string][]; // [from, to]
type TodaysCodes = [number, string][]; // [hr, code text]
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

type DebugInfoHours = {
  ts: number;
  resultsFound: number;
  l: number;
};

type DebugCodeHistory = {
  length: number;
  date: number;
  tsLast: number;
  code: number;
  gpResults: number;
  days: {
    length: number;
    date: number;
    c: number;
  }[];
};

type DebugOpenWeather = {
  hours: number;
  start: number;
  stop: number;
};

type DebugSentTexts = {
  direction: number;
  duration: number;
  speed: number;
  to: string;
  when: number;
};

type DebugInfoData = {
  tsLast: number;
  numberRecords: number;
  hourLength: number;
  hours: DebugInfoHours[];
  now: number;
  codeHistory: DebugCodeHistory;
  openWeather: DebugOpenWeather;
  latestHours: number;
  sentTexts: DebugSentTexts[];
  tsLastPre: number;
};

type mailOptionsType = {
  from: string;
  name: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

type globals = {
  offset: number;
  firstRecord: string | null;
  lastRecord: string;
  tdLast: Date;
  numberRecords: number;
  latestHours: number;
  debugInfo: DebugInfoData;
  DEBUG: boolean;
  textWatch: any;
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

type CameraData = {
  starting: {
    file: string;
    time: number;
  };
  ending: {
    file: string;
    time: number;
  };
  smallestIndex: number;
  largestIndex: number;
  numFiles: number;
  numMissing: number;
  isContinuous: boolean;
  video: boolean;
};
interface ImageStats {
  formatType: number; // 0:image1000.jpg 1:image10000.jpg 2:image-1/2-10000.jpg
  error?: string;
  CameraA: CameraData; // original camera pointing right
  CameraB?: CameraData; // second camera pointing left
}
