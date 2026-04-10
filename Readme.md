# Gliderport Wind and Image System

A monorepo for the gliderport wind monitoring and camera system. Three tightly integrated projects provide a full-stack solution for weather data logging, live camera feeds, image galleries, and site management at `gliderport.thilenius.com`.

## The Three Projects

### 1. `gliderport` (The Backend Server)
An Express/TypeScript Node.js server (Node 22, ESM) running as the primary production server. It serves the compiled frontend static assets, streams camera video and images from `gliderport/images`, provides REST API endpoints under `/api`, and hosts TypeDoc documentation.

### 2. `gliderportFrontEnd` (The Web Portal)
A React 18/Vite TypeScript single-page application. Renders wind data charts, live HLS camera streams, image galleries, and real-time dashboards. Communicates with the backend for live and historical data via REST and WebSockets. Built output is served by `gliderport`.

### 3. `gp_pi3_server` (The Pi 3 Data Logger)
An Express/TypeScript server (Node 22, ESM) running on a Raspberry Pi 3 on-site. Handles weather station data ingestion, cron-based logging to MySQL and PocketBase, and local sensor interfacing. Receives ESP32 sensor data and IP registration requests.

### 4. `4inDisplay_S3` (The ESP32-S3 Firmware)
PlatformIO/Arduino C++ firmware for an ESP32-S3 with a 4-inch ILI9488 TFT touchscreen display. Built with the `-D GLIDERPORT` compile flag for this project. Responsibilities:

- **Wind measurement** — reads a reed-switch anemometer (speed pin + direction pin) via a 2 ms hardware timer ISR with hysteresis filtering. Converts pulse timing to mph (`speed = 1337.6 / period`) and direction in degrees (`dir = 143 - (360 * dirLow / speedHigh)`).
- **Environmental sensors** — DHT11 (temperature + humidity, sampled every 5 s) and BMP280 (temperature + barometric pressure, I2C).
- **Pi 3 registration** — on boot, sends `GET http://192.168.88.11:8080/espIP/?ip=<ip>` so the Pi 3 always knows the current ESP32 IP.
- **HTTP API** — `GET /data` returns a JSON payload with `bmp` (`t`, `p`, `c`), `dht` (`t`, `h`, `c`), and `wind` (`s`, `a`, `c`) objects.
- **WebSocket** (`/ws`) — streams live sensor variables and accepts commands using the `SocketCode` enum shared with `espserver`.
- **OTA + file management** — full OTA endpoints for firmware, filesystem, and individual file uploads; SD card upload/download/delete.

Firmware source: `C:\Git\web\buddStServer\thilenius.com\Stephen\4inDisplay_S3`

### 5. `espserver` (The ESP32 Onboard Web UI)
A React 18 + TypeScript SPA that is flashed onto the ESP32's LittleFS filesystem and served directly from the device. It connects back to the ESP32 via WebSocket and provides a full device-management interface with 10 tabs:

| Tab | Function |
|---|---|
| Reprogram | OTA firmware / filesystem / individual file upload with MD5 verification |
| Filesystem | Visual flash partition map; LittleFS and SD card file browser / upload / download / delete |
| Logs | Real-time event log pushed by firmware via `SocketCode.EVENT` |
| Other Devices | ESP device registry fetched from Cloudflare Worker (refreshes every 60 s) |
| WiFi & Networks | WiFi status, network scan, saved credential management |
| Miscellaneous | Placeholder |
| Interrupts | Placeholder |
| Pin Values | Real-time 48-pin GPIO grid (green = HIGH, red = LOW, yellow = unknown) |
| Readings | Full `variables` JSON inspector |
| Serial Text | Web serial terminal with dynamic firmware-defined command buttons |

**Deployment:** `go.bat` runs `yarn build` and copies the output into `4inDisplay_S3/data/`, which PlatformIO then uploads to the ESP32's LittleFS partition via `pio run --target uploadfs`.

**Dev proxy:** during development, `yarn start` proxies all non-browser requests to `http://192.168.1.126` (the ESP32's local IP).

Source: `C:\Git\web\buddStServer\thilenius.com\Stephen\espserver`

---

## How They Interact

- **`gliderportFrontEnd` ↔ `gliderport`:** The frontend is compiled and its `dist/` output is served as static files by the backend. WebSocket connections push real-time wind and camera state to the browser.
- **`gp_pi3_server` → `gliderport`:** The Pi 3 server logs sensor data upstream to PocketBase/MySQL, which the backend then exposes through its API for the frontend to chart.
- **ESP32 → `gp_pi3_server`:** On boot the ESP32 registers its IP with the Pi 3 (`GET /espIP/?ip=<ip>`). The Pi 3 then polls the ESP32's `GET /data` endpoint to ingest wind, temperature, humidity, and pressure readings.
- **`espserver` ↔ ESP32:** The ESP32 serves `espserver`'s built SPA from LittleFS. The browser connects back to the same device via WebSocket (`/ws`) for all data and control.
- **Cameras → `gliderport`:** The backend proxies HLS video streams from the fixed-IP Lorex cameras to authenticated browser clients.

---

## Authentication

### Google Login (OAuth2)

Google OAuth client settings are managed in the Google Cloud Console:
- **Console URL:** https://console.cloud.google.com/auth/clients/141154615933-vl6lodfectkpkiv01t5hot709igpqicn.apps.googleusercontent.com?project=gliderport

The Client ID and Client Secret from that page go into PocketBase under:
**Settings → Auth providers → Google**

---

## Gliderport Router (MikroTik)
- Accessed from within the gliderport at `192.168.88.1` (via WinBox)
- Remote access: `ssh -L 90:192.168.88.1:80 pi@104.36.31.118` then browse `localhost:90`
- u: Gabriel / pw: gliderport

---

## Hardware

### Cameras
2× Lorex E841CA-E, installed Sept. 2024. Both route to a waterproof box under the solar panels containing a PoE 5-port switch (power + ethernet from office).

Fixed IPs set in MikroTik DHCP leases:
- `104.36.31.118:8080` (left-looking) → `192.168.88.217` — MAC: `00:1F:54:8B:90:19`
- `104.36.31.118:8081` (right-looking) → `192.168.88.216` — MAC: `00:1F:54:8B:8C:23`
- u: admin / pw: gliderport (both cameras)

To fix IP in MikroTik: IP → DHCP Server → Leases
