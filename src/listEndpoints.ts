// listEndpoints.ts
/**
 * Provides an Express router with endpoints to list all registered endpoints
 * by scanning the given Express application (or router) middleware stack.
 *
 * Usage:
 *   import { listEndpoints } from "./listEndpoints";
 *   // later, after creating `app`:
 *   app.use("/api", listEndpoints(app));
 */

import express, { Application, Router, Request, Response } from "express";

interface Endpoint {
  method: string;
  path: string;
}

/**
 * Scans the given Express `appOrRouter` and returns an array of all routes
 * (only GET and POST are included here; adjust as needed).
 */
function extractEndpoints(appOrRouter: Application | Router): Endpoint[] {
  const endpoints: Endpoint[] = [];

  // @ts-ignore _router is not officially typed, but this is where Express keeps its routes
  const stack = (appOrRouter as any)._router?.stack;
  if (!Array.isArray(stack)) return endpoints;

  stack.forEach((middleware: any) => {
    // Case A: direct route attached via app.get(...) or router.get(...)
    if (middleware.route) {
      const methods: Record<string, boolean> = middleware.route.methods;
      if (methods.get || methods.post) {
        endpoints.push({
          method: Object.keys(methods)
            .filter((m) => methods[m])
            .map((m) => m.toUpperCase())
            .join(", "),
          path: middleware.route.path,
        });
      }
    }
    // Case B: mount point for a nested router (middleware.name === "router")
    else if (middleware.name === "router" && middleware.handle && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const methods: Record<string, boolean> = handler.route.methods;
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
}

/**
 * Returns an Express Router that exposes:
 *   • GET /listEndpoints   → JSON array of { method, path }
 *   • GET /endpoints       → simple HTML table with clickable links
 *
 * @param appOrRouter  The Express Application (or Router) to inspect
 */
export function listEndpoints(appOrRouter: Application | Router): Router {
  const router = express.Router();

  // GET /listEndpoints → returns JSON array of endpoints
  router.get("/listEndpoints", (_req: Request, res: Response) => {
    const endpoints = extractEndpoints(appOrRouter);
    res.json(endpoints);
  });

  // GET /endpoints → returns an HTML table of endpoints (clickable links)
  router.get("/endpoints", (_req: Request, res: Response) => {
    const endpoints = extractEndpoints(appOrRouter);
    let html = `<html><head><title>Registered Endpoints</title></head><body>`;
    html += `<h1>Registered Endpoints</h1>`;
    html += `<table border="1" cellpadding="5" cellspacing="0"><thead><tr><th>Method</th><th>Path</th></tr></thead><tbody>`;
    endpoints.forEach((ep) => {
      html += `<tr>
                 <td>${ep.method}</td>
                 <td><a href="${ep.path}" target="_blank" rel="noopener noreferrer">${ep.path}</a></td>
               </tr>`;
    });
    html += `</tbody></table></body></html>`;
    res.send(html);
  });

  return router;
}
