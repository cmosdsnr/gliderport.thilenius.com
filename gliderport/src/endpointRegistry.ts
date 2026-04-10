/**
 * @packageDocumentation
 *
 * **Shared endpoint metadata registry for the Gliderport server.**
 *
 * Each route module calls {@link registerEndpoint} once per route at startup.
 * {@link listEndpoints} then merges this registry with the live Express route
 * table to produce the enriched endpoint reference returned to the frontend.
 *
 * @example
 * ```ts
 * import { registerEndpoint } from 'endpointRegistry';
 *
 * registerEndpoint({
 *     method: 'GET',
 *     path: '/gpapi/sendTestSms',
 *     group: 'Notifications',
 *     signature: 'sendTestSms: (name: string, to: string) => string',
 *     description: 'Sends a test SMS message to the given recipient address.',
 *     pathTemplate: 'GET /gpapi/sendTestSms?name=<name>&to=<to>',
 * });
 * router.get('/sendTestSms', handler);
 * ```
 */

/**
 * Metadata describing a single API endpoint, stored in the registry and
 * returned to the frontend by `GET /gpapi/listEndpoints`.
 */
export interface RegisteredEndpoint {
    /** HTTP method (e.g. `"GET"`, `"POST"`). */
    method: string;
    /** Full path including the `/gpapi` prefix (e.g. `"/gpapi/sendTestSms"`). */
    path: string;
    /** Feature-area group heading shown in the endpoint reference UI. */
    group: string;
    /**
     * TypeScript-style call signature mirroring `api.ts` on the frontend
     * (e.g. `"sendTestSms: (name: string, to: string) => string"`).
     */
    signature: string;
    /** One-sentence description taken from the route's TypeDoc comment. */
    description: string;
    /**
     * Full HTTP method + path with `<param>` placeholders
     * (e.g. `"GET /gpapi/sendTestSms?name=<name>&to=<to>"`).
     */
    pathTemplate: string;
}

/** Mutable registry populated by each route module at server startup. */
const registry: RegisteredEndpoint[] = [];

/**
 * Registers metadata for one API endpoint.
 * Call this directly above or below the matching `router.get/post(...)` call.
 *
 * @param meta - Full metadata for the endpoint.
 */
export function registerEndpoint(meta: RegisteredEndpoint): void {
    registry.push(meta);
}

/**
 * Returns a read-only view of the full registry.
 * Used by {@link listEndpoints} to build the enriched endpoint response.
 */
export function getRegistry(): readonly RegisteredEndpoint[] {
    return registry;
}
