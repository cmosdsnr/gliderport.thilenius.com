/**
 * @packageDocumentation
 *
 * Provides endpoints for retrieving and processing 5-day weather forecasts from OpenWeatherMap,
 * computing wind condition codes based on wind speed, direction, and daylight, and storing
 * forecast data in PocketBase.
 *
 * @module openWeather
 */

import { Request, Response, Router } from "express";
import { getSun } from "sun.js";
import { getCode, getLastMidnightLA, WindCode } from "codes.js";
import { DateTime } from "luxon";
import { pb } from "pb.js";
import { ToId } from "miscellaneous.js";

/**
 * Main weather metrics returned by OpenWeatherMap.
 */
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

/**
 * Weather condition information for a forecast entry.
 */
export interface WeatherInfo {
  id: number;
  main: string;
  description: string;
  icon: string;
}

/**
 * Wind data for a forecast entry (speed in mph, direction 0–360°, gust).
 */
export interface Wind {
  speed: number;
  deg: number;
  gust: number;
}

/**
 * Single forecast entry from the OpenWeatherMap 5-day forecast.
 */
export interface ForecastEntry {
  /** UTC timestamp (seconds) of the forecast data */
  dt: number;
  /** Main weather metrics */
  main: MainWeather;
  /** Array of weather conditions */
  weather: WeatherInfo[];
  /** Cloud coverage percentage */
  clouds: { all: number };
  /** Wind data */
  wind: Wind;
  /** Visibility in meters */
  visibility: number;
  /** Probability of precipitation */
  pop: number;
  /** Day/Night indicator ("d" or "n") */
  sys: { pod: "d" | "n" };
  /** Date/time string (e.g., "2025-04-12 15:00:00") */
  dt_txt: string;
  /** Computed wind condition code (added after fetching) */
  code: WindCode;
}

/**
 * City metadata from the OpenWeatherMap API.
 */
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

/**
 * Full 5-day forecast response from OpenWeatherMap.
 */
export interface Forecast {
  cod: string;
  message: number;
  cnt: number;
  list: ForecastEntry[];
  city: City;
}

// In-memory storage of computed codes for two days: [day1Codes, day2Codes]
let codes: [Array<[number, WindCode]>, Array<[number, WindCode]>] = [[], []];

/**
 * Fetches the 5-day weather forecast from OpenWeatherMap for a fixed location (latitude: 32.889956, longitude: -117.251632).
 * On success, computes wind condition codes for the next two days based on sunrise/sunset times.
 * On error, logs to console and rethrows.
 *
 * @returns A Promise resolving with the raw Forecast JSON payload from OpenWeatherMap.
 * @throws {Error} If the HTTP response status is not OK or fetch fails.
 */
const fetchOpenWeather = async (): Promise<Forecast> => {
  try {
    const response = await fetch(
      "https://api.openweathermap.org/data/2.5/forecast?lat=32.889956&lon=-117.251632&units=imperial&appid=483c6b4301f7069cbf4e266bffa6d5ff"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: Forecast = await response.json();

    // Compute sunrise and sunset timestamps for the first forecast timestamp
    const firstDtDate = DateTime.fromSeconds(data.list[0].dt).toJSDate();
    const sunTimes = getSun(firstDtDate);
    let sunriseTs = Math.floor(sunTimes.sunrise.getTime() / 1000);
    let sunsetTs = Math.floor(sunTimes.sunset.getTime() / 1000);

    // Reset codes arrays
    codes = [[], []];
    let idx = 0;

    // Compute codes for two days
    for (let dayIndex = 0; dayIndex < 2; dayIndex++) {
      // Advance idx until just before sunrise (unless already past sunrise)
      while (idx < data.list.length && data.list[idx + 1]?.dt < sunriseTs) {
        idx++;
      }
      // Push first code at either sunriseTs or first data timestamp, whichever is later
      if (idx < data.list.length) {
        const entry = data.list[idx];
        const codeTime = entry.dt < sunriseTs ? sunriseTs : entry.dt;
        const windCode = getCode(10 * entry.wind.speed, entry.wind.deg);
        codes[dayIndex].push([codeTime, windCode]);
      }
      idx++;

      // Process until sunsetTs
      while (idx < data.list.length && data.list[idx].dt < sunsetTs) {
        const entry = data.list[idx];
        const windCode = getCode(10 * entry.wind.speed, entry.wind.deg);
        // Only add if code changes from previous
        if (windCode !== codes[dayIndex][codes[dayIndex].length - 1][1]) {
          codes[dayIndex].push([entry.dt, windCode]);
        }
        idx++;
      }

      // At or after sunset, push IT_IS_DARK code, then advance to next day's sunrise/sunset
      if (idx < data.list.length && data.list[idx].dt >= sunsetTs) {
        codes[dayIndex].push([sunsetTs, WindCode.IT_IS_DARK]);
        // Move sunriseTs to next day
        sunriseTs += 24 * 3600;
        const nextSun = getSun(DateTime.fromSeconds(sunriseTs).toJSDate());
        sunriseTs = Math.floor(nextSun.sunrise.getTime() / 1000);
        sunsetTs = Math.floor(nextSun.sunset.getTime() / 1000);
      }
    }

    return data;
  } catch (error) {
    console.error("Error fetching OpenWeather data:", error);
    throw error;
  }
};

// In-memory storage of the latest forecast payload
export let forecast: Forecast;

/**
 * Retrieves the forecast via `fetchOpenWeather`, computes wind codes for each entry,
 * and updates the PocketBase "forecast" status record with the full payload.
 *
 * Any errors during update are logged to console but not thrown.
 */
const getForecast = async (): Promise<void> => {
  try {
    forecast = await fetchOpenWeather();
    // Assign code to each forecast entry
    forecast.list.forEach((entry: ForecastEntry) => {
      entry.code = getCode(10 * entry.wind.speed, entry.wind.deg);
    });
    // Store forecast data in PocketBase under status ID "forecast"
    await pb.collection("status").update(ToId("forecast"), { record: forecast });
  } catch (error) {
    console.error("Error updating forecast data:", error);
  }
};
// Immediately fetch forecast on module load
getForecast();
// Refresh forecast every 2 hours
setInterval(getForecast, 2 * 3600_000);

/**
 * Returns a new Express `Router` that exposes:
 *   GET /getForecast → latest fetched weather forecast JSON
 *   GET /getForecastCodes → computed wind condition codes for two days
 *
 * Mount this on your app or a sub-route to provide forecast endpoints.
 *
 * @returns A `Router` with routes `/getForecast` and `/getForecastCodes`.
 */
export const forecastRoutes = (): Router => {
  const router = Router();

  /**
   * GET /getForecast
   *
   * Returns the latest fetched weather forecast JSON object.
   *
   * @returns 200 with the `forecast` payload.
   */
  router.get("/getForecast", (_req: Request, res: Response) => {
    res.status(200).json(forecast);
  });

  /**
   * GET /getForecastCodes
   *
   * Returns the computed wind condition codes for the next two days.
   *
   * @returns 200 with the `codes` array: `[day1Codes, day2Codes]`.
   */
  router.get("/getForecastCodes", (_req: Request, res: Response) => {
    res.status(200).json(codes);
  });

  return router;
};
