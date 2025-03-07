import { app } from "./express.js";
import express, { Request, Response, Express } from "express";

interface Endpoint {
  method: string;
  path: string;
}

const listEndpoints = (): Endpoint[] => {
  const endpoints: Endpoint[] = [];

  // Express stores middleware and routes in app._router.stack.
  // Note: The _router property isn’t officially documented and its structure might change.
  app._router.stack.forEach((middleware: any) => {
    // If the middleware has a route, it's a direct route.
    if (middleware.route) {
      const methods: { [method: string]: boolean } = middleware.route.methods;
      // Check if GET or PUT is allowed.
      if (methods.get || methods.put) {
        endpoints.push({
          method: Object.keys(methods)
            .filter((m) => methods[m])
            .map((m) => m.toUpperCase())
            .join(", "),
          path: middleware.route.path,
        });
      }
    } else if (middleware.name === "router" && middleware.handle && middleware.handle.stack) {
      // If the middleware is a router, iterate over its stack.
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const methods: { [method: string]: boolean } = handler.route.methods;
          if (methods.get || methods.put) {
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

// Create a GET route that returns the endpoints list
app.get("/listEndpoints", (req: Request, res: Response) => {
  const endpoints = listEndpoints();
  res.json(endpoints);
});
