/**
 * @packageDocumentation
 *
 * **Recursively walks an Express Application or Router**
 * **and returns an array of all registered endpoints (any HTTP method) with their fully-qualified paths.**
 *
 * @example
 * ```ts
 * import express from "express";
 * import { listEndpoints } from "./listEndpoints";
 *
 * const app = express();
 * // ... mount your routers
 * app.use("/api", listEndpoints(app));
 * // GET /api/listEndpoints → [{ method: "GET", path: "/api/listEndpoints" }, …]
 * ```
 *
 * @module listEndpoints
 */

import express, { Application, Router, Request, Response } from "express";
import { getRegistry, registerEndpoint, RegisteredEndpoint } from "./endpointRegistry";

/**
 * Represents a single API endpoint with its HTTP methods and path.
 *
 * @remarks
 * Produced by {@link extractEndpoints} and returned by the `GET /listEndpoints` route
 * registered in {@link listEndpoints}.
 */
export interface Endpoint {
  /** Comma-separated HTTP methods (e.g., "GET", "POST") */
  method: string;
  /** Fully-qualified route path (e.g., "/api/scanLatestDirectory") */
  path: string;
}

/**
 * Walks a single Express layer and either records the endpoint it defines or recurses into
 * its nested stack if it is a mounted router.
 *
 * @param layer   An Express internal layer object (from `app._router.stack` or `router.stack`).
 * @param prefix  The accumulated path prefix leading to this layer (e.g., `"/api/images"`).
 * @param out     Mutable array to which discovered `{ method, path }` objects are appended.
 *
 * @remarks
 * Three cases are handled:
 * - **Route layer** (`layer.route` present): extracts the HTTP methods and full path.
 * - **Router middleware** (`layer.name === "router"`): resolves the mount path from the
 *   layer’s regex and recurses into `layer.handle.stack`.
 * - **All other middleware** (static, error handlers, etc.): ignored.
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
 * Recursively extracts every registered route from the given Express Application or Router.
 *
 * @param appOrRouter - The Express `Application` or `Router` to inspect.
 * @returns An array of {@link Endpoint} objects, one per registered route handler.
 *
 * @remarks
 * Accesses the internal `_router.stack` property of the Express application. If the stack
 * is not yet initialised (no routes registered), an empty array is returned.
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
 * Creates and returns an Express `Router` with a single introspection endpoint.
 *
 * | Method | Path             | Description                                        |
 * |--------|------------------|----------------------------------------------------|
 * | GET    | /listEndpoints   | Returns a JSON array of all registered endpoints.  |
 *
 * @param appOrRouter - The Express `Application` or `Router` whose routes are enumerated.
 * @returns A configured Express `Router` instance.
 *
 * @example
 * ```ts
 * import express from "express";
 * import { listEndpoints } from "./listEndpoints";
 *
 * const app = express();
 * app.use("/api", listEndpoints(app));
 * // GET /api/listEndpoints → [{ method: "GET", path: "/api/listEndpoints" }]
 * ```
 */
export function listEndpoints(appOrRouter: Application | Router): Router {
  const router = express.Router();

  /**
   * GET /listEndpoints
   *
   * Responds with a JSON array of all registered endpoints (method and path).
   */
  registerEndpoint({
    method: "GET",
    path: "/gpapi/listEndpoints",
    group: "System",
    signature: "listEndpoints: () => RegisteredEndpoint[]",
    description:
      "Returns all registered API endpoints enriched with metadata — group, signature, description, and path template.",
    pathTemplate: "GET /gpapi/listEndpoints",
  });
  router.get("/listEndpoints", (_req: Request, res: Response) => {
    const liveRoutes = extractEndpoints(appOrRouter);
    const registry = getRegistry();

    // Build a lookup map: normalised path → registry entry
    const registryMap = new Map<string, RegisteredEndpoint>();
    for (const entry of registry) {
      registryMap.set(entry.path, entry);
    }

    // Track which registry paths were matched to a live route
    const matchedPaths = new Set<string>();

    const result: RegisteredEndpoint[] = [];

    for (const route of liveRoutes) {
      // Normalize Express regex artifact and skip the SPA catch-all
      const normalizedPath = route.path.replace(/^\^/, "");
      if (normalizedPath === "*") continue;

      const entry = registryMap.get(normalizedPath);
      if (entry) {
        matchedPaths.add(normalizedPath);
        result.push(entry);
      } else {
        // Real route with no registry metadata
        const name = normalizedPath.split("/").filter(Boolean).pop() ?? normalizedPath;
        result.push({
          method: route.method,
          path: normalizedPath,
          group: "Missing Description",
          signature: `${name}: () => unknown`,
          description: "",
          pathTemplate: `${route.method} ${normalizedPath}`,
        });
      }
    }

    // Registry entries with no matching live route
    for (const entry of registry) {
      if (!matchedPaths.has(entry.path)) {
        result.push({ ...entry, group: "Missing Implementation" });
      }
    }

    res.json(result);
  });

  return router;
}
