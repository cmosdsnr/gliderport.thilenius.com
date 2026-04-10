import { useEffect, useRef } from 'react'

/**
 * Locale-aware date/time formatter for the America/Los_Angeles timezone.
 *
 * @remarks
 * Formats a `Date` (or timestamp) into a human-readable string such as
 * `"Mar 14, 2025, 6:28:21 PM"`. Used throughout the UI wherever a timestamp
 * needs to be displayed in the site's local time.
 *
 * @example
 * ```ts
 * formatter.format(new Date()); // "Apr 10, 2026, 3:15:00 PM"
 * ```
 */
export const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
});

/**
 * Deep-clones a plain object via JSON serialization.
 *
 * @remarks
 * Only safe for JSON-serializable values — `Date`, `undefined`, functions,
 * and circular references are not preserved.
 *
 * @param obj - The object to clone.
 * @returns A deep copy of `obj`.
 */
export const clone = (obj: any) => {
    return JSON.parse(JSON.stringify(obj))
}

/**
 * Numeric indices for each flying-condition code.
 * Use these constants as keys into the {@link codes} array instead of
 * raw numbers for readability.
 *
 * @example
 * ```ts
 * const entry = codes[codeDef.GOOD]; // { color: "rgb(0,255,0)", ... }
 * ```
 */
export const codeDef = {
    IT_IS_DARK: 0,
    SLED_RIDE_BAD_ANGLE: 1,
    SLED_RIDE_POOR_ANGLE: 2,
    SLED_RIDE: 3,
    BAD_ANGLE: 4,
    POOR_ANGLE: 5,
    GOOD: 6,
    EXCELLENT: 7,
    SPEED_BAR: 8,
    TOO_WINDY: 9,
    NO_DATA: 10
}

/**
 * Display properties for a single flying-condition code.
 */
export type Code = {
    /** CSS `rgb()` color string used to represent this condition. */
    color: string,
    /** Background opacity (0–1) for UI overlays. */
    opacity: number,
    /** Human-readable label shown in the legend and tooltips. */
    code: string,
}

/**
 * Ordered array of flying-condition display entries.
 * Index positions correspond to the values in {@link codeDef}.
 *
 * @example
 * ```ts
 * const { color, code } = codes[codeDef.TOO_WINDY];
 * ```
 */
export const codes: Code[] = [
    { color: "rgb(136, 136, 136)", opacity: 0.1, code: "It Is dark" },           // IT_IS_DARK
    { color: "rgb(238, 238, 180)", opacity: 0.1, code: "Sled ride, bad angle" },  // SLED_RIDE_BAD_ANGLE
    { color: "rgb(238, 220, 180)", opacity: 0.1, code: "Sled ride, poor angle" }, // SLED_RIDE_POOR_ANGLE
    { color: "rgb(238, 238, 238)", opacity: 0.1, code: "Sled ride" },            // SLED_RIDE
    { color: "rgb(205, 255, 205)", opacity: 0.1, code: "Bad angle" },            // BAD_ANGLE
    { color: "rgb(167, 255, 167)", opacity: 0.1, code: "Poor angle" },           // POOR_ANGLE
    { color: "rgb(  0, 255,   0)", opacity: 0.1, code: "Good" },                 // GOOD
    { color: "rgb(  0, 255, 255)", opacity: 0.1, code: "Excellent" },            // EXCELLENT
    { color: "rgb(  0,   0, 255)", opacity: 0.1, code: "Use Speed bar!" },       // SPEED_BAR
    { color: "rgb(255, 187, 186)", opacity: 0.1, code: "Too windy" },            // TOO_WINDY
    { color: "rgb(255,   0,   0)", opacity: 0.1, code: "No data" }               // NO_DATA
];

/**
 * Converts a base-64-encoded string into a `Blob`.
 *
 * @remarks
 * Returns `null` (and logs a warning) if `b64Data` is `null` or is not valid
 * base-64. The conversion is done in `sliceSize`-byte chunks to avoid
 * stack-overflow errors on large payloads.
 *
 * @param b64Data - Base-64-encoded binary string (e.g. a JPEG from the camera).
 * @param contentType - MIME type of the resulting `Blob` (e.g. `"image/jpeg"`).
 * @param sliceSize - Number of bytes to process per iteration. Defaults to `512`.
 * @returns A `Blob` of the decoded data, or `null` on invalid input.
 *
 * @example
 * ```ts
 * const blob = b64toBlob(imageData.A, 'image/jpeg');
 * if (blob) {
 *   const url = URL.createObjectURL(blob);
 * }
 * ```
 */
export const b64toBlob = (b64Data: string, contentType: string = '', sliceSize: number = 512): Blob | null => {
    if (b64Data === null) {
        console.log("b64toBlob called with null")
        return null
    }
    try {
        const byteCharacters = atob(b64Data);
    } catch (error) {
        console.log("b64toBlob called with invalid image")
        return null
    }
    const byteCharacters: string = atob(b64Data);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers: number[] = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
}

/**
 * Returns the abbreviated weekday name for a given `Date`.
 *
 * @param myDate - The date to format.
 * @returns A three-letter weekday abbreviation, e.g. `"Mon"`, `"Fri"`.
 */
export const formatDate = (myDate: Date): string => {
    // var abbrMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var abbrDays: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return abbrDays[myDate.getDay()]; // + ", " + myDate.getDate() + " " + (abbrMonths[myDate.getMonth()]);
}

// type Month = {
//     value: number,
//     name: string,
// }
// export const months: Month[] = [
//     { value: 1, name: "January" },
//     { value: 2, name: "February" },
//     { value: 3, name: "March" },
//     { value: 4, name: "April" },
//     { value: 5, name: "May" },
//     { value: 6, name: "June" },
//     { value: 7, name: "July" },
//     { value: 8, name: "August" },
//     { value: 9, name: "September" },
//     { value: 10, name: "October" },
//     { value: 11, name: "November" },
//     { value: 12, name: "December" }];


