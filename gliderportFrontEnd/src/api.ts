/**
 * @packageDocumentation
 * Centralised API endpoint factory for the Gliderport frontend.
 *
 * Every property is a function that returns a fully-qualified URL string ready
 * to pass to `fetch`. All paths are resolved against {@link serverUrl} so the
 * correct host is used in every environment. No raw URL strings should appear
 * in components — import from here instead.
 *
 * @example
 * ```ts
 * import { API } from '@/api';
 * const data = await fetch(API.getData(24)).then(r => r.json());
 * ```
 */
import { serverUrl } from '@/components/paths';

/**
 * Constructs an absolute URL by resolving the given path against the configured server base URL.
 * @param path - The API path (e.g. `/gpapi/foo`)
 * @returns Absolute URL string
 */
const url = (path: string) => new URL(path, serverUrl).toString();

/**
 * Centralised API endpoint factory for the Gliderport frontend.
 *
 * Every property is a function that returns a fully-qualified URL string ready
 * to pass to `fetch`. All paths are resolved against {@link serverUrl} so the
 * correct host is used in every environment.
 */
export const API = {

    // -------------------------------------------------------------------------
    // Sensor Data
    // -------------------------------------------------------------------------

    /**
     * Returns wind and sensor readings for the given number of hours of history.
     *
     * `GET /gpapi/getData?hours=<hours>`
     * @param hours - Number of hours of history to fetch (e.g. `24`)
     */
    getData: (hours: number) => {
        const u = new URL('/gpapi/getData', serverUrl);
        u.searchParams.set('hours', hours.toString());
        return u.toString();
    },

    // -------------------------------------------------------------------------
    // Camera / Images
    // -------------------------------------------------------------------------

    /**
     * Returns the last five small (thumbnail) camera images across both cameras.
     *
     * `GET /gpapi/getLastFiveSmallImages`
     */
    getLastFiveSmallImages: () => url('/gpapi/getLastFiveSmallImages'),

    /**
     * Returns the most recent full-resolution image for the specified camera.
     *
     * `GET /gpapi/getLargeImage?camera=<camera>`
     * @param camera - Camera number (1 or 2)
     */
    getLargeImage: (camera: number) => {
        const u = new URL('/gpapi/getLargeImage', serverUrl);
        u.searchParams.set('camera', camera.toString());
        return u.toString();
    },

    /**
     * Returns the HLS playlist URL for a live camera stream.
     *
     * `GET /stream/camera<camera>/index.m3u8`
     * @param camera - Camera number (`1` = left-looking, `2` = right-looking)
     */
    cameraStream: (camera: 1 | 2) => url(`/stream/camera${camera}/index.m3u8`),

    // -------------------------------------------------------------------------
    // Forecast / History
    // -------------------------------------------------------------------------

    /**
     * Returns today's wind forecast codes used to populate the forecast panel.
     *
     * `GET /gpapi/getForecastCodes`
     */
    getForecastCodes: () => url('/gpapi/getForecastCodes'),

    /**
     * Returns the wind-code table for the last 8 days, used to render the
     * historical wind-condition grid.
     *
     * `GET /gpapi/getWindTableCodes`
     */
    getWindTableCodes: () => url('/gpapi/getWindTableCodes'),

    // -------------------------------------------------------------------------
    // Image Archive / Stats
    // -------------------------------------------------------------------------

    /**
     * Returns a directory listing of dates for which archived images exist.
     *
     * `GET /gpapi/listing`
     */
    listing: () => url('/gpapi/listing'),

    /**
     * Returns the image count for a specific date range and camera.
     *
     * `GET /gpapi/imageCount?date=<date>&from=<from>&to=<to>&camera=<camera>`
     * @param date   - Date string in `YYYY-MM-DD` format
     * @param from   - Start hour (0–23)
     * @param to     - End hour (0–23)
     * @param camera - Camera number (1 or 2)
     */
    imageCount: (date: string, from: number, to: number, camera: number) => {
        const u = new URL('/gpapi/imageCount', serverUrl);
        u.searchParams.set('date', date);
        u.searchParams.set('from', from.toString());
        u.searchParams.set('to', to.toString());
        u.searchParams.set('camera', camera.toString());
        return u.toString();
    },

    /**
     * Returns image metadata (counts, thumbnails) for a given year and month.
     *
     * `GET /gpapi/getImageData?year=<year>&month=<month>`
     * @param year  - Four-digit year (e.g. `2024`)
     * @param month - Month name or number string (e.g. `"January"` or `"01"`)
     */
    getImageData: (year: number, month: string) => {
        const u = new URL('/gpapi/getImageData', serverUrl);
        u.searchParams.set('year', year.toString());
        u.searchParams.set('month', month);
        return u.toString();
    },

    /**
     * Triggers server-side unpacking of a compressed image archive for the
     * given year and month, making those images available for browsing.
     *
     * `GET /gpapi/unpackArchive?year=<year>&month=<month>`
     * @param year  - Four-digit year (e.g. `2024`)
     * @param month - Month number (1–12)
     */
    unpackArchive: (year: number, month: number) => {
        const u = new URL('/gpapi/unpackArchive', serverUrl);
        u.searchParams.set('year', year.toString());
        u.searchParams.set('month', month.toString());
        return u.toString();
    },

    // -------------------------------------------------------------------------
    // Admin / Diagnostics
    // -------------------------------------------------------------------------

    /**
     * Returns a system info snapshot: record counts, hours table, sun position,
     * wind code history, and the add-data log.
     *
     * `GET /gpapi/info`
     */
    info: () => url('/gpapi/info'),

    /**
     * Returns a list of all registered API endpoints on the backend server.
     *
     * `GET /gpapi/listEndpoints`
     */
    listEndpoints: () => url('/gpapi/listEndpoints'),

    /**
     * Sends a test SMS message to the given recipient address.
     *
     * `GET /gpapi/sendTestSms?name=<name>&to=<to>`
     * @param name - Display name for the test message
     * @param to   - Destination phone number or carrier email address
     */
    sendTestSms: (name: string, to: string) => {
        const u = new URL('/gpapi/sendTestSms', serverUrl);
        u.searchParams.set('name', name);
        u.searchParams.set('to', to);
        return u.toString();
    },

    // -------------------------------------------------------------------------
    // User Utilities
    // -------------------------------------------------------------------------

    /**
     * Looks up the mobile carrier for a US phone number split into its parts.
     *
     * `GET /gpapi/PhoneFinder?area=<area>&prefix=<prefix>&number=<number>`
     * @param area   - Area code (3 digits)
     * @param prefix - Exchange/prefix (3 digits)
     * @param number - Subscriber number (4 digits)
     */
    phoneFinder: (area: string, prefix: string, number: string) => {
        const u = new URL('/gpapi/PhoneFinder', serverUrl);
        u.searchParams.set('area', area);
        u.searchParams.set('prefix', prefix);
        u.searchParams.set('number', number);
        return u.toString();
    },

    /**
     * Returns the list of site donors.
     *
     * `GET /gpapi/getDonors`
     */
    getDonors: () => url('/gpapi/getDonors'),

    // -------------------------------------------------------------------------
    // Docs
    // -------------------------------------------------------------------------

    /**
     * URLs for the generated TypeDoc documentation sites.
     * Each opens the corresponding project's docs root.
     */
    docs: {
        /** `GET /docs/backend` — Backend server TypeDoc site */
        backend:   () => url('/docs/backend'),
        /** `GET /docs/frontend` — Frontend TypeDoc site */
        frontend:  () => url('/docs/frontend'),
        /** `GET /docs/pi3_server` — Pi 3 server TypeDoc site */
        pi3Server: () => url('/docs/pi3_server'),
        /** `GET /docs/gliderportApp` — Mobile app TypeDoc site */
        mobileApp: () => url('/docs/gliderportApp'),
    },
};
