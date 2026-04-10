/**
 * @file ArchiveStats.tsx
 * @module ArchiveStats
 *
 * @description
 * Admin panel component that displays statistical summaries for a selected
 * monthly wind-data archive.  The user picks a year and month; the component
 * fetches the unpacked archive via {@link API.unpackArchive} and renders a
 * Bootstrap table showing record count, time range, and min/max values for
 * speed, direction, temperature, humidity, and pressure.
 */
import React, { useEffect, useState } from 'react';
import { API } from '@/api';
import { Form, Table } from 'react-bootstrap';
import { DateTime } from 'luxon';

/**
 * Statistical summary returned by the `unpackArchive` API endpoint for a
 * single monthly archive file.
 */
interface Stats {
    /** Total number of records in the archive. */
    count: number;
    /** Unix timestamp (seconds) of the earliest record. */
    minTimestamp: number;
    /** Unix timestamp (seconds) of the latest record. */
    maxTimestamp: number;
    /** Minimum wind speed (tenths of mph, divide by 10 to display). */
    minSpeed: number;
    /** Maximum wind speed (tenths of mph, divide by 10 to display). */
    maxSpeed: number;
    /** Minimum wind direction in degrees. */
    minDirection: number;
    /** Maximum wind direction in degrees. */
    maxDirection: number;
    /** Minimum temperature (tenths of °F, divide by 10 to display). */
    minTemperature: number;
    /** Maximum temperature (tenths of °F, divide by 10 to display). */
    maxTemperature: number;
    /** Minimum relative humidity (%). */
    minHumidity: number;
    /** Maximum relative humidity (%). */
    maxHumidity: number;
    /** Minimum barometric pressure (raw sensor units). */
    minPressure: number;
    /** Maximum barometric pressure (raw sensor units). */
    maxPressure: number;
    /** ISO string representing the start of the archive window. */
    startTime: string;
    /** ISO string representing the end of the archive window. */
    endTime: string;
}

/**
 * Displays statistical summaries for a user-selected monthly wind archive.
 *
 * Renders year/month `<Form.Select>` controls (years from 2015 up to the
 * previous complete month) and, once data is fetched, a responsive Bootstrap
 * table with min/max columns for every sensor field.
 *
 * @returns The rendered archive statistics panel.
 *
 * @example
 * ```tsx
 * <ArchiveStats />
 * ```
 */
const ArchiveStats: React.FC = () => {
    /** Compute year/month options — restrict to completed months. */
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const years: number[] = [];
    for (let y = 2015; y <= end.getFullYear(); y++) {
        years.push(y);
    }
    const [year, setYear] = useState(end.getFullYear());
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
        .filter(m => (year === end.getFullYear() ? m <= end.getMonth() : true));
    const [month, setMonth] = useState(end.getMonth());

    const [data, setData] = useState<{ filename: string; stats: Stats } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(API.unpackArchive(year, month))
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(json => setData(json))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [year, month]);

    return (
        <div className="p-4">
            <Form className="d-flex mb-4">
                <Form.Group controlId="yearSelect" className="me-3">
                    <Form.Label>Year</Form.Label>
                    <Form.Select
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </Form.Select>
                </Form.Group>
                <Form.Group controlId="monthSelect">
                    <Form.Label>Month</Form.Label>
                    <Form.Select
                        value={month}
                        onChange={e => setMonth(Number(e.target.value))}
                    >
                        {months.map(m => (
                            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                        ))}
                    </Form.Select>
                </Form.Group>
            </Form>

            {loading && <div>Loading...</div>}
            {error && <div className="text-danger">Error: {error}</div>}

            {data && (
                <Table striped bordered hover responsive style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Min</th>
                            <th>Max</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Filename</td>
                            <td colSpan={2}>{data.filename}</td>
                        </tr>
                        <tr>
                            <td>Count</td>
                            <td colSpan={2}>{data.stats.count}</td>
                        </tr>
                        <tr>
                            <td>Time Range</td>
                            <td>
                                {DateTime.fromSeconds(data.stats.minTimestamp)
                                    .toFormat("LLL'.' dd, yyyy HH:mm:ss")}
                            </td>
                            <td>
                                {DateTime.fromSeconds(data.stats.maxTimestamp)
                                    .toFormat("LLL'.' dd, yyyy HH:mm:ss")}
                            </td>
                        </tr>
                        <tr>
                            <td>Speed</td>
                            <td>{data.stats.minSpeed / 10} mph</td>
                            <td>{data.stats.maxSpeed / 10} mph</td>
                        </tr>
                        <tr>
                            <td>Direction</td>
                            <td>{data.stats.minDirection}°</td>
                            <td>{data.stats.maxDirection}°</td>
                        </tr>
                        <tr>
                            <td>Temperature</td>
                            <td>{data.stats.minTemperature / 10}°F</td>
                            <td>{data.stats.maxTemperature / 10}°F</td>
                        </tr>
                        <tr>
                            <td>Humidity</td>
                            <td>{data.stats.minHumidity}%</td>
                            <td>{data.stats.maxHumidity}%</td>
                        </tr>
                        <tr>
                            <td>Pressure</td>
                            <td>{data.stats.minPressure}</td>
                            <td>{data.stats.maxPressure}</td>
                        </tr>
                    </tbody>
                </Table>
            )}
        </div>
    );
};

export default ArchiveStats;