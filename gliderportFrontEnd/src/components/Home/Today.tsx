/**
 *
 * @packageDocumentation
 *   React component that fetches and displays today's wind forecast codes
 *   in a simple table format. Retrieves forecast codes from the server,
 *   removes the final "dark" entry, and displays each timestamp and code.
 */
import React, { useState, useEffect } from 'react';
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { DayOfCodes } from '../History/History';
import { codes } from '../Globals';
import { API } from '@/api';
import { useUnits, SPEED_UNITS } from '@/contexts/UnitsContext';

/**
 * Displays today's wind forecast codes in a table.
 *
 * Fetches forecast codes from the API, removes the final "dark" entry,
 * and displays each timestamp and code.
 *
 * @returns {React.ReactElement} The rendered forecast table.
 */
export function Today(): React.ReactElement {
    const { unit, setUnit } = useUnits();
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
                const res = await fetch(API.getForecastCodes());
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} ${res.statusText}`);
                }
                const forecastCodes: unknown[][] = await res.json();

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
        <div style={{ borderRadius: 8, border: '1px solid #b0c4de', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{
                backgroundColor: '#1a5276', color: 'white',
                padding: '5px 10px', fontWeight: 600, fontSize: '0.9rem',
            }}>
                Today's Forecast
            </div>
            <Table size="sm" bordered={false} className="forecast-table" style={{ marginBottom: 0 }}>
                <tbody>
                    {today.map((codeEntry, i) => {
                        const [ts, code] = codeEntry;
                        const bg = codes[code]?.color ?? 'transparent';
                        return (
                            <tr key={i} style={{ backgroundColor: bg }}>
                                <td style={{ padding: '3px 8px', fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.82rem', width: 40 }}>
                                    {new Date(ts * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </td>
                                <td style={{ padding: '3px 8px', fontSize: '0.82rem' }}>
                                    {codes[code]?.code ?? 'Unknown'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
            <div style={{ textAlign: 'center', padding: '4px 0', borderTop: '1px solid #b0c4de', fontSize: '0.8rem' }}>
                <Link to="/forecast">Full Forecast</Link>
            </div>
            {/* Speed unit selector */}
            <div style={{ borderTop: '1px solid #b0c4de', padding: '6px 6px 5px' }}>
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 4, textAlign: 'center' }}>Speed units</div>
                <div style={{ display: 'flex', gap: 4 }}>
                    {SPEED_UNITS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setUnit(key)}
                            style={{
                                flex: 1,
                                padding: '3px 0',
                                fontSize: '0.75rem',
                                fontWeight: unit === key ? 600 : 400,
                                color: unit === key ? '#fff' : '#1a5276',
                                backgroundColor: unit === key ? '#1a5276' : 'transparent',
                                border: '1px solid #1a5276',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Today;
