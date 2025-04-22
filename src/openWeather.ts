import { Request, Response, Router } from "express";

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
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching OpenWeather data:", error);
    throw error;
  }
};

// Initial forecast load
let forecast: any;

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

  return router;
};
