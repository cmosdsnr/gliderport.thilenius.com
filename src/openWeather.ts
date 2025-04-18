import { Request, Response, Router } from "express";

const fetchOpenWeather = async () => {
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

let forecast = await fetchOpenWeather();

setInterval(async () => {
  try {
    forecast = await fetchOpenWeather();
  } catch (error) {
    console.error("Error updating forecast data:", error);
  }
}, 2 * 3600000); // Update every 2 hours

export const forecastRoutes = (): Router => {
  const router = Router();

  // Endpoint to update the code history record based on new wind data.
  // for testing only! updateCodeHistory is called in wind.ts - UpdateWindTable
  router.get("/getForecast", async (req: Request, res: Response) => {
    try {
      res.status(200).json(forecast);
    } catch (error) {
      res.status(500).send("Error reading archive files.");
    }
  });

  return router;
};
