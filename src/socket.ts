import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import { WindTableRecord } from "./wind";

const clients = new Map();

const updateClients = () => {
  const t = [...clients.keys()];
  const clientCount = t.length;
  console.log("Number of clients: ", clientCount);
  t.forEach((client) => {});
};

export const transmitNewRecords = (records: WindTableRecord[]) => {
  [...clients.keys()].forEach((client) => {
    client.send(
      JSON.stringify({
        command: "newRecords",
        records: records,
      })
    );
  });
};

export const socketServer = (server: http.Server) => {
  const wss = new WebSocketServer({ server });
  console.log("Starting webSocketServer on port ", process.env.PORT);

  wss.on("connection", (ws, req) => {
    const metadata = {
      id: uuidv4(),
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress?.replace(/.*:/, ""),
      lastMessage: Date.now(),
    };
    clients.set(ws, metadata);
    updateClients();
    //add to hit counter database
    const date = new Date();
    const dateStr =
      date.getUTCFullYear() +
      "-" +
      ("00" + (date.getUTCMonth() + 1)).slice(-2) +
      "-" +
      ("00" + date.getUTCDate()).slice(-2) +
      " " +
      ("00" + date.getUTCHours()).slice(-2) +
      ":" +
      ("00" + date.getUTCMinutes()).slice(-2) +
      ":" +
      ("00" + date.getUTCSeconds()).slice(-2);

    ws.on("close", () => {
      clients.delete(ws);
      updateClients();
    });

    ws.on("message", (messageAsString: string) => {
      const message = JSON.parse(messageAsString);
      const metadata = clients.get(ws);
      message.debug = "";

      if (message.command === "fetchData") {
        message.sender = metadata.id;
        switch (message.subCommand) {
          case "Posts":
            // Posts(message);
            break;
          case "Donors":
            // Donors(message);
            break;
          case "History":
            // History(message);
            break;
          case "Chart":
            // Chart(message);
            break;
          case "Status":
            // Status(message);
            break;
          case "Forecast":
            // Forecast(message);
            break;
          case "ForecastFull":
            // ForecastFull(message);
            break;
          case "Stats":
            // Stats(message);
            break;
          case "Videos":
            // Videos(message);
            break;
          case "Image1":
            // Image1(message);
            break;
          case "BigImage1":
            // BigImage1(message);
            break;
          case "Image2":
            // Image2(message);
            break;
          case "BigImage2":
            // BigImage2(message);
            break;
          case "CurrentData":
            // CurrentData(message);
            break;
          case "Message":
            // Message(message);
            break;
          case "Clients":
            // Clients(message);
            break;
          case "UnloadClients":
            // UnloadClients();
            break;
          default:
            // Unknown(message);
            break;
        }
      } else if (message.command === "pong") {
        metadata.lastMessage = Date.now();
        clients.set(ws, metadata);
        console.log("pong from: ", metadata.id);
      }
    });
  });

  setInterval(() => {
    //check for clients that have not sent a pong in 30 seconds
    [...clients.keys()].forEach((client) => {
      const metadata = clients.get(client);
      if (Date.now() - metadata.lastMessage > 45000) {
        console.log("client timed out: ", metadata.id);
        client.close();
        clients.delete(client);
      }
    });
    console.log("pinging clients");
    const t = [...clients.keys()];
    t.forEach((client) => {
      client.send(JSON.stringify({ command: "ping" }));
    });
  }, 45000);

  function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  console.log("wss up");
};
