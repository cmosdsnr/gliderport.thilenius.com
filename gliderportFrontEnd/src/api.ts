/**
 * @packageDocumentation
 * Central API endpoint registry for the Gliderport frontend.
 * All HTTP endpoints are defined here — no raw URL strings in components.
 *
 * Usage:
 *   import { API } from '@/api';
 *   const data = await fetch(API.getData(24)).then(r => r.json());
 */
import { serverUrl } from '@/components/paths';

const url = (path: string) => new URL(path, serverUrl).toString();

export const API = {
    // ── Sensor data ────────────────────────────────────────────────────────
    /** 24-hour (or N-hour) wind/sensor readings */
    getData: (hours: number) => {
        const u = new URL('/gpapi/getData', serverUrl);
        u.searchParams.set('hours', hours.toString());
        return u.toString();
    },

    // ── Camera / images ────────────────────────────────────────────────────
    /** Last five small (thumbnail) camera images */
    getLastFiveSmallImages: () => url('/gpapi/getLastFiveSmallImages'),

    /** Full-resolution image for a specific camera */
    getLargeImage: (camera: number) => {
        const u = new URL('/gpapi/getLargeImage', serverUrl);
        u.searchParams.set('camera', camera.toString());
        return u.toString();
    },

    /** HLS stream URL for a camera (1 or 2) */
    cameraStream: (camera: 1 | 2) => url(`/stream/camera${camera}/index.m3u8`),

    // ── Forecast / history ─────────────────────────────────────────────────
    /** Today's wind forecast codes */
    getForecastCodes: () => url('/gpapi/getForecastCodes'),

    /** Historical wind-code table (last 8 days) */
    getWindTableCodes: () => url('/gpapi/getWindTableCodes'),

    // ── Image archive / stats ──────────────────────────────────────────────
    /** Directory listing of archived image dates */
    listing: () => url('/gpapi/listing'),

    /** Image count for a date/hour/camera combination */
    imageCount: (date: string, from: number, to: number, camera: number) => {
        const u = new URL('/gpapi/imageCount', serverUrl);
        u.searchParams.set('date', date);
        u.searchParams.set('from', from.toString());
        u.searchParams.set('to', to.toString());
        u.searchParams.set('camera', camera.toString());
        return u.toString();
    },

    /** Image metadata for a given year/month */
    getImageData: (year: number, month: string) => {
        const u = new URL('/gpapi/getImageData', serverUrl);
        u.searchParams.set('year', year.toString());
        u.searchParams.set('month', month);
        return u.toString();
    },

    /** Unpack an archived month of images */
    unpackArchive: (year: number, month: number) => {
        const u = new URL('/gpapi/unpackArchive', serverUrl);
        u.searchParams.set('year', year.toString());
        u.searchParams.set('month', month.toString());
        return u.toString();
    },

    // ── Admin / diagnostics ────────────────────────────────────────────────
    /** System info (records, hours table, sun, code history, add-data) */
    info: () => url('/gpapi/info'),

    /** List all registered API endpoints */
    listEndpoints: () => url('/gpapi/listEndpoints'),

    /** Trigger a test SMS to the given address */
    sendTestSms: (name: string, to: string) => {
        const u = new URL('/gpapi/sendTestSms', serverUrl);
        u.searchParams.set('name', name);
        u.searchParams.set('to', to);
        return u.toString();
    },

    // ── User utilities ─────────────────────────────────────────────────────
    /** Look up a phone carrier by number parts */
    phoneFinder: (area: string, prefix: string, number: string) => {
        const u = new URL('/gpapi/PhoneFinder', serverUrl);
        u.searchParams.set('area', area);
        u.searchParams.set('prefix', prefix);
        u.searchParams.set('number', number);
        return u.toString();
    },

    /** Fetch donor list */
    getDonors: () => url('/gpapi/getDonors'),

    // ── Docs ───────────────────────────────────────────────────────────────
    docs: {
        backend:   () => url('/docs/backend'),
        frontend:  () => url('/docs/frontend'),
        pi3Server: () => url('/docs/pi3_server'),
    },
};
