import React, { useEffect, useState } from 'react';
import { Form, Table } from 'react-bootstrap';

interface Stats {
    count: number;
    minTimestamp: number;
    maxTimestamp: number;
    minSpeed: number;
    maxSpeed: number;
    minDirection: number;
    maxDirection: number;
    minTemperature: number;
    maxTemperature: number;
    minHumidity: number;
    maxHumidity: number;
    minPressure: number;
    maxPressure: number;
    startTime: string;
    endTime: string;
}

const ArchiveStats: React.FC = () => {
    // Compute year/month options
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
        fetch(`https://gliderport.thilenius.com/gpapi/unpackArchive?year=${year}&month=${month}`)
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
                <Table striped bordered hover responsive>
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
                            <td >{data.stats.startTime}</td>
                            <td >{data.stats.endTime}</td>
                        </tr>
                        <tr>
                            <td>Speed</td>
                            <td>{data.stats.minSpeed}</td>
                            <td>{data.stats.maxSpeed}</td>
                        </tr>
                        <tr>
                            <td>Direction</td>
                            <td>{data.stats.minDirection}°</td>
                            <td>{data.stats.maxDirection}°</td>
                        </tr>
                        <tr>
                            <td>Temperature</td>
                            <td>{data.stats.minTemperature}°C</td>
                            <td>{data.stats.maxTemperature}°C</td>
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