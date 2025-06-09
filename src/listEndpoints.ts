/**
 * @packageDocumentation
 *
 * **Recursively walks an Express Application or Router**
 * **and returns an array of all registered endpoints (any HTTP method) with their fully-qualified paths.**
 *
 * Usage:
 * ```ts
 * import express from 'express';
 * import { listEndpoints } from './listEndpoints';
 * const app = express();
 * // ... mount your routers
 * app.use('/api', listEndpoints(app));
 * // → GET  /api/listEndpoints
 * ```
 *
 * @module listEndpoints
 */

import express, { Application, Router, Request, Response } from "express";

/**
 * Represents a single API endpoint with its HTTP methods and path.
 */
interface Endpoint {
  /** Comma-separated HTTP methods (e.g., "GET", "POST") */
  method: string;
  /** Fully-qualified route path (e.g., "/api/scanLatestDirectory") */
  path: string;
}

/**
 * Walks through an Express Layer and, if it’s a route or router, extracts endpoints or recurses.
 *
 * @param layer   An Express layer object (from `app._router.stack` or `router.stack`).
 * @param prefix  The path prefix that led to this layer (e.g., "/api", "/api/images").
 * @param out     The array to accumulate `{ method, path }` objects into.
 */
function traverseLayer(layer: any, prefix: string, out: Endpoint[]): void {
  // CASE A: A “direct” route was registered (e.g., router.get("/foo", ...)).
  if (layer.route) {
    const routePath: string = layer.route.path;
    const methods: Record<string, boolean> = layer.route.methods;
    const methodNames = Object.keys(methods)
      .filter((m) => methods[m])
      .map((m) => m.toUpperCase())
      .join(", ");
    out.push({ method: methodNames, path: prefix + routePath });
  }
  // CASE B: This layer is a “router” middleware (mounted via router.use or app.use).
  //         Recurse inside its stack to extract nested routes.
  else if (layer.name === "router" && layer.handle && layer.handle.stack) {
    let mountPath = "";

    // In Express 4.x, `layer.regexp` is a Regex matching the mount path.
    // - If `fast_slash` is true, it was mounted at "/".
    if (typeof layer.regexp === "object" && layer.regexp.fast_slash) {
      mountPath = "";
    }
    // Otherwise, convert the regex source to a string path.
    else if (layer.regexp && layer.regexp.source) {
      const regexSource: string = layer.regexp.source
        .replace(/^\\^\\\//, "/") // remove leading "^\/"
        .replace(/\\\/\?(\(\?\=\\\/\|\$\))$/, "") // remove trailing "\/?(?=\/|$)"
        .replace(/\\\//g, "/"); // turn "\/" into "/"
      mountPath = regexSource;
    }

    // Combine the prefix with the mount path.
    const newPrefix = prefix + mountPath;

    // Recurse into the router's own stack.
    layer.handle.stack.forEach((innerLayer: any) => {
      traverseLayer(innerLayer, newPrefix, out);
    });
  }
  // CASE C & D: Other middleware (e.g., static, error handlers) are ignored.
}

/**
 * Recursively extracts every route from the given Express Application or Router.
 *
 * @param appOrRouter   The Express Application (`app`) or an Express `Router`.
 * @returns An array of `{ method, path }` objects for each registered endpoint.
 */
function extractEndpoints(appOrRouter: Application | Router): Endpoint[] {
  const endpoints: Endpoint[] = [];
  // Access the internal router stack (`_router.stack`)
  // @ts-ignore
  const stack = (appOrRouter as any)._router?.stack;
  if (!Array.isArray(stack)) return endpoints;

  stack.forEach((layer: any) => {
    traverseLayer(layer, "", endpoints);
  });

  return endpoints;
}

/**
 * Returns a new Express `Router` that exposes:
 *   GET /listEndpoints → JSON array of `{ method, path }`
 *
 * Mount this on your app or a sub-route to list all endpoints under that mount path.
 *
 * @param appOrRouter   The Express Application or Router to inspect.
 * @returns A `Router` with a single route `/listEndpoints`.
 */
export function listEndpoints(appOrRouter: Application | Router): Router {
  const router = express.Router();

  /**
   * GET /listEndpoints
   *
   * Responds with a JSON array of all registered endpoints (method and path).
   */
  router.get("/listEndpoints", (_req: Request, res: Response) => {
    const endpoints = extractEndpoints(appOrRouter);
    res.json(endpoints);
  });

  return router;
}
