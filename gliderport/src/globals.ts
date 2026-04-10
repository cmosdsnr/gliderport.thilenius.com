/**
 * @packageDocumentation
 *
 * **This module defines and exports the application-wide `globals` singleton.**
 *
 * The `globals` object holds mutable runtime state that is shared across modules —
 * wind data record boundaries, debug flags, text-alert subscriptions, and hourly
 * cache metadata.  Import the default export to read or update these values.
 *
 * @example
 * ```ts
 * import globals from "globals";
 *
 * if (globals.DEBUG) console.log("Debug mode is on");
 * globals.lastRecord = "1700000000000";
 * ```
 *
 * @module globals
 */

/**
 * Shape of the application-wide global state object.
 */
interface Globals {
  /**
   * When `true`, verbose debug logging is enabled throughout the application.
   * Set to `false` in production.
   */
  DEBUG: boolean;

  /**
   * Map of active text-alert subscriptions keyed by an arbitrary token.
   * Each entry contains subscriber configuration used by the SMS-notification logic.
   */
  textWatch: Record<string, any>;

  /**
   * The earliest wind data record available, or `null` if no records have been
   * loaded yet.  Updated once on first database fetch.
   */
  firstRecord: any | null;

  /**
   * The identifier (typically a timestamp string in milliseconds) of the most
   * recently received wind data record.  Initialised to `"0"` so that the first
   * comparison always triggers a fetch.
   */
  lastRecord: string;

  /**
   * The wall-clock `Date` of the last wind data record that was processed.
   * Initialised to the server start time and updated whenever a new record
   * arrives.
   */
  tdLast: Date;

  /**
   * Running count of total wind data records that have been loaded from the
   * database since server start.
   */
  numberRecords: number;

  /**
   * UNIX timestamp (seconds) of the most recently completed hourly bucket in the
   * `hours` SQL table.  `0` means no hourly data has been seen yet.
   */
  latestHours: number;
}

process.env.TZ = "America/Los_Angeles";

/**
 * The application-wide globals singleton.
 *
 * @remarks
 * Mutate this object directly from any module that needs to update shared state.
 * There is no immutability guard — callers are responsible for valid values.
 */
var globals: Globals = {
  DEBUG: true,
  textWatch: {},
  firstRecord: null,
  lastRecord: "0",
  tdLast: new Date(),
  numberRecords: 0,
  latestHours: 0,
};
export default globals;
