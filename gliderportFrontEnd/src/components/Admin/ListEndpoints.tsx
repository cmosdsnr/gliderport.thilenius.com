/**
 * @packageDocumentation
 *
 * Displays all registered backend API endpoints in the same style as the
 * TypeDoc center-column parameter list. Endpoints are fetched live from
 * `/gpapi/listEndpoints`, enriched with descriptions from a local metadata
 * map, and grouped by feature area.
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
    /** One-sentence description shown below the endpoint name. */
    description: string;
    /** Feature-area group heading this endpoint belongs to. */
    group: string;
}

// ─── Metadata map ─────────────────────────────────────────────────────────────

/**
 * Maps every known backend path to its human-readable description and
 * feature group. Endpoints fetched from the server but absent from this map
 * are shown without a description under "Other".
 */
const META: Record<string, EndpointMeta> = {
    // Wind data
    '/gpapi/getData':           { group: 'Wind Data',         description: 'Returns wind and sensor readings for the given number of hours of history.' },
    '/gpapi/averages':          { group: 'Wind Data',         description: 'Returns averaged wind speed and direction over a recent time window.' },
    '/gpapi/getLastEntry':      { group: 'Wind Data',         description: 'Returns the single most recent wind sensor record.' },
    '/gpapi/fetchNewWind':      { group: 'Wind Data',         description: 'Triggers an immediate poll of the ESP32 for new wind data.' },
    '/gpapi/addWindFromSQL':    { group: 'Wind Data',         description: 'Backfills wind records from the MySQL database into PocketBase.' },
    '/gpapi/getWindTableCodes': { group: 'Wind Data',         description: 'Returns the wind-code table for the last 8 days, used to render the historical wind-condition grid.' },

    // Forecast
    '/gpapi/getForecastCodes':  { group: 'Forecast',          description: "Returns today's wind forecast codes used to populate the forecast panel." },
    '/gpapi/getForecast':       { group: 'Forecast',          description: 'Returns the raw OpenWeatherMap forecast payload (5-day, 3-hour intervals).' },

    // Sun
    '/gpapi/UpdateSun':         { group: 'Sun',               description: "Triggers a recalculation and PocketBase update of today's sunrise/sunset times." },

    // Images — public
    '/gpapi/listing':             { group: 'Images',          description: 'Returns a directory listing of dates for which archived images exist.' },
    '/gpapi/imageCount':          { group: 'Images',          description: 'Returns the image count for a specific date, hour range, and camera.' },
    '/gpapi/getImageData':        { group: 'Images',          description: 'Returns image metadata (counts, thumbnails) for a given year and month.' },
    '/gpapi/getLargeImage':       { group: 'Images',          description: 'Returns the most recent full-resolution image for the specified camera.' },
    '/gpapi/getLastFiveSmallImages': { group: 'Images',       description: 'Returns the last five small (thumbnail) camera images across both cameras.' },
    '/gpapi/latestImages':        { group: 'Images',          description: 'Returns the latest image metadata for both cameras.' },

    // Images — admin/internal
    '/gpapi/scanLatestDirectory': { group: 'Images (Admin)',  description: 'Scans the latest image directory and updates PocketBase metadata.' },
    '/gpapi/scanEntireDirectory': { group: 'Images (Admin)',  description: 'Scans all image directories and rebuilds PocketBase metadata from scratch.' },
    '/gpapi/createListingRecord': { group: 'Images (Admin)',  description: 'Creates or refreshes the listing record in PocketBase.' },
    '/gpapi/updateImage':         { group: 'Images (Admin)',  description: 'Receives a new camera image upload and updates the latest-image state.' },
    '/gpapi/updateLog':           { group: 'Images (Admin)',  description: 'Appends a log entry from the Pi 3 camera system.' },
    '/gpapi/gotoSleep':           { group: 'Images (Admin)',  description: 'Signals the camera system to enter low-power sleep mode.' },
    '/gpapi/wakeUp':              { group: 'Images (Admin)',  description: 'Signals the camera system to wake from sleep mode.' },

    // Archive
    '/gpapi/unpackArchive':       { group: 'Archive',         description: 'Unpacks a compressed monthly image archive, making those images available for browsing.' },
    '/gpapi/runScheduledArchive': { group: 'Archive',         description: 'Manually triggers the scheduled monthly archival job.' },

    // Diagnostics
    '/gpapi/info':              { group: 'Diagnostics',        description: 'Returns a system info snapshot: record counts, hours table, sun position, wind code history, and add-data log.' },
    '/gpapi/listEndpoints':     { group: 'Diagnostics',        description: 'Returns a JSON array of all registered API endpoints (method + path).' },
    '/gpapi/debug':             { group: 'Diagnostics',        description: 'Returns a snapshot of all key PocketBase status records for debugging.' },
    '/gpapi/test':              { group: 'Diagnostics',        description: 'Health-check endpoint — confirms the Express server is running and reachable.' },

    // Streaming
    '/gpapi/stats':             { group: 'Streaming',          description: 'Returns HLS streaming statistics: segment file counts, bitrate, and last-access times.' },

    // Notifications
    '/gpapi/sendTestSms':       { group: 'Notifications',      description: 'Sends a test SMS/email alert to the specified recipient address.' },
    '/gpapi/testWindSpeeds':    { group: 'Notifications',      description: 'Sends a test alert with current wind speed data to all SMS subscribers.' },
    '/gpapi/PhoneFinder':       { group: 'Notifications',      description: 'Looks up the mobile carrier gateway address for a US phone number.' },

    // Analytics
    '/gpapi/recreateSiteHits':  { group: 'Analytics',          description: 'Rebuilds the site-hits aggregation record in PocketBase from raw log data.' },
    '/gpapi/hitsReport':        { group: 'Analytics',          description: 'Returns the current site-hits report (daily, weekly, and monthly counts).' },

    // General
    '/gpapi/getDonors':         { group: 'General',            description: 'Returns the list of site donors from PocketBase.' },

    // Hardware
    '/gpapi/setIP':             { group: 'Hardware',           description: "Receives the ESP32's current local IP address on boot and stores it in PocketBase." },
};

// ─── Method badge ─────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
    GET:    '#28a745',
    POST:   '#0d6efd',
    PUT:    '#fd7e14',
    PATCH:  '#6f42c1',
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
    const meta = META[endpoint.path];
    // Derive a short display name from the last path segment
    const name = endpoint.path.split('/').filter(Boolean).pop() ?? endpoint.path;

    return (
        <li style={{
            padding: '10px 0',
            borderTop: '1px solid var(--bs-border-color, #dee2e6)',
            listStyle: 'none',
        }}>
            <h5 style={{ marginBottom: 4, fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 600 }}>
                <MethodBadge method={endpoint.method} />
                {name}
            </h5>
            {meta?.description && (
                <p style={{ marginBottom: 4, fontSize: '0.875rem', color: 'var(--bs-secondary-color, #6c757d)' }}>
                    {meta.description}
                </p>
            )}
            <p style={{ marginBottom: 0 }}>
                <code style={{ fontSize: '0.8rem' }}>
                    {endpoint.method.toUpperCase()} {endpoint.path}
                </code>
            </p>
        </li>
    );
}

// ─── Group section ────────────────────────────────────────────────────────────

/** Renders a labelled group of endpoints. */
function EndpointGroup({ name, endpoints }: { name: string; endpoints: Endpoint[] }) {
    return (
        <div style={{ marginBottom: 32 }}>
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
 * HTTP method badge, endpoint name, description, and full path.
 *
 * Endpoints not present in the local metadata map are collected under "Other".
 *
 * @returns A full-width endpoint reference panel.
 */
export function ListEndpoints(): React.ReactElement {
    /** All endpoints fetched from `/gpapi/listEndpoints`. */
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(API.listEndpoints())
            .then(res => res.json())
            .then((data: Endpoint[]) => setEndpoints(data))
            .catch(() => setError('Failed to fetch endpoints from /gpapi/listEndpoints'));
    }, []);

    // Determine the ordered group list from META, preserving insertion order,
    // then append "Other" for any unmapped endpoints.
    const groupOrder = Array.from(
        new Set(Object.values(META).map(m => m.group))
    );

    const grouped = new Map<string, Endpoint[]>();
    for (const ep of endpoints) {
        const group = META[ep.path]?.group ?? 'Other';
        if (!grouped.has(group)) grouped.set(group, []);
        grouped.get(group)!.push(ep);
    }

    // Render groups in META order, then "Other" last.
    const orderedGroups = [
        ...groupOrder.filter(g => grouped.has(g)),
        ...(grouped.has('Other') ? ['Other'] : []),
    ];

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
                    Backend API Endpoints
                </h1>
                <p style={{ color: '#6c757d', fontSize: '0.875rem', marginBottom: 0 }}>
                    All registered routes on <code>gliderport.thilenius.com</code> — fetched live from{' '}
                    <code>GET /gpapi/listEndpoints</code>.{' '}
                    {endpoints.length > 0 && <>{endpoints.length} endpoints across {orderedGroups.length} groups.</>}
                </p>
            </div>

            {error && (
                <div className="alert alert-danger">{error}</div>
            )}

            {endpoints.length === 0 && !error && (
                <p className="text-muted">Loading…</p>
            )}

            {orderedGroups.map(group => (
                <EndpointGroup
                    key={group}
                    name={group}
                    endpoints={grouped.get(group)!}
                />
            ))}
        </div>
    );
}

export default ListEndpoints;
