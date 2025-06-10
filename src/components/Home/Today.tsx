/**
 * 
 * @packageDocumentation
 *   React component that fetches and displays today's wind forecast codes
 *   in a simple table format. Retrieves forecast codes from the server,
 *   removes the final "dark" entry, and displays each timestamp and code.
 */
import React, { useState, useEffect } from 'react';
import { DayOfCodes } from '../History/History';
import { codes } from '../Globals';

/**
 * Displays today's wind forecast codes in a table.
 *
 * Fetches forecast codes from the API, removes the final "dark" entry,
 * and displays each timestamp and code.
 *
 * @returns {React.ReactElement} The rendered forecast table.
 */
export function Today(): React.ReactElement {
    /**
     * State holding an array of forecast entries for today.
     * Each entry is a tuple [timestampSec, codeValue].
     */
    const [today, setToday] = useState<DayOfCodes>([]);

    useEffect(() => {
        /**
         * Fetches forecast codes from the API and updates state with
         * today's codes, excluding the final dark period entry.
         *
         * @async
         * @function fetchForecastCodes
         * @returns {Promise<void>}
         */
        const fetchForecastCodes = async (): Promise<void> => {
            try {
                const url = new URL("/api/getForecastCodes", import.meta.env.VITE_SERVER_URL.toString());
                const res = await fetch(url.toString());
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} ${res.statusText}`);
                }
                const forecastCodes: any = await res.json();

                // Remove the final "dark" entry if present
                if (Array.isArray(forecastCodes[0])) {
                    forecastCodes[0].pop();
                }

                setToday(forecastCodes[0] as DayOfCodes);
            } catch (err: any) {
                console.error('Error fetching forecast codes:', err.message);
            }
        };

        fetchForecastCodes();
    }, []);

    return (
        <table className="forecast-table">
            <thead>
                <tr>
                    <th colSpan={2}>Today's Forecast</th>
                </tr>
            </thead>
            <tbody>
                {today.map((codeEntry, i) => {
                    const [ts, code] = codeEntry;
                    return (
                        <tr key={i}>
                            <td className="forecast-time">
                                {new Date(ts * 1000)
                                    .toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        hour12: false,
                                    })}
                            </td>
                            <td className="forecast-wind">
                                {codes[code]?.code ?? 'Unknown'}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default Today;
