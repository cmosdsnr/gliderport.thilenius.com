/**
 *
 * @packageDocumentation
 *   Renders a table showing the most recent sensor readings (wind speed, direction,
 *   temperature, pressure, humidity) along with sunrise/sunset times and when the
 *   last reading was taken. The "last seen" timestamp updates every 5 seconds.
 */

import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import { useSensorData } from '@/contexts/SensorDataContext';
import { useStatusCollection } from '@/contexts/StatusCollection';
import { useUnits } from '@/contexts/UnitsContext';
import useInterval from 'hooks/useInterval';

/**
 * Props for CurrentTable.
 * {React.CSSProperties} [rest] - Additional CSS style properties to merge into the table's inline style.
 */
export type CurrentTableProps = React.CSSProperties;

/**
 * Displays the latest sensor readings in a tabular layout, including:
 * - Wind speed (mph)
 * - Wind direction (degrees and offset from 270°)
 * - Temperature (°F)
 * - Pressure (mBar)
 * - Humidity (%)
 * - Sunrise and sunset times (HH:mm, 24-hour)
 * - Last reading timestamp with "time ago" label
 *
 * @param props - Additional style or props for the table.
 * @returns {React.ReactElement} The rendered current readings table.
 */
export function CurrentTable({ ...rest }: CurrentTableProps): React.ReactElement {
    // Pull in the array of readings from context
    const { readings, dataLoaded, noData } = useSensorData();
    const { sun } = useStatusCollection();
    const { fmtSpeed } = useUnits();
    const outOfOrder = dataLoaded && noData;

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
        Math.max(0, Math.floor(Date.now() / 1000) - latest.time)
    );

    // Update `secondsPassed` every 5 seconds
    useInterval(() => {
        setSecondsPassed(Math.max(0, Math.floor(Date.now() / 1000) - latest.time));
    }, 5000);

    /**
     * Format a "time ago" string given a UNIX timestamp.
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

    // Build the formatted "Latest Reading" label
    const lastSeen = (() => {
        const dt = new Date(latest.time * 1000);
        return `Latest Reading: ${dt.toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
        })} (${timeAgo(latest.time)})`;
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

    const lbl: React.CSSProperties = { textAlign: 'right', color: '#555', fontWeight: 500, paddingRight: 6, whiteSpace: 'nowrap', width: '40%' };
    const val: React.CSSProperties = { fontWeight: 700, paddingLeft: 2 };
    const shade: React.CSSProperties = { backgroundColor: 'rgba(0,0,0,0.03)' };

    const rows: [string, string][] = [
        ['Speed',       outOfOrder ? '—' : fmtSpeed(latest.speed)],
        ['Direction',   outOfOrder ? '—' : `${latest.direction}° (${Math.abs(270 - latest.direction)}° off)`],
        ['Temperature', outOfOrder ? '—' : `${latest.temperature} °F`],
        ['Pressure',    outOfOrder ? '—' : `${latest.pressure} mBar`],
        ['Humidity',    outOfOrder ? '—' : `${latest.humidity}%`],
        ['Sunrise',     sunrise],
        ['Sunset',      sunset],
        ['Last Reading', outOfOrder ? '—' : lastSeen],   // TODO: remove or style differently
    ];

    return (
        <div style={{ borderRadius: 8, border: '1px solid #b0c4de', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#1a5276', color: 'white', padding: '5px 12px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Current Conditions</div>
            </div>
            <Table size="sm" borderless style={{ width: '100%', marginBottom: 0, ...rest }}>
                <tbody>
                    {rows.map(([label, value], i) => (
                        <tr key={label} style={i % 2 === 1 ? shade : undefined}>
                            <td style={lbl}>{label}</td>
                            <td style={val}>{value}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};

export default CurrentTable;
