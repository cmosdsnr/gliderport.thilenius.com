/**
 * @packageDocumentation
 *
 * Displays all registered backend API endpoints in the same style as the
 * TypeDoc center-column parameter list. Endpoints are fetched live from
 * `/gpapi/listEndpoints`, which returns enriched metadata including group,
 * signature, description, and path template — registered in each route file.
 *
 * Each entry shows:
 * - Function signature (name + typed params)
 * - One-sentence description from the TypeDoc comment
 * - Full HTTP method + path with `<param>` placeholders
 *
 * Groups with `"Missing Description"` flag routes that have no registry entry.
 * Groups with `"Missing Implementation"` flag registry entries with no live route.
 */
import React, { useEffect, useState } from 'react';
import { API } from '@/api';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Enriched endpoint record returned by the backend registry. */
interface RegisteredEndpoint {
    /** HTTP method (e.g. `"GET"`, `"POST"`). */
    method: string;
    /** Fully-qualified URL path (e.g. `"/gpapi/info"`). */
    path: string;
    /** Feature-area group heading. */
    group: string;
    /** TypeScript-style call signature (e.g. `"getData: (hours: number) => WindTableRecord[]"`). */
    signature: string;
    /** One-sentence description taken from the TypeDoc comment. */
    description: string;
    /** Full HTTP method + path with `<param>` placeholders. */
    pathTemplate: string;
}

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
function EndpointRow({ endpoint }: { endpoint: RegisteredEndpoint }) {
    // Strip the method prefix from pathTemplate for the code block (e.g. "GET /gpapi/..." → "/gpapi/...")
    const pathPart = endpoint.pathTemplate.replace(/^(GET|POST|PUT|PATCH|DELETE) /, '');

    return (
        <li style={{
            padding: '12px 0',
            borderTop: '1px solid var(--bs-border-color, #dee2e6)',
            listStyle: 'none',
        }}>
            {/* Signature heading */}
            <h5 style={{ marginBottom: 4, fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600 }}>
                {endpoint.signature}
            </h5>

            {/* Description */}
            {endpoint.description && (
                <p style={{ marginBottom: 6, fontSize: '0.875rem', color: 'var(--bs-body-color, #212529)' }}>
                    {endpoint.description}
                </p>
            )}

            {/* Method + path template */}
            <p style={{ marginBottom: 0 }}>
                <MethodBadge method={endpoint.method} />
                <code style={{ fontSize: '0.8rem' }}>{pathPart}</code>
            </p>
        </li>
    );
}

// ─── Group section ────────────────────────────────────────────────────────────

/** Renders a labelled group of endpoints. */
function EndpointGroup({ name, endpoints }: { name: string; endpoints: RegisteredEndpoint[] }) {
    const isMissing = name === 'Missing Description' || name === 'Missing Implementation';
    return (
        <div style={{ marginBottom: 36 }}>
            <h4 style={{
                fontSize: '1rem',
                fontWeight: 700,
                borderBottom: `2px solid ${isMissing ? '#dc3545' : 'var(--bs-border-color, #dee2e6)'}`,
                paddingBottom: 6,
                marginBottom: 0,
                color: isMissing ? '#dc3545' : undefined,
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
    const [endpoints, setEndpoints] = useState<RegisteredEndpoint[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(API.listEndpoints())
            .then(res => res.json())
            .then((data: RegisteredEndpoint[]) => setEndpoints(data))
            .catch(() => setError('Failed to fetch endpoints from /gpapi/listEndpoints'));
    }, []);

    // Group endpoints, preserving first-seen order, with diagnostic groups at the end
    const grouped = new Map<string, RegisteredEndpoint[]>();
    const TAIL_GROUPS = ['Missing Description', 'Missing Implementation'];

    for (const ep of endpoints) {
        if (!grouped.has(ep.group)) grouped.set(ep.group, []);
        grouped.get(ep.group)!.push(ep);
    }

    const normalGroups = Array.from(grouped.keys()).filter(g => !TAIL_GROUPS.includes(g));
    const tailGroups = TAIL_GROUPS.filter(g => grouped.has(g));
    const orderedGroups = [...normalGroups, ...tailGroups];

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
                    Backend API Endpoints
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
