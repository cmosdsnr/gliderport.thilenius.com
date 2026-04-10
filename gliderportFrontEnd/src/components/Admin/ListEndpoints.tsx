/**
 * @packageDocumentation
 *
 * Displays all registered backend API endpoints in the same style as the
 * TypeDoc center-column parameter list. Endpoints are fetched live from
 * `/gpapi/listEndpoints`, enriched with metadata from a local map, and
 * grouped by feature area.
 *
 * Each entry shows:
 * - Function signature (name + typed params, matching `api.ts` where applicable)
 * - One-sentence description from the TypeDoc comment
 * - Full HTTP method + path with `<param>` placeholders
 */
import React, { useEffect, useState } from 'react';
import { API } from '@/api';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single endpoint record returned by the backend. */
interface Endpoint {
    /** HTTP method (e.g. `"GET"`, `"POST"`). */
    method: string;
    /** Fully-qualified URL path (e.g. `"/gpapi/info"`). */
    path: string;
}

/** Static metadata attached to each known endpoint. */
interface EndpointMeta {
    /** Feature-area group heading. */
    group: string;
    /**
     * TypeScript-style call signature shown as the heading, mirroring `api.ts`
     * for frontend-used endpoints (e.g. `"getData: (hours: number) => string"`).
     */
    signature: string;
    /** One-sentence description taken directly from the TypeDoc comment. */
    description: string;
    /**
     * Full HTTP method + path with `<param>` placeholders shown in a code block
     * (e.g. `"GET /gpapi/sendTestSms?name=<name>&to=<to>"`).
     */
    pathTemplate: string;
}

// ─── Metadata map ─────────────────────────────────────────────────────────────

/**
 * Maps every known backend path to its display metadata.
 * Descriptions are taken directly from TypeDoc comments in the source files.
 * Signatures mirror `api.ts` for frontend-used endpoints.
 */
const META: Record<string, EndpointMeta> = {

    // ── Wind Data ─────────────────────────────────────────────────────────────
    '/gpapi/getData': {
        group: 'Wind Data',
        signature: 'getData: (hours: number) => string',
        description: 'Returns wind and sensor readings for the given number of hours of history.',
        pathTemplate: 'GET /gpapi/getData?hours=<hours>',
    },
    '/gpapi/averages': {
        group: 'Wind Data',
        signature: 'averages: (hours: number, duration: 5 | 15 | 30 | 60) => string',
        description: 'Returns averaged wind speed and direction over a specified window.',
        pathTemplate: 'GET /gpapi/averages?hours=<hours>&duration=<5|15|30|60>',
    },
    '/gpapi/getLastEntry': {
        group: 'Wind Data',
        signature: 'getLastEntry: () => string',
        description: 'Returns the timestamp and formatted date-time of the most recent wind sensor record.',
        pathTemplate: 'GET /gpapi/getLastEntry',
    },
    '/gpapi/fetchNewWind': {
        group: 'Wind Data',
        signature: 'fetchNewWind: () => string',
        description: 'Triggers UpdateWindTable() to immediately poll the ESP32 for new wind data.',
        pathTemplate: 'GET /gpapi/fetchNewWind',
    },
    '/gpapi/addWindFromSQL': {
        group: 'Wind Data',
        signature: 'addWindFromSQL: () => string',
        description: 'Backfills wind records from the MySQL database into PocketBase (currently returns a not-implemented status).',
        pathTemplate: 'GET /gpapi/addWindFromSQL',
    },
    '/gpapi/getWindTableCodes': {
        group: 'Wind Data',
        signature: 'getWindTableCodes: () => string',
        description: 'Returns the wind-code table for the last 8 days, used to render the historical wind-condition grid.',
        pathTemplate: 'GET /gpapi/getWindTableCodes',
    },

    // ── Forecast ──────────────────────────────────────────────────────────────
    '/gpapi/getForecastCodes': {
        group: 'Forecast',
        signature: 'getForecastCodes: () => string',
        description: "Returns today's wind forecast codes used to populate the forecast panel.",
        pathTemplate: 'GET /gpapi/getForecastCodes',
    },
    '/gpapi/getForecast': {
        group: 'Forecast',
        signature: 'getForecast: () => string',
        description: 'Returns the latest fetched weather forecast JSON object.',
        pathTemplate: 'GET /gpapi/getForecast',
    },

    // ── Sun ───────────────────────────────────────────────────────────────────
    '/gpapi/UpdateSun': {
        group: 'Sun',
        signature: 'UpdateSun: () => string',
        description: 'Triggers a sun data recalculation and returns the current sunData JSON.',
        pathTemplate: 'GET /gpapi/UpdateSun',
    },

    // ── Images ────────────────────────────────────────────────────────────────
    '/gpapi/listing': {
        group: 'Images',
        signature: 'listing: () => string',
        description: 'Returns a directory listing of dates for which archived images exist.',
        pathTemplate: 'GET /gpapi/listing',
    },
    '/gpapi/imageCount': {
        group: 'Images',
        signature: 'imageCount: (date: string, from: number, to: number, camera: number) => string',
        description: 'Returns the image count for a specific date range and camera.',
        pathTemplate: 'GET /gpapi/imageCount?date=<date>&from=<from>&to=<to>&camera=<camera>',
    },
    '/gpapi/getImageData': {
        group: 'Images',
        signature: 'getImageData: (year: number, month: string) => string',
        description: 'Returns image metadata (counts, thumbnails) for a given year and month.',
        pathTemplate: 'GET /gpapi/getImageData?year=<year>&month=<month>',
    },
    '/gpapi/getLargeImage': {
        group: 'Images',
        signature: 'getLargeImage: (camera: number) => string',
        description: 'Returns the last big image for the specified camera.',
        pathTemplate: 'GET /gpapi/getLargeImage?camera=<camera>',
    },
    '/gpapi/getLastFiveSmallImages': {
        group: 'Images',
        signature: 'getLastFiveSmallImages: () => string',
        description: 'Returns the last five small (thumbnail) camera images across both cameras.',
        pathTemplate: 'GET /gpapi/getLastFiveSmallImages',
    },
    '/gpapi/latestImages': {
        group: 'Images',
        signature: 'latestImages: () => string',
        description: 'Called by the front end on initial load. Returns an empty array (hit counter side-effect only).',
        pathTemplate: 'GET /gpapi/latestImages',
    },

    // ── Images (Admin) ────────────────────────────────────────────────────────
    '/gpapi/scanLatestDirectory': {
        group: 'Images (Admin)',
        signature: 'scanLatestDirectory: () => string',
        description: 'Scans the latest image directory and updates PocketBase metadata.',
        pathTemplate: 'GET /gpapi/scanLatestDirectory',
    },
    '/gpapi/scanEntireDirectory': {
        group: 'Images (Admin)',
        signature: 'scanEntireDirectory: () => string',
        description: 'Scans all image directories and rebuilds PocketBase metadata from scratch.',
        pathTemplate: 'GET /gpapi/scanEntireDirectory',
    },
    '/gpapi/createListingRecord': {
        group: 'Images (Admin)',
        signature: 'createListingRecord: () => string',
        description: 'Creates or refreshes the listing record in PocketBase.',
        pathTemplate: 'GET /gpapi/createListingRecord',
    },
    '/gpapi/updateImage': {
        group: 'Images (Admin)',
        signature: 'updateImage: (A: string, size: 1 | 2, camera: 1 | 2) => string',
        description: 'Updates an image record for the given camera and size. Body: { A: base64, size: 1|2, camera: 1|2 }.',
        pathTemplate: 'POST /gpapi/updateImage',
    },
    '/gpapi/updateLog': {
        group: 'Images (Admin)',
        signature: 'updateLog: (body: object) => string',
        description: 'Receives a log entry from the Pi 3 camera system and echoes it back.',
        pathTemplate: 'POST /gpapi/updateLog',
    },
    '/gpapi/gotoSleep': {
        group: 'Images (Admin)',
        signature: 'gotoSleep: () => string',
        description: 'Sets the server state to "sleeping" in PocketBase under the images status record.',
        pathTemplate: 'GET /gpapi/gotoSleep',
    },
    '/gpapi/wakeUp': {
        group: 'Images (Admin)',
        signature: 'wakeUp: () => string',
        description: 'Sets the server state to "awake" in PocketBase under the images status record.',
        pathTemplate: 'GET /gpapi/wakeUp',
    },

    // ── Archive ───────────────────────────────────────────────────────────────
    '/gpapi/unpackArchive': {
        group: 'Archive',
        signature: 'unpackArchive: (year: number, month: number) => string',
        description: 'Triggers server-side unpacking of a compressed image archive for the given year and month, making those images available for browsing.',
        pathTemplate: 'GET /gpapi/unpackArchive?year=<year>&month=<month>',
    },
    '/gpapi/runScheduledArchive': {
        group: 'Archive',
        signature: 'runScheduledArchive: () => string',
        description: 'Manually triggers the monthly archival process.',
        pathTemplate: 'GET /gpapi/runScheduledArchive',
    },

    // ── Diagnostics ───────────────────────────────────────────────────────────
    '/gpapi/info': {
        group: 'Diagnostics',
        signature: 'info: () => string',
        description: 'Returns a system info snapshot: record counts, hours table, sun position, wind code history, and the add-data log.',
        pathTemplate: 'GET /gpapi/info',
    },
    '/gpapi/listEndpoints': {
        group: 'Diagnostics',
        signature: 'listEndpoints: () => string',
        description: 'Returns a list of all registered API endpoints on the backend server.',
        pathTemplate: 'GET /gpapi/listEndpoints',
    },
    '/gpapi/debug': {
        group: 'Diagnostics',
        signature: 'debug: () => string',
        description: 'Fetches a snapshot of all key status records from PocketBase (siteMessage, siteHits, fullForecast, debug, images, online, forecast, sun, lastWind).',
        pathTemplate: 'GET /gpapi/debug',
    },
    '/gpapi/test': {
        group: 'Diagnostics',
        signature: 'test: () => string',
        description: 'Health-check endpoint. Returns a plain-text greeting that confirms the Express + TypeScript server is running and reachable.',
        pathTemplate: 'GET /gpapi/test',
    },

    // ── Streaming ─────────────────────────────────────────────────────────────
    '/gpapi/stats': {
        group: 'Streaming',
        signature: 'stats: () => string',
        description: 'Returns current in-memory streaming statistics.',
        pathTemplate: 'GET /gpapi/stats',
    },

    // ── Notifications ─────────────────────────────────────────────────────────
    '/gpapi/sendTestSms': {
        group: 'Notifications',
        signature: 'sendTestSms: (name: string, to: string) => string',
        description: 'Sends a test SMS message to the given recipient address.',
        pathTemplate: 'GET /gpapi/sendTestSms?name=<name>&to=<to>',
    },
    '/gpapi/testWindSpeeds': {
        group: 'Notifications',
        signature: 'testWindSpeeds: () => string',
        description: 'Returns the current wind averages for durations [0, 5, 15] minutes.',
        pathTemplate: 'GET /gpapi/testWindSpeeds',
    },
    '/gpapi/PhoneFinder': {
        group: 'Notifications',
        signature: 'phoneFinder: (area: string, prefix: string, number: string) => string',
        description: 'Looks up the mobile carrier for a US phone number split into its parts.',
        pathTemplate: 'GET /gpapi/PhoneFinder?area=<area>&prefix=<prefix>&number=<number>',
    },

    // ── Analytics ─────────────────────────────────────────────────────────────
    '/gpapi/recreateSiteHits': {
        group: 'Analytics',
        signature: 'recreateSiteHits: () => string',
        description: 'Manually triggers recreateSiteHits() to rebuild the entire siteHits record in PocketBase.',
        pathTemplate: 'GET /gpapi/recreateSiteHits',
    },
    '/gpapi/hitsReport': {
        group: 'Analytics',
        signature: 'hitsReport: () => string',
        description: 'Returns a summary of the current hit aggregates (monthly, weekly, daily) along with the associated logs.',
        pathTemplate: 'GET /gpapi/hitsReport',
    },

    // ── General ───────────────────────────────────────────────────────────────
    '/gpapi/getDonors': {
        group: 'General',
        signature: 'getDonors: () => string',
        description: 'Returns the list of site donors.',
        pathTemplate: 'GET /gpapi/getDonors',
    },

    // ── Hardware ──────────────────────────────────────────────────────────────
    '/gpapi/setIP': {
        group: 'Hardware',
        signature: 'setIP: () => string',
        description: 'Receives and validates the caller IP from the ESP32, health-checks port 8081, and stores the IP in PocketBase.',
        pathTemplate: 'GET /gpapi/setIP',
    },
};

// ─── Method badge ─────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
    GET: '#28a745',
    POST: '#0d6efd',
    PUT: '#fd7e14',
    PATCH: '#6f42c1',
    DELETE: '#dc3545',
};

/** Renders a small colored HTTP method badge. */
function MethodBadge({ method }: { method: string }) {
    const color = METHOD_COLORS[method.toUpperCase()] ?? '#6c757d';
    return (
        <span style={{
            display: 'inline-block',
            padding: '1px 7px',
            borderRadius: 4,
            fontSize: '0.7rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            color: '#fff',
            backgroundColor: color,
            marginRight: 8,
            verticalAlign: 'middle',
        }}>
            {method.toUpperCase()}
        </span>
    );
}

// ─── Single endpoint row ──────────────────────────────────────────────────────

/** Renders one endpoint entry in TypeDoc parameter-list style. */
function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
    // Strip stray leading ^ that Express regex parsing leaves on mount paths
    const normalizedPath = endpoint.path.replace(/^\^/, '');
    const meta = META[normalizedPath];
    const name = normalizedPath.split('/').filter(Boolean).pop() ?? normalizedPath;

    return (
        <li style={{
            padding: '12px 0',
            borderTop: '1px solid var(--bs-border-color, #dee2e6)',
            listStyle: 'none',
        }}>
            {/* Signature heading */}
            <h5 style={{ marginBottom: 4, fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600 }}>
                {meta ? meta.signature : (
                    <><MethodBadge method={endpoint.method} /> {name}</>
                )}
            </h5>

            {/* Description */}
            {meta?.description && (
                <p style={{ marginBottom: 6, fontSize: '0.875rem', color: 'var(--bs-body-color, #212529)' }}>
                    {meta.description}
                </p>
            )}

            {/* Method + path template */}
            <p style={{ marginBottom: 0 }}>
                <MethodBadge method={endpoint.method} />
                <code style={{ fontSize: '0.8rem' }}>
                    {meta ? meta.pathTemplate.replace(/^(GET|POST|PUT|PATCH|DELETE) /, '') : normalizedPath}
                </code>
            </p>
        </li>
    );
}

// ─── Group section ────────────────────────────────────────────────────────────

/** Renders a labelled group of endpoints. */
function EndpointGroup({ name, endpoints }: { name: string; endpoints: Endpoint[] }) {
    return (
        <div style={{ marginBottom: 36 }}>
            <h4 style={{
                fontSize: '1rem',
                fontWeight: 700,
                borderBottom: '2px solid var(--bs-border-color, #dee2e6)',
                paddingBottom: 6,
                marginBottom: 0,
            }}>
                {name}
                <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#6c757d', marginLeft: 8 }}>
                    ({endpoints.length})
                </span>
            </h4>
            <ul style={{ padding: 0, margin: 0 }}>
                {endpoints.map((ep, i) => (
                    <EndpointRow key={`${ep.method}-${ep.path}-${i}`} endpoint={ep} />
                ))}
            </ul>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Fetches all registered backend endpoints and renders them in TypeDoc
 * center-column style — grouped by feature area, each entry showing the
 * function signature, description, and full HTTP method + path with placeholders.
 *
 * @returns A full-width endpoint reference panel.
 */
export function ListEndpoints(): React.ReactElement {
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(API.listEndpoints())
            .then(res => res.json())
            .then((data: Endpoint[]) => setEndpoints(data))
            .catch(() => setError('Failed to fetch endpoints from /gpapi/listEndpoints'));
    }, []);

    const groupOrder = Array.from(new Set(Object.values(META).map(m => m.group)));

    const grouped = new Map<string, Endpoint[]>();
    for (const ep of endpoints) {
        const normalizedPath = ep.path.replace(/^\^/, '');
        const group = META[normalizedPath]?.group ?? 'Other';
        if (!grouped.has(group)) grouped.set(group, []);
        grouped.get(group)!.push(ep);
    }

    const orderedGroups = [
        ...groupOrder.filter(g => grouped.has(g)),
        ...(grouped.has('Other') ? ['Other'] : []),
    ];

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
                    Backend API Endpoints!!
                </h1>
                <p style={{ color: '#6c757d', fontSize: '0.875rem', marginBottom: 0 }}>
                    All registered routes on <code>gliderport.thilenius.com</code> — fetched live from{' '}
                    <code>GET /gpapi/listEndpoints</code>.{' '}
                    {endpoints.length > 0 && <>{endpoints.length} endpoints across {orderedGroups.length} groups.</>}
                </p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {endpoints.length === 0 && !error && <p className="text-muted">Loading…</p>}

            {orderedGroups.map(group => (
                <EndpointGroup key={group} name={group} endpoints={grouped.get(group)!} />
            ))}
        </div>
    );
}

export default ListEndpoints;
