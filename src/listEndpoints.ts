/**
 * listEndpoints.ts
 *
 * Recursively walks an Express Application or Router
 * and returns an array of all registered endpoints
 * (any HTTP method) with their fully‐qualified paths.
 *
 * Usage:
 *   import { listEndpoints } from "./listEndpoints";
 *   // after you’ve done `app.use("/api", createApiRouter())` etc:
 *   app.use("/api", listEndpoints(app));
 *   // → GET  /api/listEndpoints
 */

import express, { Application, Router, Request, Response } from "express";

interface Endpoint {
  method: string; // e.g. "GET, POST, PUT"
  path: string; // e.g. "/api/scanLatestDirectory"
}

/**
 * Walks through a single “layer” and, if it’s a router, descends into it.
 *
 * @param layer   An Express layer object (from app._router.stack or router.stack)
 * @param prefix  The path prefix that led to this layer (e.g. "/api", "/api/images", etc.)
 * @param out     The array we’re accumulating { method, path } objects into.
 */
function traverseLayer(layer: any, prefix: string, out: Endpoint[]) {
  // CASE A: A “direct” route was registered (e.g. router.get("/foo", ...))
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
  //         We need to recurse inside its stack.
  else if (layer.name === "router" && layer.handle && layer.handle.stack) {
    // Try to extract the mount‐path for this layer.
    // In Express 4.x, `layer.regexp` is a regex that matches the mount path, but it’s not trivial to turn
    // that back into a string. However, Express also sets `layer.regexp.fast_slash` if it’s mounted at "/".
    // Instead, the easiest approach is to rely on `layer.path` if you’re on Express 5+
    // or to parse the string out of `layer.regexp`.
    //
    // For simplicity in Express 4, we’ll do this:
    let mountPath = "";
    if (typeof layer.regexp === "object" && layer.regexp.fast_slash) {
      // A “fast slash” means it was mounted at "/"
      mountPath = "";
    } else if (layer.regexp && layer.regexp.source) {
      // Convert something like ^\/api\/?(?=\/|$) into "/api"
      //   1) strip leading ^\
      //   2) strip trailing \/?(?=\/|$) and the final $
      //   3) replace \/ with /
      // For example, "^\\/api\\/?(?=\\/|$)" → "/api"
      const regexSource: string = layer.regexp.source
        .replace(/^\\^\\\//, "/") // remove leading “^\/”
        .replace(/\\\/\?(\(\?\=\\\/\|\$\))$/, "") // remove trailing "\/?(?=\/|$)"
        .replace(/\\\//g, "/"); // turn "\/" into "/"
      mountPath = regexSource;
    }
    // If all else fails, assume it was mounted at "" (root of the prefix.)
    const newPrefix = prefix + mountPath;

    // Now iterate that router’s own stack:
    layer.handle.stack.forEach((innerLayer: any) => {
      traverseLayer(innerLayer, newPrefix, out);
    });
  }
  // CASE C: If you have something like `app.all("*", …)` then layer.route.path might be "*"
  //         That is already caught in CASE A (layer.route is truthy). So nothing extra needed here.

  // CASE D: Static files, error‐handlers, etc. If you want to detect static‐file routes or other
  //         “special” middleware, you’d check e.g. layer.name==="serveStatic", but typically
  //         serveStatic doesn’t expose a “route” object, so you can’t list “GET /images/foo.jpg”
  //         in a generic way without deeper hacks. We’ll ignore those for now.
}

/**
 * Recursively extracts every route from the given Express Application or Router.
 *
 * @param appOrRouter   The Express Application (app) or an Express Router
 * @returns an array of { method, path }
 */
function extractEndpoints(appOrRouter: Application | Router): Endpoint[] {
  const endpoints: Endpoint[] = [];
  // @ts-ignore
  const stack = (appOrRouter as any)._router?.stack;
  if (!Array.isArray(stack)) return endpoints;

  stack.forEach((layer: any) => {
    traverseLayer(layer, "", endpoints);
  });

  return endpoints;
}

/**
 * Returns a new Express Router that exposes
 *    GET /listEndpoints  → JSON array of { method, path }
 *
 * You should `app.use("/api", listEndpoints(app))` or similar.
 */
export function listEndpoints(appOrRouter: Application | Router): Router {
  const router = express.Router();
  router.get("/listEndpoints", (_req: Request, res: Response) => {
    const endpoints = extractEndpoints(appOrRouter);
    res.json(endpoints);
  });
  return router;
}
