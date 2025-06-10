/**
 * 
 * @packageDocumentation
 *   Renders a table showing the most recent sensor readings (wind speed, direction,
 *   temperature, pressure, humidity) along with sunrise/sunset times and when the
 *   last reading was taken. The “last seen” timestamp updates every 5 seconds.
 */

import React, { useState } from 'react';
import { useData } from 'contexts/DataContext';
import { useStatusCollection } from '@/contexts/StatusCollection';
import useInterval from 'hooks/useInterval';

/**
 * Props for CurrentTable.
 * {React.CSSProperties} [rest] - Additional CSS style properties to merge into the table’s inline style.
 */
interface CurrentTableProps {
    [key: string]: any;
}

/**
 * Displays the latest sensor readings in a tabular layout, including:
 * - Wind speed (mph)
 * - Wind direction (degrees and offset from 270°)
 * - Temperature (°F)
 * - Pressure (mBar)
 * - Humidity (%)
 * - Sunrise and sunset times (HH:mm, 24-hour)
 * - Last reading timestamp with “time ago” label
 *
 * @param props - Additional style or props for the table.
 * @returns {React.ReactElement} The rendered current readings table.
 */
export function CurrentTable({ ...rest }: CurrentTableProps): React.ReactElement {
    // Pull in the array of readings from context
    const { readings } = useData();
    // Pull in sunrise/sunset info from context
    const { sun } = useStatusCollection();

    /**
     * The most recent reading, or defaults if no readings exist yet.
     *
     * @type {{ speed: number; temperature: number; pressure: number;
     *          humidity: number; direction: number; secondsPassed: number; time: number }}
     */
    const latest =
        readings[readings.length - 1] ?? {
            speed: 0,
            temperature: 0,
            pressure: 0,
            humidity: 0,
            direction: 0,
            secondsPassed: 0,
            time: 0,
        };

    /**
     * State: seconds elapsed since the last reading.
     *
     * Initialized based on the current wall-clock time.
     */
    const [secondsPassed, setSecondsPassed] = useState(
        Math.max(0, Math.floor(Date.now() / 1000) - latest.timestamp)
    );

    // Update `secondsPassed` every 5 seconds
    useInterval(() => {
        setSecondsPassed(Math.max(0, Math.floor(Date.now() / 1000) - latest.timestamp));
    }, 5000);

    /**
     * Format a “time ago” string given a UNIX timestamp.
     *
     * @param {number} ts - Seconds since epoch for the event.
     * @returns {string} e.g. "3 minutes ago", "just now"
     */
    function timeAgo(ts: number): string {
        const diff = Math.floor(Date.now() / 1000) - ts;
        const diffSeconds = diff % 60;
        const diffMinutes = Math.floor(diff / 60);
        const diffHours = Math.floor(diff / 3600);

        if (diffHours >= 1) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMinutes >= 1) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else if (diffSeconds >= 1) {
            return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
        } else {
            return 'just now';
        }
    }

    // Build the formatted “Latest Reading” label
    const lastSeen = (() => {
        const dt = new Date(latest.timestamp * 1000);
        return `Latest Reading: ${dt.toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
        })} (${timeAgo(latest.timestamp)})`;
    })();

    // Format sunrise and sunset times, or show 'N/A'
    const sunrise = sun?.rise
        ? new Date(sun.rise * 1000).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })
        : 'N/A';
    const sunset = sun?.set
        ? new Date(sun.set * 1000).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        })
        : 'N/A';

    return (
        <table style={{ width: '100%', ...rest }}>
            <tbody>
                <tr>
                    <td colSpan={4} className="bold">
                        <center>{lastSeen}</center>
                        <br />
                    </td>
                </tr>
                <tr>
                    <td className="blue">Speed:</td>
                    <td className="bold">{latest.speed} mph</td>
                    <td className="blue">Temperature:</td>
                    <td className="bold">{latest.temperature} °F</td>
                </tr>
                <tr>
                    <td className="blue">Direction:</td>
                    <td className="bold">
                        {latest.direction}° ({Math.abs(270 - latest.direction)}° off)
                    </td>
                    <td className="blue">Pressure:</td>
                    <td className="bold">{latest.pressure} mBar</td>
                </tr>
                <tr>
                    <td className="blue">Sunrise:</td>
                    <td className="bold">{sunrise}</td>
                    <td className="blue">Humidity:</td>
                    <td className="bold">{latest.humidity}%</td>
                </tr>
                <tr>
                    <td className="blue">Sunset:</td>
                    <td className="bold">{sunset}</td>
                </tr>
            </tbody>
        </table>
    );
};

export default CurrentTable;
