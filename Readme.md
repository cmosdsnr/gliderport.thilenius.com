# Gliderport server (backend)

## Overview

The Gliderport server is a Node.js/Express application that manages real-time weather, wind, and image data for the Torrey Pines Gliderport. It integrates with a PocketBase backend for persistent storage and provides a comprehensive API for frontend and external tools. The system includes:

- **Wind Data Collection & Archiving:** Collects wind sensor data, stores it in PocketBase, and archives old records in a compact binary format.
- **Image & Video Management:** Scans, aggregates, and serves images and video files from disk, synchronizing metadata with PocketBase.
- **Forecast Integration:** Fetches and processes 5-day weather forecasts from OpenWeatherMap, computes wind condition codes, and exposes forecast endpoints.
- **Sunrise/Sunset Calculation:** Computes sun times for La Jolla, CA, and updates PocketBase for use in wind code calculations and display.
- **Text Alert System:** Sends wind alerts via email-to-SMS gateways based on user-configured thresholds, with real-time user sync and daily reset.
- **Hit Tracking & Analytics:** Tracks site hits, aggregates them into daily/weekly/monthly summaries, and exposes analytics endpoints.
- **WebSocket Server:** Provides real-time updates to connected clients for new wind data and images.
- **API Routing:** Modular Express routers expose endpoints for all major features, including diagnostics, info, and system status.
- **Static Asset Serving:** Serves images, video segments, documentation, and the frontend SPA from disk.
- **Scheduled Jobs:** Uses cron to automate archival, sun data updates, image scanning, and alert resets.
- **Comprehensive Logging:** Logs key events and errors to disk and in-memory logs for diagnostics.

The server is designed for reliability, modularity, and ease of integration with both frontend and external systems.

dokku storage:mount gliderport /media/cmosdsnr/passport/gliderport/video:/app/video  
dokku storage:report gliderport  
dokku ps:restart gliderport  

## Routes

| file            | type | URL                    | description                                                                |
| --------------- | ---- | ---------------------- | -------------------------------------------------------------------------- |
| archive         | GET  | runScheduledArchive    | Manually triggers the archival process.                                    |
| codes           | GET  | getWindTableCodes      | Returns the entire `codes` array.                                          |
| donors          | GET  | getDonors              | Retrieve all donor names from PocketBase.                                  |
| hitCounter      | GET  | recreateSiteHits       | Rebuilds the `siteHits` record from all "hitCounter" records.              |
| hitCounter      | GET  | hitsReport             | Returns the current aggregation summary (month/week/day counts and dates). |
| ImageFiles      | GET  | scanLatestDirectory    | Triggers a scan of the latest directory.                                   |
| ImageFiles      | GET  | scanEntireDirectory    | Scans the entire directory structure.                                      |
| ImageFiles      | GET  | createListingRecord    | Creates or updates the listing record in PocketBase.                       |
| ImageFiles      | GET  | listing                | Retrieves the current listing record from PocketBase.                      |
| ImageFiles      | GET  | imageCount             | Returns image count for a specified date and time range.                   |
| ImageFiles      | GET  | getImageData           | Retrieves image data for a specific year and month from PocketBase.        |
| ImageFiles      | GET  | latestImages           | Returns the latest images for front-end display.                           |
| ImageFiles      | GET  | getLargeImage          | Returns the last big image for a specified camera.                         |
| ImageFiles      | GET  | getLastFiveSmallImages | Returns the last five small images for each camera.                        |
| ImageFiles      | GET  | gotoSleep              | Sets the server’s state to “sleeping” in PocketBase.                       |
| ImageFiles      | GET  | wakeUp                 | Sets the server’s state to “awake” in PocketBase.                          |
| ImageFiles      | POST | updateImage            | Updates an image record with base64 data from the client.                  |
| ImageFiles      | POST | updateLog              | (Debug) Receives log updates from the client.                              |
| sendTextMessage | GET  | PhoneFinder            | Looks up phone carrier info by query params.                               |
| sendTextMessage | GET  | sendTestSms            | Sends a test SMS alert to the given `to` and `name`.                       |
| sendTextMessage | GET  | testWindSpeeds         | Returns current wind average data.                                         |
| sun             | GET  | UpdateSun              | Manually triggers updateSunData() and returns the latest sunData.          |
| wind            | GET  | getData                | Raw windTable records for last H hours.                                    |
| wind            | GET  | averages               | Fixed-interval aggregates.                                                 |
| wind            | GET  | getLastEntry           | Timestamp of most recent record.                                           |
| wind            | GET  | fetchNewWind           | Triggers UpdateWindTable.                                                  |
| wind            | GET  | addWindFromSQL         | (admin) migrates SQL records into PB.                                      |
| wind            | GET  | fixSaveErrors          | Corrects mis-saved fields in PB.                                           |
| wind            | POST | updateImage            | Updates an image record with base64 data from the client.                  |
| wind            | POST | updateLog              | (Debug) Receives log updates from the client.                              |
| info            | GET  | info                   | Retrieves and returns the assembled information from `info()`.             |
| listEndpoints   | GET  | listEndpoints          | JSON array of `{ method, path }`                                           |
| openWeather     | GET  | getForecast            | Latest fetched weather forecast JSON                                       |
| openWeather     | GET  | getForecastCodes       | Computed wind condition codes for two days                                 |
| streams         | GET  | stats                  | Returns current streaming metrics.                                         |

## Embedding PocketBase (`gpdata`) Under Gliderport

This server uses an embedded PocketBase database deployed to the gpdata app. It is also visible at gliderport.thilenius.com/_ and gliderport.thilenius.com/api

This document outlines the steps required to serve your PocketBase app (`gpdata`) at `pbdata.thilenius.com` under the same origin as your Gliderport frontend (`gliderport.thilenius.com`). After completion, all API calls (`/api/...`) and dashboard routes (`/_/...`) will be accessible through the Gliderport hostname, avoiding CORS issues.

---

### 1. Bind PocketBase to localhost:5000

On your Dokku host, configure the `gpdata` app so that its Docker container publishes port 5000 to the host.

```bash
# Remove any previous run‐options (cleanup)
dokku docker-options:clear gpdata run

# Add the port publish flag under deploy context (so the web process picks it up)
dokku docker-options:add   gpdata deploy "-p 5000:5000"

# Rebuild (recreate) the container so the new flag takes effect
dokku ps:rebuild           gpdata
```

Verify that PocketBase is now listening on host port 5000:

```bash
sudo ss -tln | grep :5000
# expected output: LISTEN   0    4096    0.0.0.0:5000
```

---

### 2. Create Nginx Snippet in the Gliderport App

In the `gliderport` Dokku app, add an Nginx snippet to forward `/api/...` and `/_/...` paths to the local PocketBase instance.

```bash
sudo tee /home/dokku/gliderport/nginx.conf.d/pb-api.conf << 'EOF'
# Proxy all PocketBase API and dashboard routes to localhost:5000
location ~* ^/(api|_)(?:/|$) {
    proxy_pass         http://127.0.0.1:5000;
    proxy_http_version 1.1;

    # Tell PocketBase the correct Host header
    proxy_set_header   Host               gpdata.thilenius.com;
    proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto  $scheme;

    # Support WebSocket upgrades
    proxy_set_header   Upgrade            $http_upgrade;
    proxy_set_header   Connection         "upgrade";
}
EOF
```

---

### 3. Rebuild and Restart the Gliderport App

Regenerate the Nginx configuration and restart the `gliderport` container:

```bash
dokku nginx:build-config gliderport
dokku ps:restart      gliderport
```

---

### 4. Verify Functionality

* Visit **PocketBase Dashboard** via Gliderport:

  ```
  https://gliderport.thilenius.com/_/
  ```

* Call the **PocketBase API** through Gliderport:

  ```bash
  curl -I https://gliderport.thilenius.com/api/_/collections
  ```

Both requests should return the expected PocketBase UI and JSON responses, respectively, with no CORS or routing errors.

---

## deployment

This site can be deployed with the go.bat command. This will not regenerate teh front end, just deploy as is.
This site can be deployed with the go.bat command in ../gliderportFrontEnd which will deploy both the front and back end


