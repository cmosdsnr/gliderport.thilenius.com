/**
 * ## InfoDisplay Component
 *
 * Fetches and displays comprehensive gliderport system information, including:
 *  - Gliderport record metadata
 *  - Hourly stats overview
 *  - Server-sent sunrise/sunset and computed deltas
 *  - Code history summaries and details
 *  - Add-data (ETL) process details
 *
 * Data is retrieved from the `/gpapi/info` endpoint on mount.
 *
 * @component
 */
import React, { useEffect, useState } from 'react';
import { Container, Card, Table } from 'react-bootstrap';
import { API } from '@/api';

/**
 * Gliderport info returned from the API.
 */
interface GliderportInfo {
    lastRecord: TimeStamp | null;
    firstRecord: TimeStamp | null;
    tdLast?: string | null;
    numberRecords?: number;
    latestHours: number;
    latestHoursString?: string | null;
}

/**
 * Status data pushed from the server (sun times, computed deltas).
 */
interface ServerSentData {
    now: number;
    record: Record<string, unknown>;
    sun?: { [key: string]: string };
    computed?: { [key: string]: { original: number; display: string; delta: string } };
}

/**
 * Metadata about the add-data (ETL) process and schedule.
 */
interface AddDataInfo {
    lastCalled: number;
    lastCalledString: string;
    numberRecordsReceived: number;
    lastEntryInHours: number;
    lastEntryInHoursString: string;
    hoursInfo: { resultsFound: number; ts: number; tsString?: string }[];
    forecast: {
        nextUpdate: number;
        nextUpdateString: string;
        lastUpdate: number;
        lastUpdateString: string;
        forecastHours: number;
        forecastStart: number;
        forecastEnd: number;
    };
    codeHistoryUpdate: Record<string, unknown>;
}

/**
 * Combined API response shape.
 */
interface InfoResponse {
    gliderportInfo: GliderportInfo;
    hoursTable: { count: number; entries: HourEntry[] };
    serverSent: ServerSentData | null;
    codeHistory: { overview: CodeHistoryOverview[]; latestDetails?: CodeHistoryDetails };
    addData: AddDataInfo;
}

/**
 * Single hour bucket entry.
 */
interface HourEntry {
    start: number;
    startString: string;
    hoursCount: number;
    gliderportCount: number;
}

type CodeHistory = { overview: CodeHistoryOverview[]; latestDetails?: CodeHistoryDetails };

/**
 * Overview entry for code history.
 */
interface CodeHistoryOverview {
    date: number;
    dateString: string;
    codeChanges: number;
}

/**
 * Detailed code-history record.
 */
interface CodeHistoryDetails {
    date: number;
    dateString: string;
    limits: [number, number];
    codes: Array<{ time: number; timeHMS: string; description: string; code: number }>;
}

/**
 * Displays system and gliderport information fetched from backend.
 *
 * @returns {React.ReactElement}
 */
export function InfoDisplay(): React.ReactElement {
    const [gliderportInfo, setGliderportInfo] = useState<GliderportInfo>({
        lastRecord: null,
        firstRecord: null,
        tdLast: null,
        numberRecords: undefined,
        latestHours: 0,
        latestHoursString: null,
    });

    const [hoursTable, setHoursTable] = useState<{ count: number; entries: HourEntry[] }>({
        count: 0,
        entries: [],
    });

    const [serverSent, setServerSent] = useState<ServerSentData | null>(null);
    const [codeHistory, setCodeHistory] = useState<CodeHistory>({ overview: [], latestDetails: undefined });

    const [addData, setAddData] = useState<AddDataInfo>({
        lastCalled: 0,
        lastCalledString: '',
        numberRecordsReceived: 0,
        lastEntryInHours: 0,
        lastEntryInHoursString: '',
        hoursInfo: [],
        forecast: {
            nextUpdate: 0,
            nextUpdateString: '',
            lastUpdate: 0,
            lastUpdateString: '',
            forecastHours: 0,
            forecastStart: 0,
            forecastEnd: 0,
        },
        codeHistoryUpdate: {},
    });

    useEffect(() => {
        fetch(API.info())
            .then(res => res.json())
            .then((data: InfoResponse) => {
                setServerSent(data.serverSent);
                setGliderportInfo(data.gliderportInfo);
                setHoursTable(data.hoursTable);
                setCodeHistory(data.codeHistory);
                setAddData(data.addData);
            })
            .catch(err => console.error('Failed to fetch /gpapi/info:', err));
    }, []);

    return (
        <Container className="py-4">

            {/* Gliderport Info */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="fw-semibold bg-secondary text-white">Gliderport Info</Card.Header>
                <Card.Body className="p-0">
                    <Table className="table table-sm table-striped table-bordered mb-0">
                        <tbody>
                            <tr>
                                <td className="fw-semibold w-50">Last Record</td>
                                <td>{gliderportInfo.lastRecord ?? '—'}</td>
                            </tr>
                            {gliderportInfo.firstRecord === null ? (
                                <>
                                    <tr><td className="fw-semibold">Most recent addData</td><td>Never called</td></tr>
                                    <tr><td className="fw-semibold">First record of last batch</td><td>Never called</td></tr>
                                    <tr><td className="fw-semibold">Records added</td><td>Never called</td></tr>
                                </>
                            ) : (
                                <>
                                    <tr><td className="fw-semibold">Most recent addData</td><td>{gliderportInfo.tdLast}</td></tr>
                                    <tr><td className="fw-semibold">First record of last batch</td><td>{String(gliderportInfo.firstRecord)}</td></tr>
                                    <tr><td className="fw-semibold">Records added</td><td>{gliderportInfo.numberRecords}</td></tr>
                                </>
                            )}
                            <tr>
                                <td className="fw-semibold">Latest Hours table timestamp</td>
                                <td>
                                    {gliderportInfo.latestHours === 0
                                        ? 'Never called'
                                        : `${gliderportInfo.latestHours} (${gliderportInfo.latestHoursString})`}
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Hours Table */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="fw-semibold bg-secondary text-white">
                    Hours Table — {hoursTable.count} entries
                </Card.Header>
                <Card.Body className="p-0">
                    <Table className="table table-sm table-striped table-bordered mb-0">
                        <thead className="table-dark">
                            <tr>
                                <th>Hour Start</th>
                                <th>Hours Count</th>
                                <th>Gliderport Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hoursTable.entries.map((entry, idx) => (
                                <tr key={idx}>
                                    <td>{entry.startString}</td>
                                    <td>{entry.hoursCount}</td>
                                    <td>{entry.gliderportCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Server Sent */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="fw-semibold bg-secondary text-white">Server Sent Data</Card.Header>
                <Card.Body className="p-0">
                    {serverSent ? (
                        <Table className="table table-sm table-striped table-bordered mb-0">
                            <tbody>
                                <tr>
                                    <td className="fw-semibold w-40">Now</td>
                                    <td>{serverSent.now}</td>
                                </tr>
                                {serverSent.sun &&
                                    Object.entries(serverSent.sun).map(([key, value]) => (
                                        <tr key={key}>
                                            <td className="fw-semibold">{key}</td>
                                            <td>{value}</td>
                                        </tr>
                                    ))}
                                {serverSent.computed &&
                                    Object.entries(serverSent.computed).map(([key, comp]) => (
                                        <tr key={key}>
                                            <td className="fw-semibold">{key}</td>
                                            <td>
                                                ({comp.original}) <strong>{comp.display}</strong>{' '}
                                                <span className="text-muted">({comp.delta})</span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </Table>
                    ) : (
                        <Card.Body><p className="text-muted mb-0">No server sent data available.</p></Card.Body>
                    )}
                </Card.Body>
            </Card>

            {/* Code History Overview */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="fw-semibold bg-secondary text-white">Code History (last 10 days)</Card.Header>
                <Card.Body className="p-0">
                    <Table className="table table-sm table-striped table-bordered mb-0">
                        <thead className="table-dark">
                            <tr>
                                <th>Date</th>
                                <th>Code Changes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {codeHistory.overview.map((entry, idx) => (
                                <tr key={idx}>
                                    <td>{entry.dateString}</td>
                                    <td>{entry.codeChanges}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Code History Latest Details */}
            {codeHistory.latestDetails && (
                <Card className="mb-4 shadow-sm">
                    <Card.Header className="fw-semibold bg-secondary text-white">
                        Latest Code History — {codeHistory.latestDetails.dateString}{' '}
                        ({codeHistory.latestDetails.codes.length} changes)
                    </Card.Header>
                    <Card.Body className="p-0">
                        <Table className="table table-sm table-striped table-bordered mb-0">
                            <thead className="table-dark">
                                <tr><th>Time (s)</th><th>HMS</th><th>Description</th><th>Code</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={2} className="fw-semibold">Window</td>
                                    <td colSpan={2}>
                                        {codeHistory.latestDetails.limits[0]} – {codeHistory.latestDetails.limits[1]} hr
                                    </td>
                                </tr>
                                {codeHistory.latestDetails.codes.map((ci, j) => (
                                    <tr key={j}>
                                        <td>{ci.time}</td>
                                        <td>{ci.timeHMS}</td>
                                        <td>{ci.description}</td>
                                        <td>{ci.code}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Add Data / ETL */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="fw-semibold bg-secondary text-white">Add Data (ETL)</Card.Header>
                <Card.Body className="p-0">
                    <Table className="table table-sm table-striped table-bordered mb-0">
                        <tbody>
                            <tr>
                                <td className="fw-semibold w-40">Last called</td>
                                <td>{addData.lastCalledString} ({addData.lastCalled})</td>
                            </tr>
                            <tr>
                                <td className="fw-semibold">Records received</td>
                                <td>{addData.numberRecordsReceived}</td>
                            </tr>
                            <tr>
                                <td className="fw-semibold">Last entry in hours table</td>
                                <td>{addData.lastEntryInHoursString} ({addData.lastEntryInHours})</td>
                            </tr>
                            {addData.hoursInfo.map((hi, k) => (
                                <tr key={k}>
                                    <td className="fw-semibold">Hour {k + 1}</td>
                                    <td>{hi.resultsFound} entries for {hi.tsString ?? hi.ts}</td>
                                </tr>
                            ))}
                            <tr>
                                <td className="fw-semibold">Next forecast update</td>
                                <td>{addData.forecast.nextUpdateString} ({addData.forecast.nextUpdate})</td>
                            </tr>
                            <tr>
                                <td className="fw-semibold">Last forecast update</td>
                                <td>{addData.forecast.lastUpdateString} ({addData.forecast.lastUpdate})</td>
                            </tr>
                            <tr>
                                <td className="fw-semibold">Forecast hours / start / end</td>
                                <td>
                                    {addData.forecast.forecastHours} hrs &nbsp;|&nbsp;
                                    {addData.forecast.forecastStart} &nbsp;→&nbsp;
                                    {addData.forecast.forecastEnd}
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

        </Container>
    );
}

export default InfoDisplay;
