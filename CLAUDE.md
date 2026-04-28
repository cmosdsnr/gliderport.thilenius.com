# Project Overview

Monorepo for the Gliderport Wind and Image system — web infrastructure for weather monitoring, camera feeds, and site management.

## Projects

- **gliderportFrontEnd/** — React 18 + Vite + TypeScript frontend (wind data, camera feeds, image galleries). Uses MUI, Bootstrap 5, D3, Recharts, HLS.js, Firebase, PocketBase.
- **gliderportApp/** — React Native (Expo SDK 53, Expo Router) mobile app. Mirrors the key frontend features: SVG wind dial, live HLS video, 24-hour sensor charts, wind code history grid, 5-day forecast, and a login-gated dashboard with text-alert settings. Uses `react-native-svg` for charts/dial, `expo-video` for HLS, and PocketBase for auth. Run with `yarn start`.
- **gliderport/** — Express + TypeScript backend (Node 22, ESM). Serves the frontend, images/video, API endpoints, and TypeDoc docs. Main production server.
- **gp_pi3_server/** — Express + TypeScript server (Node 22, ESM) running on a Raspberry Pi 3. Handles weather data logging, MySQL, PocketBase integration, and cron jobs.
- **4inDisplay_S3/** (at `C:\Git\web\buddStServer\thilenius.com\Stephen\4inDisplay_S3`) — PlatformIO/Arduino C++ firmware for an ESP32-S3. Built with the `-D GLIDERPORT` flag for this project. Reads wind speed/direction (reed-switch anemometer via 2 ms hardware timer ISR with hysteresis filtering), temperature/humidity (DHT11), and barometric pressure/temperature (BMP280). Sends its local IP to the Pi 3 on boot via `GET http://192.168.88.11:8080/espIP/?ip=<ip>`. Exposes sensor data over HTTP (`GET /data` → JSON with `bmp`, `dht`, `wind` objects) and WebSocket (`/ws`) using the `SocketCode` enum shared with `espserver`.
- **espserver/** (at `C:\Git\web\buddStServer\thilenius.com\Stephen\espserver`) — React 18 + TypeScript SPA served directly from the ESP32's LittleFS filesystem. Communicates with the ESP32 exclusively over WebSocket (`/ws`). Provides 10 management tabs: OTA firmware/filesystem updates, LittleFS + SD card file management, real-time GPIO monitor (48 pins), WiFi management, serial terminal with dynamic command menus, event log, and sensor readings. Built via `go.bat` which runs `yarn build` and copies output into `4inDisplay_S3/data/` for upload via PlatformIO `uploadfs`.

## Package Manager

All Node.js projects use **Yarn**.

## Common Commands

```bash
# Frontend (gliderportFrontEnd)
cd gliderportFrontEnd && yarn dev    # Dev server
cd gliderportFrontEnd && yarn build  # Production build

# Mobile App (gliderportApp)
cd gliderportApp && yarn start       # Expo dev server (scan QR with Expo Go)
cd gliderportApp && yarn android     # Run on Android device/emulator
cd gliderportApp && yarn ios         # Run on iOS simulator

# Backend (gliderport)
cd gliderport && yarn dev     # Dev with tsup watch
cd gliderport && yarn build   # TypeScript compile

# Pi 3 Server (gp_pi3_server)
cd gp_pi3_server && yarn dev   # Dev with tsup watch
cd gp_pi3_server && yarn build # TypeScript compile
```

## Documentation

All three Node.js projects use **TypeDoc** to generate HTML API docs. Generated docs are copied to `\\buddbliss\passport\gliderport\docs\<project>\` via each project's `docs:generate` script.

### Generating docs

**All 3 projects at once:**
```bat
allDocs.bat
```

**Single project (from any shell):**
```bash
yarn docs:generate
```

## Code Style

- TypeScript for all projects
- ESM modules throughout
- React functional components with hooks

## Environment

- `.env` files in backend projects (do NOT commit these)

## commands and scripts

- prompt window is powershell on windows
- scripts in general should be in powershell
