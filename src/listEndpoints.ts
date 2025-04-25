/**
 * Provides an Express router with an endpoint to list all registered endpoints
 * by scanning the internal Express application middleware stack.
 *
 * This module extracts endpoints (HTTP methods and paths) from the Express app's internal
 * `_router.stack` (which is undocumented and subject to change) and exposes them via a GET
 * endpoint at "/listEndpoints".
 *
 * @module listEndpoints
 */

import { app } from "./startExpress";
import express, { Router, Request, Response } from "express";

/**
 * @typedef {Object} Endpoint
 * @property {string} method - The HTTP method(s) for the endpoint.
 * @property {string} path - The route path.
 * Interface representing an endpoint with a method and path.
 */
interface Endpoint {
  method: string;
  path: string;
}

/**
 * Creates an Express router with a GET endpoint that returns the list of registered endpoints.
 *
 * @returns {Router} An Express router with the "/listEndpoints" endpoint.
 */
export const listEndpoints = (): Router => {
  /**
   * Retrieves the list of endpoints from the Express application's middleware stack.
   *
   * It iterates over the internal `_router.stack` and extracts both direct routes and nested router routes,
   * filtering for those with GET or POST methods.
   *
   * @returns {Endpoint[]} An array of endpoint objects, each containing the HTTP method(s) and route path.
   */
  const getEndpoints = (): Endpoint[] => {
    const endpoints: Endpoint[] = [];

    // Iterate over the Express app's middleware stack.
    app._router.stack.forEach((middleware: any) => {
      // If the middleware has a direct route, extract its methods and path.
      if (middleware.route) {
        const methods: { [method: string]: boolean } = middleware.route.methods;
        // Consider endpoints that support GET or POST.
        if (methods.get || methods.post) {
          endpoints.push({
            method: Object.keys(methods)
              .filter((m) => methods[m])
              .map((m) => m.toUpperCase())
              .join(", "),
            path: middleware.route.path,
          });
        }
      } else if (middleware.name === "router" && middleware.handle && middleware.handle.stack) {
        // If the middleware is a router, iterate over its internal stack.
        middleware.handle.stack.forEach((handler: any) => {
          if (handler.route) {
            const methods: { [method: string]: boolean } = handler.route.methods;
            if (methods.get || methods.post) {
              endpoints.push({
                method: Object.keys(methods)
                  .filter((m) => methods[m])
                  .map((m) => m.toUpperCase())
                  .join(", "),
                path: handler.route.path,
              });
            }
          }
        });
      }
    });
    return endpoints;
  };

  // Create a new Express router.
  const router = express.Router();

  /**
   * GET /listEndpoints
   *
   * Returns a JSON array of registered endpoints (HTTP method(s) and paths).
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  router.get("/listEndpoints", (req: Request, res: Response) => {
    const endpoints = getEndpoints();
    res.json(endpoints);
  });

  /**
   * GET /endpoints
   *
   * Returns an HTML table of registered endpoints where each endpoint's path is a clickable link.
   * Links will open in a new tab.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  router.get("/endpoints", (req: Request, res: Response) => {
    const endpoints = getEndpoints();
    let html = `<html><head><title>Registered Endpoints</title></head><body>`;
    html += `<h1>Registered Endpoints</h1>`;
    html += `<table border="1" cellpadding="5" cellspacing="0"><thead><tr><th>Method</th><th>Path</th></tr></thead><tbody>`;
    endpoints.forEach((endpoint) => {
      html += `<tr><td>${endpoint.method}</td><td><a href="${endpoint.path}" target="_blank" rel="noopener noreferrer">${endpoint.path}</a></td></tr>`;
    });
    html += `</tbody></table></body></html>`;
    res.send(html);
  });
  return router;
};
