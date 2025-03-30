/**
 * @module routes
 *
 * This module defines and mounts all route handlers used in the application.
 * It imports individual route modules and mounts them to the Express application instance.
 */

import { Express } from "express";

// Import individual route modules
import espRoutes from "./routes/esp";
import statsRoutes from "./routes/stats";

/**
 * Mounts all route handlers to the given Express application instance.
 *
 * @param {Express} app - The Express application instance to mount the routes on.
 */
export const registerRoutes = (app: Express): void => {
  app.use("/", espRoutes());
  app.use("/", statsRoutes());
};
