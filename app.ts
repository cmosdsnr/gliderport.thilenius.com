// app.ts
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";

import { socketServer } from "socket";
import { createApiRouter } from "apiRouter";
import { listEndpoints } from "listEndpoints"; // <- our updated version

dotenv.config();
process.env.TZ = "America/Los_Angeles";

const PORT = process.env.PORT || 3000;
export var app: express.Application = express();

app.set("trust proxy", true);

// 1) Body parsing & CORS
app.use(
  express.urlencoded({
    extended: true,
    limit: "30mb",
  })
);
app.use(
  bodyParser.json({
    limit: "10mb",
  })
);
app.use(
  bodyParser.urlencoded({
    limit: "10mb",
    extended: true,
  })
);

const corsOptions = {
  origin: [/gliderport.*thilenius.*/, /localhost.*/, /.*/],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 2) File‐upload (optional)
// app.use(
//   fileUpload({
//     limits: { fileSize: 50 * 1024 * 1024 }, // 50mb
//   })
// );

// 3) Mount listEndpoints _first_ so you can inspect everything under `/api`
//    Note: we pass the `app` itself, so it will list _all_ routes attached to `app`.
app.use("/api", listEndpoints(app));

// 4) Mount the rest of your API under /api as well
app.use("/api", createApiRouter());

// 5) Serve static assets
app.use("/images", express.static("/app/gliderport/images"));
app.use("/docs", express.static("/app/docs"));
app.use("/", express.static("/app/gp_dist"));

// 6) SPA fallback
app.get("*", (req: Request, res: Response) => {
  res.sendFile("/app/gp_dist/index.html");
});

// 7) Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ error: "Payload too large", details: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// 8) HTTP + WebSocket server
const server = http.createServer(app);
socketServer(server);

server.listen(PORT, () => {
  console.log(``);
  console.log(`######################################################`);
  console.log(`         Server is running at http://localhost:${PORT}`);
  console.log(`######################################################`);
});
