/**
 * @packageDocumentation
 * Combined panel showing Today's Forecast and Current Conditions side-by-side,
 * with the speed-unit selector and Full Forecast link in the footer.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Table } from 'react-bootstrap';
import { DayOfCodes } from '../History/History';
import { codes } from '../Globals';
import { API } from '@/api';
import { useSensorData } from '@/contexts/SensorDataContext';
import { useStatusCollection } from '@/contexts/StatusCollection';
import { useUnits, SPEED_UNITS } from '@/contexts/UnitsContext';
import useInterval from 'hooks/useInterval';

const hdr: React.CSSProperties = {
    backgroundColor: '#1a5276', color: 'white',
    padding: '5px 12px', fontWeight: 600, fontSize: '0.9rem',
};
const lbl: React.CSSProperties = {
    textAlign: 'right', color: '#555', fontWeight: 500,
    paddingRight: 6, whiteSpace: 'nowrap', width: '40%',
};
const val: React.CSSProperties = { fontWeight: 700, paddingLeft: 2 };
const shade: React.CSSProperties = { backgroundColor: 'rgba(0,0,0,0.03)' };

function timeAgo(ts: number): string {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m} minute${m !== 1 ? 's' : ''} ago`;
    const h = Math.floor(diff / 3600);
    return `${h} hour${h !== 1 ? 's' : ''} ago`;
}

export function ConditionsPanel() {
    const { readings, dataLoaded, noData } = useSensorData();
    const { sun } = useStatusCollection();
    const { unit, setUnit, fmtSpeed } = useUnits();
    const [today, setToday] = useState<DayOfCodes>([]);
    const [, setTick] = useState(0);

    const outOfOrder = dataLoaded && noData;

    const latest = readings[readings.length - 1] ?? {
        speed: 0, temperature: 0, pressure: 0,
        humidity: 0, direction: 0, time: 0,
    };

    useInterval(() => setTick(t => t + 1), 5000);

    useEffect(() => {
        fetch(API.getForecastCodes())
            .then(r => r.json())
            .then((data: unknown[][]) => {
                const day = Array.isArray(data[0]) ? [...data[0] as DayOfCodes] : [];
                day.pop();
                setToday(day);
            })
            .catch(err => console.error('Forecast fetch error:', err));
    }, []);

    const sunrise = sun?.rise
        ? new Date(sun.rise * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
        : 'N/A';
    const sunset = sun?.set
        ? new Date(sun.set * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
        : 'N/A';

    const lastSeen = (() => {
        const dt = new Date(latest.time * 1000);
        return `${dt.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} (${timeAgo(latest.time)})`;
    })();

    const condRows: [string, string][] = [
        ['Speed',        outOfOrder ? '—' : fmtSpeed(latest.speed)],
        ['Direction',    outOfOrder ? '—' : `${latest.direction}° (${Math.abs(270 - latest.direction)}° off)`],
        ['Temperature',  outOfOrder ? '—' : `${latest.temperature} °F`],
        ['Pressure',     outOfOrder ? '—' : `${latest.pressure} mBar`],
        ['Humidity',     outOfOrder ? '—' : `${latest.humidity}%`],
        ['Sunrise',      sunrise],
        ['Sunset',       sunset],
        ['Last Reading', outOfOrder ? '—' : lastSeen],
    ];

    return (
        <div style={{ borderRadius: 8, border: '1px solid #b0c4de', overflow: 'hidden', maxWidth: 700, margin: '0 auto' }}>

            {/* Two sections side by side */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', backgroundColor: 'rgb(240,240,210)' }}>

                {/* Today's Forecast */}
                <div style={{ flex: '0 0 auto', minWidth: 150, borderRight: '2px solid black' }}>
                    <div style={hdr}>Today's Forecast</div>
                    <Table size="sm" borderless style={{ marginBottom: 0, background: 'transparent', ['--bs-table-bg' as any]: 'transparent' }}>
                        <tbody>
                            {today.map((entry, i) => {
                                const [ts, code] = entry;
                                const bg = codes[code]?.color ?? 'transparent';
                                return (
                                    <tr key={i} style={{ backgroundColor: bg }}>
                                        <td style={{ padding: '3px 8px', fontWeight: 600, fontSize: '0.82rem', width: 40, background: 'inherit' }}>
                                            {new Date(ts * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </td>
                                        <td style={{ padding: '3px 8px', fontSize: '0.82rem', background: 'inherit' }}>
                                            {codes[code]?.code ?? 'Unknown'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>

                {/* Current Conditions */}
                <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={hdr}>Current Conditions</div>
                    <Table size="sm" borderless style={{ width: '100%', marginBottom: 0, background: 'transparent', ['--bs-table-bg' as any]: 'transparent' }}>
                        <tbody>
                            {condRows.map(([label, value], i) => (
                                <tr key={label} style={i % 2 === 1 ? shade : undefined}>
                                    <td style={{ ...lbl, background: 'transparent' }}>{label}</td>
                                    <td style={{ ...val, background: 'transparent' }}>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

            </div>

            {/* Footer: Full Forecast link + speed unit selector */}
            <div style={{ borderTop: '1px solid #b0c4de', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/forecast" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Full Forecast</Link>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    <span style={{ fontSize: '0.7rem', color: '#666', alignSelf: 'center', whiteSpace: 'nowrap' }}>Speed units:</span>
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
}

export default ConditionsPanel;
