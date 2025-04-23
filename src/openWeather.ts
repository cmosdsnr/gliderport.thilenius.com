import { Request, Response, Router } from "express";
import { getSun } from "sun.js";
import { getCode, getLastMidnightLA, WindCode } from "codes.js";
import { DateTime } from "luxon";
export interface MainWeather {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  sea_level: number;
  grnd_level: number;
  humidity: number;
  temp_kf: number;
}

export interface WeatherInfo {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface Wind {
  speed: number; // mph when units=imperial
  deg: number; // wind direction (0‑360°)
  gust: number;
}

export interface ForecastEntry {
  dt: number; // UTC seconds
  main: MainWeather;
  weather: WeatherInfo[];
  clouds: { all: number };
  wind: Wind;
  visibility: number;
  pop: number;
  sys: { pod: "d" | "n" };
  dt_txt: string;
}

export interface City {
  id: number;
  name: string;
  coord: { lat: number; lon: number };
  country: string;
  population: number;
  timezone: number;
  sunrise: number;
  sunset: number;
}

export interface Forecast {
  cod: string;
  message: number;
  cnt: number;
  list: ForecastEntry[];
  city: City;
}

//stored codes set in fetchOpenWeather
const codes: any = [[], []];

/**
 * Fetches the 5-day weather forecast from OpenWeatherMap for a fixed location.
 * On error, logs to console and rethrows the error.
 *
 * @returns A Promise resolving with the JSON payload from OpenWeatherMap.
 * @throws {Error} If the HTTP response status is not OK or fetch fails.
 */
const fetchOpenWeather = async (): Promise<any> => {
  try {
    const response = await fetch(
      "https://api.openweathermap.org/data/2.5/forecast?lat=32.889956&lon=-117.251632&units=imperial&appid=483c6b4301f7069cbf4e266bffa6d5ff"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: Forecast = await response.json();

    const dt = DateTime.fromSeconds(data.list[0].dt).toJSDate();
    const sun = getSun(dt);
    let sunriseTs = Math.floor(sun.sunrise.getTime() / 1000);
    let sunsetTs = Math.floor(sun.sunset.getTime() / 1000);
    let idx = 0;
    for (let i = 0; i < 2; i++) {
      //go upto sunrise, unless we are already past sunrise
      while (idx < data.list.length && sunriseTs > data.list[idx + 1].dt) idx++;
      //push the first code
      if (idx < data.list.length)
        if (data.list[idx].dt < sunriseTs)
          codes[i].push([sunriseTs, getCode(10 * data.list[idx].wind.speed, data.list[idx].wind.deg)]);
        else codes[i].push([data.list[idx].dt, getCode(10 * data.list[idx].wind.speed, data.list[idx].wind.deg)]);
      idx++;
      while (idx < data.list.length && data.list[idx].dt < sunsetTs) {
        const v = data.list[idx];
        const code = getCode(10 * v.wind.speed, v.wind.deg);
        if (code !== codes[0][codes[i].length - 1][1]) codes[i].push([v.dt, code]);
        idx++;
      }
      if (idx < data.list.length && data.list[idx].dt >= sunsetTs) {
        codes[i].push([sunsetTs, WindCode.IT_IS_DARK]);
        sunriseTs += 24 * 3600;
        const sunData = getSun(DateTime.fromSeconds(sunriseTs).toJSDate());
        sunriseTs = Math.floor(sunData.sunrise.getTime() / 1000);
        sunsetTs = Math.floor(sunData.sunset.getTime() / 1000);
      }
    }
    return data;
  } catch (error) {
    console.error("Error fetching OpenWeather data:", error);
    throw error;
  }
};

// forecast data
export let forecast: any;

(async () => {
  forecast = await fetchOpenWeather();
})();

// Refresh forecast every 2 hours
setInterval(async () => {
  try {
    forecast = await fetchOpenWeather();
  } catch (error) {
    console.error("Error updating forecast data:", error);
  }
}, 2 * 3600_000);

/**
 * Creates an Express router exposing forecast endpoints.
 *
 * @returns {Router} An Express Router with forecast-related routes.
 */
export const forecastRoutes = (): Router => {
  const router = Router();

  /**
   * GET /getForecast
   * Returns the latest fetched weather forecast JSON.
   *
   * @name GetForecast
   * @route {GET} /getForecast
   * @returns 200 - JSON forecast data
   */
  router.get("/getForecast", async (req: Request, res: Response) => {
    res.status(200).json(forecast);
  });
  /**
   * GET /getForecastCodes
   * Returns the latest fetched weather codes.
   *
   * @name GetForecastCodes
   * @route {GET}
   * @returns 200 - JSON forecast codes for 2 days
   */
  router.get("/getForecastCodes", async (req: Request, res: Response) => {
    // res.status(200).json(codes);
    res.status(200).json(codesdb);
  });

  return router;
};
