# Gliderport Frontend

React 18 + TypeScript + Vite single-page application for the Torrey Pines Gliderport site. Provides a real-time dashboard for wind, weather, and camera data with historical visualizations, user authentication, and an admin interface. Built output is served as static files by the `gliderport` Express backend.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 + TypeScript | UI |
| Build | Vite | Dev server, bundling |
| Routing | React Router v7 | Client-side routing |
| UI Components | React Bootstrap 2 + Bootstrap 5 | Layout and UI widgets |
| Material UI v5 | MUI | Select inputs, text fields |
| Charts | Recharts 2 | Line/bar charts (stats, forecast, wind history) |
| Data Viz | D3.js v7 | WindDial SVG, canvas chart utilities |
| Video | Hls.js 1.6 | HLS stream playback (fallback for non-Safari) |
| Auth / DB | PocketBase 0.25 | User auth, real-time status subscriptions |
| Forms | React Hook Form + Yup | Form state and schema validation |
| Date/Time | Luxon 3 | Timezone-aware date handling |
| Icons | FontAwesome 6 | UI icons |
| Package Manager | Yarn 4.3 | |

---

## Routes

| Route | Auth | Description |
|---|---|---|
| `/home` | Public | Main dashboard (wind, cameras, charts, history, status) |
| `/forecast` | Public | 5-day OpenWeather forecast with interactive charts |
| `/contact` | Public | Contact form |
| `/diagnostics` | Public | System health/diagnostics |
| `/stats` | Private | Site hits, image archive, change log, useful links |
| `/stats/images` | Private | Image/video archive browser |
| `/stats/hits` | Private | Visitor count charts |
| `/stats/changes` | Private | Site change log |
| `/stats/links` | Private | Curated external resources |
| `/dashboard` | Private | User profile, phone number, text alert settings |
| `/equipment` | Private | Equipment database |
| `/blog` | Private | Message board |
| `/contribute` | Private | Contribution/support page |
| `/update-profile` | Private | Profile update form |
| `/logout` | Private | Log out |
| `/admin/listEndpoints` | Admin | API endpoint listing |
| `/admin/host` | Admin | Server host info |
| `/admin/information` | Admin | System info |
| `/admin/debug` | Admin | Debug console |
| `/admin/archive` | Admin | Archive statistics |
| `/admin/messages` | Admin | WebSocket message logger |
| `/admin/filter` | Admin | Frequency response visualizer for data filters |

---

## Architecture

### Context Providers (outermost → innermost)

```
AuthProvider          – user auth, profile, PocketBase
  MessageProvider     – WebSocket message log (debug)
    DataProvider      – sensor readings, camera images, WebSocket
      ModalProvider   – global modal state (Login, SignUp, etc.)
        StatusCollectionProvider – sun times, site messages, online status
```

#### `AuthContext`
PocketBase-backed authentication. State: `currentUser`, `avatar`, `settings`. Functions: `login()`, `googleLogin()`, `logout()`, `signUp()`, `changePassword()`, `resetPassword()`, `changeEmail()`, `changeAvatar()`, `updateUser()`, `updateUserSettings()`.

#### `DataContext`
WebSocket connection + REST data. State:
- `readings[]` — 24h sensor history (fetched once on mount via `GET /gpapi/getData?hours=24`)
- `cameraImages` — latest 5 images per camera (`GET /gpapi/getLastFiveSmallImages`)
- `posts[]`, `donors[]`, `clients[]` — fetched on demand via WebSocket `fetchData` command
- `offline`, `lastCheck`, `numberConnections` — connection state

Real-time updates arrive via WebSocket commands: `update` (latest readings), `newImage` (base64 image push), `newRecords`, `fetchData`.

#### `FilterContext`
Butterworth low-pass filter applied to chart data. Functions: `filterData(readings, width)`, `fillData(readings, width, label)`, `fillForFilter(readings, width, label)`. Used inside `Charts` to smooth sensor noise before rendering.

#### `StatusCollectionContext`
PocketBase real-time subscription to the `status` collection. State: `sunrise`, `sunset`, `sleeping`, `lastImage`, `siteMessages[]`, `forecast`, `siteHits`, `online`. Updates automatically on any record change.

---

## Data Flow

```
ESP32 → gp_pi3_server → MySQL/PocketBase
                      ↓
               gliderport (Express backend)
               ├── REST:  /gpapi/*
               └── WS:    wss://gliderport.thilenius.com
                              ↓
                       DataContext (React)
                       ├── readings[]   → Charts, CurrentTable, WindDial
                       ├── cameraImages → UpdatingImage
                       └── WS push      → UpdatingImage (live), CurrentTable (live)

PocketBase (gpdata.thilenius.com)
└── status collection → StatusCollectionContext
    ├── sun times     → CurrentTable, UpdatingImage
    ├── forecast      → Today, History
    └── siteHits      → StatsHits
```

### WebSocket Message Format

```ts
{
  command: 'fetchData' | 'newRecords' | 'newImage' | 'update',
  subCommand: 'Posts' | 'Donors' | 'History' | 'Status' | 'Clients' | 'CurrentData',
  data: { ... },
  error: null | string
}
```

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/gpapi/getData?hours=N` | Sensor readings for the last N hours |
| GET | `/gpapi/getForecastCodes` | 8-day history + 2-day forecast wind codes |
| GET | `/gpapi/getLastFiveSmallImages` | Latest 5 small images per camera |

---

## Wind Code System

Defined in `src/components/Globals.tsx`. Each hourly slot is assigned a numeric code:

| Code | Label | Color |
|---|---|---|
| 0 | It Is Dark | Dark gray |
| 1 | Sled Ride, Bad Angle | Pale yellow |
| 2 | Sled Ride, Poor Angle | Tan |
| 3 | Sled Ride | White |
| 4 | Bad Angle | Light green |
| 5 | Poor Angle | Medium green |
| 6 | Good | Bright green |
| 7 | Excellent | Cyan |
| 8 | Use Speed Bar! | Blue |
| 9 | Too Windy | Light red |
| 10 | No Data | Red |

Used in `History` (line and clock canvas views), `Today` (hourly forecast table), and the `KeyCanvas` legend.

---

## Key Components

### Home page
- **`WindDial`** — D3 SVG compass rose with concentric speed rings, directional arrows, zoom via mouse wheel.
- **`UpdatingVideo`** — HLS live stream with camera selector and offline detection. Uses native HLS on Safari, Hls.js elsewhere.
- **`UpdatingImage`** — Still image slideshow from both cameras; shows sunrise countdown when sleeping.
- **`CurrentTable`** — Latest speed, direction, humidity, pressure, temperature, and sun times.
- **`Today`** — Hourly wind code forecast for today.
- **`KoFiWidget`** — Floating Ko-fi donation button.

### Charts tab
- **`WindChart`** — Recharts line chart for wind speed and direction with Butterworth-filtered overlay.
- **`SimpleChart`** — Recharts line chart for temperature, pressure, or humidity.
- **`FilterContext`** — Applied inside `Charts` to smooth data before rendering.

### History tab
- **`LineCanvas`** — Canvas-based timeseries of hourly wind codes (8 days + 2-day forecast).
- **`CircleCanvas`** — Canvas-based clock/radial view of the same data.
- **`KeyCanvas`** — Color legend for wind codes.

### Stats
- **`StatsHits`** — Daily/weekly/monthly/total visitor counts with Recharts bar charts (total and unique IPs).
- **`StatsImage`** — Date + camera picker, hour range filter, image viewer with modal lightbox (`react-viewer`). Supports download and video playback.
- **`StatsChangeLog`** — Site update history with hover detail.
- **`StatsUsefulLinks`** — Curated external resources.

### Modals
Login, SignUp, ForgotPassword, ChangeEmail, ChangeAvatar — triggered via `ModalContext.openModal()`.

---

## Custom Hooks

| Hook | Purpose |
|---|---|
| `useAuth()` | Access `AuthContext` |
| `useData()` | Access `DataContext` |
| `useFilter()` | Access `FilterContext` (filter/fill functions) |
| `useStatusCollection()` | Access `StatusCollectionContext` |
| `useModal()` | Open/close modals |
| `useInterval(fn, ms)` | `setInterval` with cleanup |
| `useLocalStorageState(key, initial)` | Persisted client state |
| `useWindow()` | Current window width |
| `useContainerSize()` | Measure DOM container dimensions for responsive canvases |
| `useLogin()` / `useSignUp()` / `useChangeEmail()` | Form logic hooks |

---

## Environment Variables

Defined in `.env`:

```env
VITE_PAGE_NAME='Live Gliderport'
VITE_SITE_VERSION='1.0.0'

# Primary URLs
VITE_SERVER_URL=https://gliderport.thilenius.com
VITE_SOCKET_SERVER_URL=wss://gliderport.thilenius.com
VITE_PB_URL=https://gpdata.thilenius.com

# Cloudflare Worker reverse proxy fallbacks
VITE_PROXY_SERVER_URL=https://gliderport.stephen-c19.workers.dev
VITE_PROXY_SOCKET_SERVER_URL=wss://gliderport.stephen-c19.workers.dev
VITE_PROXY_PB_URL=https://gpdata.stephen-c19.workers.dev
```

`src/components/paths.tsx` selects between primary and proxy URLs based on the current page origin — if the request is not coming from the primary host, the Cloudflare Worker proxy is used instead.

---

## Development

```bash
yarn          # install dependencies
yarn dev      # Vite dev server (localhost:5173)
yarn build    # production build → dist/
yarn preview  # serve production build locally
```

### Vite path aliases

```
@            → src/
components   → src/components/
contexts     → src/contexts/
modals       → src/modals/
images       → src/images/
hooks        → src/hooks/
css          → src/css/
```

---

## Deployment

```bash
go.bat [commit message]   # build → copy to server → git commit
```

- Runs `yarn build`
- Copies `dist/*` to `\\buddbliss\passport\gliderport\frontend\`
- Stages all changes and commits with the provided message (default: `wip`)

The backend Express server (`gliderport/`) serves the frontend from that network path. Hosted on Dokku on Buddbliss.

---

## Documentation

```bash
yarn docs:generate   # generate TypeDoc → copy to \\192.168.0.5\passport\gliderport\docs\frontend\
yarn docs:serve      # generate + serve locally
```

---

## Cloudflare Reverse Proxy

A Cloudflare Worker exposes `gliderport.thilenius.com` at `gliderport.stephen-c19.workers.dev`. Manage via [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages (login: stephen@thilenius.com).
