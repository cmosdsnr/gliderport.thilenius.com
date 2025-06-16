# Gliderport Frontend

## Overview

This is the React-based frontend for the Torrey Pines Gliderport site. It provides a real-time dashboard for wind, weather, and camera data, as well as historical and forecast visualizations. The frontend is designed for both desktop and mobile users and integrates with a PocketBase backend and a Node.js/Express API server.

### Key Features

- **Live Wind Visualization:**  
  Interactive wind dial and charts display current wind speed, direction, and recent history using D3 and Recharts.

- **Camera Feeds & Images:**  
  Live video streams and image slideshows from two cameras, with offline/sleeping detection and sunrise countdowns.

- **Forecast & History:**  
  Fetches and displays 8 days of wind code history and a 2-day forecast, with both line and clock-style visualizations.

- **Statistics Dashboard:**  
  Responsive two-column layout showing:

  - **Site Hits:** Daily, weekly, monthly, and total visit counts (including unique IPs), with a toggleable bar chart (day/week/month, total/unique) using recharts.
  - 
  - **Image & Video Archive:** Date and camera picker, hour range selection, image/video details, and a modal image viewer with slider and navigation. Supports image download and video playback.
  - 
  - **Change Log:** List of site changes and updates, with hover to view details for each date.
  - 
  - **Useful Links:** Curated list of external weather, gliderport, and tide resources.

- **User Authentication:**  
  Supports login, registration, and profile management via PocketBase.

- **Responsive Design:**  
  Uses React Bootstrap grid and custom hooks for responsive layouts and dynamic resizing.

- **Context-Driven State:**  
  Uses React Context for authentication, data, filtering, and status, enabling real-time updates and modular code.

- **Custom Hooks & Utilities:**  
  Includes hooks for container sizing, intervals, local storage state, and window size.

- **Donation Integration:**  
  Ko-fi widget for supporting the site.

### Main Components

- `Home`: Main landing page with wind dial, video, current readings, forecast, and tabbed charts/history/status.
- `Charts`: Responsive D3/Recharts charts for wind, temperature, pressure, humidity.
- `History`: 8-day wind code history and 2-day forecast, with both line and clock views.
- `Stats`: Statistics dashboard for hits, images, and logs.
- `UpdatingVideo` / `UpdatingImage`: Live video and image components with camera switching and zoom.
- `Today`: Table of today's wind forecast codes.
- `CurrentTable`: Table of latest sensor readings and sun times.
- `WindDial`: D3-based wind visualization.
- `KoFiWidget`: Floating donation button.

### Architecture

- **Contexts:**  
  - `AuthContext`: User authentication and profile.
  - `DataContext`: Sensor readings, camera images, and websocket data.
  - `FilterContext`: Data filtering and smoothing for charts.
  - `StatusCollection`: Site-wide status and messages.

- **Hooks:**  
  - `useInterval`, `useContainerSize`, `useLocalStorageState`, `useWindow`: For timers, sizing, and state persistence.

- **API Integration:**  
  - Communicates with the backend via REST endpoints (e.g., `/gpapi/getData`, `/gpapi/getForecastCodes`) and WebSocket for real-time updates.

- **Styling:**  
  - Uses Bootstrap, custom CSS, and D3 for visualizations.

---

## served on 'gliderport' Dokku server (on Buddbliss)

- uses Vite frontend
- uses pocketBase Authentication & database
- webSocket to wss://gliderport.thilenius.com

## deployment

yarn build will compile to dist (c:\Git\Web)
dist has a 'junction' to:
New-Item -ItemType Junction -Path "C:\Git\web\buddStServer\thilenius.com\gliderport\gliderportFrontEnd\dist" -Target "C:\Git\web\buddStServer\thilenius.com\gliderport\gliderport\gp_dist"

run yarn docs:generate too if needed

## documentation

docs has a junction to:
New-Item -ItemType Junction -Path "C:\Git\web\buddStServer\thilenius.com\gliderport\gliderportFrontEnd\docs" -Target "C:\Git\web\buddStServer\thilenius.com\gliderport\gliderport\docs_frontend"

yarn docs:generate (or docs:serve to serve) will create teh docs, which will be deployed on the next gliderport push

### Forwarded/Reverse proxy at cloudflare

worker on Cloudflare is a reverse proxy, exposing gliderport.thilenius.com on gliderport.stephen-c19.workers.dev

See [Cloudflare Dashboard](https://dash.cloudflare.com)
login stephen@thilenius.com
go to "workers & Pages"

