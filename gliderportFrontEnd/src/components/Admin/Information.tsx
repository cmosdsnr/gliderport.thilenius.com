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
    /** Metadata about the gliderport record table (first/last record, counts). */
    const [gliderportInfo, setGliderportInfo] = useState<GliderportInfo>({
        lastRecord: null,
        firstRecord: null,
        tdLast: null,
        numberRecords: undefined,
        latestHours: 0,
        latestHoursString: null,
    });

    /** Hourly aggregation table: total count and per-hour breakdown entries. */
    const [hoursTable, setHoursTable] = useState<{ count: number; entries: HourEntry[] }>({
        count: 0,
        entries: [],
    });

    /** Sun-time and computed delta data pushed from the server. `null` until loaded. */
    const [serverSent, setServerSent] = useState<ServerSentData | null>(null);

    /** Code-history overview list and optional latest-day details. */
    const [codeHistory, setCodeHistory] = useState<CodeHistory>({ overview: [], latestDetails: undefined });

    /** ETL (add-data) process status including forecast schedule and per-hour results. */
    const [addData, setAddData] = useState<AddDataInfo>({
        lastCalled: 0,
        lastCalledString: "",
        numberRecordsReceived: 0,
        lastEntryInHours: 0,
        lastEntryInHoursString: "",
        hoursInfo: [],
        forecast: {
            nextUpdate: 0,
            nextUpdateString: "",
            lastUpdate: 0,
            lastUpdateString: "",
            forecastHours: 0,
            forecastStart: 0,
            forecastEnd: 0,
        },
        codeHistoryUpdate: {},
    });

    /**
     * Fetches InfoResponse from API on mount.
     */
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
        <div>
            {/* Gliderport Info Section */}
            <h3>Gliderport Info</h3>
            <table>
                <tbody>
                    <tr>
                        <td>Last Record in gliderport table:</td>
                        <td>{gliderportInfo.lastRecord}</td>
                    </tr>
                    {gliderportInfo.firstRecord === null ? (
                        <>
                            <tr>
                                <td>Most recent addData at:</td>
                                <td>Never Called</td>
                            </tr>
                            <tr>
                                <td>First Record of last added:</td>
                                <td>Never Called</td>
                            </tr>
                            <tr>
                                <td>Number of Records added:</td>
                                <td>Never Called</td>
                            </tr>
                        </>
                    ) : (
                        <>
                            <tr>
                                <td>Most recent addData at:</td>
                                <td>{gliderportInfo.tdLast}</td>
                            </tr>
                            <tr>
                                <td>First Record of last added:</td>
                                <td>{gliderportInfo.firstRecord}</td>
                            </tr>
                            <tr>
                                <td>Number of Records added:</td>
                                <td>{gliderportInfo.numberRecords}</td>
                            </tr>
                        </>
                    )}
                    <tr>
                        <td>Latest Hours table timestamp is:</td>
                        <td>
                            {gliderportInfo.latestHours === 0
                                ? "Never Called"
                                : `${gliderportInfo.latestHours} (${gliderportInfo.latestHoursString})`}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Hours Table Section */}
            <h3>Hours has {hoursTable.count} entries</h3>
            <table style={{ textAlign: 'center' }}>
                <thead>
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
            </table>

            {/* Server Sent Section */}
            <h3>Server Sent Table</h3>
            {serverSent ? (
                <table>
                    <tbody>
                        <tr>
                            <td><b>Now</b></td>
                            <td>({serverSent.now})</td>
                        </tr>
                        {serverSent.sun &&
                            Object.entries(serverSent.sun).map(([key, value]) => (
                                <tr key={key}>
                                    <td>{key}</td>
                                    <td>{value}</td>
                                </tr>
                            ))}
                        {serverSent.computed &&
                            Object.entries(serverSent.computed).map(([key, comp]) => (
                                <tr key={key}>
                                    <td>{key}</td>
                                    <td>({comp.original}) <b>{comp.display}</b> ({comp.delta})</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            ) : (
                <p>No server sent data available.</p>
            )}

            {/* Code History Overview Section */}
            <h3>Code History Table (last 10 overview)</h3>
            <table>
                <thead>
                    <tr><th>Date</th><th>Code Changes</th></tr>
                </thead>
                <tbody>
                    {codeHistory.overview.map((entry, idx) => (
                        <tr key={idx}>
                            <td>{entry.dateString}</td>
                            <td>{entry.codeChanges} changes</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Code History Latest Details Section */}
            {codeHistory.latestDetails && (
                <>
                    <h3>Latest Code History Table details for {codeHistory.latestDetails.dateString} with {codeHistory.latestDetails.codes.length} code changes</h3>
                    <table>
                        <tbody>
                            <tr><td>start</td><td>{codeHistory.latestDetails.limits[0]} hr</td><td>{codeHistory.latestDetails.limits[0] * 3600} s</td></tr>
                            <tr><td>stop</td><td>{codeHistory.latestDetails.limits[1]} hr</td><td>{codeHistory.latestDetails.limits[1] * 3600} s</td></tr>
                            {codeHistory.latestDetails.codes.length > 0 && (
                                <tr>
                                    <td>First at</td>
                                    <td>{codeHistory.latestDetails.codes[0].time} s after start</td>
                                    <td>{codeHistory.latestDetails.codes[0].timeHMS} from day start</td>
                                </tr>
                            )}
                            {codeHistory.latestDetails.codes.map((ci, j) => (
                                <tr key={j}><td>{ci.time}</td><td>{ci.timeHMS}</td><td>{ci.description} ({ci.code})</td></tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* Add Data Section */}
            <h3>Add Data</h3>
            <p>Data and Hours table update Info:</p>
            <table>
                <tbody>
                    <tr><td>Last called:</td><td>{addData.lastCalledString} ({addData.lastCalled})</td></tr>
                    <tr><td>Received records:</td><td>{addData.numberRecordsReceived} records received from PI3 and added to gliderport table</td></tr>
                    <tr><td>Last entry in hours table:</td><td>{addData.lastEntryInHoursString} ({addData.lastEntryInHours})</td></tr>
                    {addData.hoursInfo.map((hi, k) => (
                        <tr key={k}><td>Hour {k + 1}:</td><td>Found {hi.resultsFound} entries for {hi.tsString || hi.ts}</td></tr>
                    ))}
                    <tr><td>Next forecast update:</td><td>{addData.forecast.nextUpdateString} ({addData.forecast.nextUpdate})</td></tr>
                    <tr><td>Last forecast update:</td><td>{addData.forecast.lastUpdateString} ({addData.forecast.lastUpdate})</td></tr>
                    <tr><td>Forecast hours:</td><td>{addData.forecast.forecastHours}</td></tr>
                    <tr><td>Forecast start:</td><td>{addData.forecast.forecastStart}</td></tr>
                    <tr><td>Forecast end:</td><td>{addData.forecast.forecastEnd}</td></tr>
                </tbody>
            </table>
            <div style={{ height: '300px' }} />
        </div>
    );
};

export default InfoDisplay;
