import React, { useEffect, useState } from 'react';


interface GliderportInfo {
    lastRecord: any;
    firstRecord: any;
    tdLast?: string | null;
    numberRecords?: any;
    latestHours: any;
    latestHoursString?: string | null;
}

interface ServerSentData {
    now: number;
    record: any; // raw record from server_sent table
    // For sun data, we convert it into a key/value map:
    sun?: { [key: string]: string };
    // For keys like last_record, last_image, last_forecast, include computed delta info.
    computed?: { [key: string]: { original: number; display: string; delta: string } };
}


interface AddDataInfo {
    lastCalled: number;
    lastCalledString: string;
    numberRecordsReceived: number;
    lastEntryInHours: number;
    lastEntryInHoursString: string;
    hoursInfo: any[]; // assuming array of objects with ts, resultsFound, l, etc.
    forecast: {
        nextUpdate: number;
        nextUpdateString: string;
        lastUpdate: number;
        lastUpdateString: string;
        forecastHours: number;
        forecastStart: number;
        forecastEnd: number;
    };
    codeHistoryUpdate: any; // structure from globals.debugInfo.codeHistory
}

interface InfoResponse {
    gliderportInfo: GliderportInfo;
    hoursTable: {
        count: number;
        entries: HourEntry[];
    };
    serverSent: ServerSentData | null;
    codeHistory: {
        overview: CodeHistoryOverview[];
        latestDetails?: CodeHistoryDetails;
    };
    addData: AddDataInfo;
}


interface HourEntry {
    start: number;
    startString: string;
    hoursCount: number;
    gliderportCount: number;
}
type CodeHistory = {
    overview: CodeHistoryOverview[];
    latestDetails?: CodeHistoryDetails;
};

interface CodeHistoryOverview {
    date: number;
    dateString: string;
    codeChanges: number;
}

interface CodeHistoryDetails {
    date: number;
    dateString: string;
    limits: [number, number];
    codes: Array<{ time: number; timeHMS: string; description: string; code: number }>;
}

interface InfoDisplayProps {
    info: InfoResponse;
}

const InfoDisplay = () => {

    const [gliderportInfo, setGliderportInfo] = useState<GliderportInfo>({
        lastRecord: null,
        firstRecord: null,
        tdLast: null,
        numberRecords: null,
        latestHours: 0,
        latestHoursString: null,
    });
    const [hoursTable, setHoursTable] = useState({
        count: 0,
        entries: [],
    });
    const [serverSent, setServerSent] = useState<ServerSentData | null>(null);
    const [codeHistory, setCodeHistory] = useState<CodeHistory>({
        overview: [],
        latestDetails: undefined,

    });
    const [addData, setAddData] = useState<AddDataInfo>({
        lastCalled: 0,
        lastCalledString: "",
        numberRecordsReceived: 0,
        lastEntryInHours: 0,
        lastEntryInHoursString: "",
        hoursInfo: [],
        forecast: {
            nextUpdate: 0,  // timestamp
            nextUpdateString: "",                       // string
            lastUpdate: 0,  // timestamp
            lastUpdateString: "",                       // string
            forecastHours: 0,                          // number
            forecastStart: 0,                          // number
            forecastEnd: 0,                            // number
        },
        codeHistoryUpdate: {},
    });


    useEffect(() => {
        // Fetch data from the server
        fetch(import.meta.env.VITE_UPDATE_SERVER_URL + '/info')
            .then((res) => res.json())
            .then((data) => {
                setServerSent(data.serverSent);
                setGliderportInfo(data.gliderportInfo);
                setHoursTable(data.hoursTable);
                setCodeHistory(data.codeHistory);
                setAddData(data.addData);
            })
            .catch((err) => console.error(err));
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
            <table style={{ textAlign: "center" }}>
                <thead>
                    <tr>
                        <th>Hour Start</th>
                        <th>Hours Count</th>
                        <th>Gliderport Count</th>
                    </tr>
                </thead>
                <tbody>
                    {hoursTable.entries.map((entry: HourEntry, index: number) => (
                        <tr key={index}>
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
                            <td>
                                <b>Now</b>
                            </td>
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
                                    <td>
                                        ({comp.original}) <b>{comp.display}</b> ({comp.delta})
                                    </td>
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
                    <tr>
                        <th>Date</th>
                        <th>Code Changes</th>
                    </tr>
                </thead>
                <tbody>
                    {codeHistory.overview.map((entry: CodeHistoryOverview, index: number) => (
                        <tr key={index}>
                            <td>{entry.dateString}</td>
                            <td>{entry.codeChanges} changes</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Code History Latest Details Section */}
            {codeHistory.latestDetails && (
                <>
                    <h3>
                        Latest Code History Table details for{" "}
                        {codeHistory.latestDetails.dateString} with{" "}
                        {codeHistory.latestDetails.codes.length} code changes
                    </h3>
                    <table>
                        <tbody>
                            <tr>
                                <td>start</td>
                                <td>{codeHistory.latestDetails.limits[0]} hr</td>
                                <td>{codeHistory.latestDetails.limits[0] * 3600} s</td>
                            </tr>
                            <tr>
                                <td>stop</td>
                                <td>{codeHistory.latestDetails.limits[1]} hr</td>
                                <td>{codeHistory.latestDetails.limits[1] * 3600} s</td>
                            </tr>
                            {codeHistory.latestDetails.codes.length > 0 && (
                                <tr>
                                    <td>First at</td>
                                    <td>
                                        {codeHistory.latestDetails.codes[0].time} s after start
                                    </td>
                                    <td>
                                        {codeHistory.latestDetails.codes[0].timeHMS} from day start
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td>Sunrise</td>
                                <td>{/* Add sunrise info here if available */}</td>
                            </tr>
                            {codeHistory.latestDetails.codes.map((codeItem, index) => (
                                <tr key={index}>
                                    <td>{codeItem.time}</td>
                                    <td>{codeItem.timeHMS}</td>
                                    <td>
                                        {codeItem.description} ({codeItem.code})
                                    </td>
                                </tr>
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
                    <tr>
                        <td>Last called:</td>
                        <td>
                            {addData.lastCalledString} ({addData.lastCalled})
                        </td>
                    </tr>
                    <tr>
                        <td>Received records:</td>
                        <td>
                            {addData.numberRecordsReceived} records received from PI3 and added to
                            gliderport table
                        </td>
                    </tr>
                    <tr>
                        <td>Last entry in hours table:</td>
                        <td>
                            {addData.lastEntryInHoursString} ({addData.lastEntryInHours})
                        </td>
                    </tr>
                    {addData.hoursInfo &&
                        addData.hoursInfo.map((hourInfo: any, index: number) => (
                            <tr key={index}>
                                <td>Hour {index + 1}:</td>
                                <td>
                                    Found {hourInfo.resultsFound} entries in gliderport for the hour{" "}
                                    {hourInfo.tsString || hourInfo.ts}
                                </td>
                            </tr>
                        ))}
                    <tr>
                        <td>Next forecast update:</td>
                        <td>
                            {addData.forecast.nextUpdateString} (
                            {addData.forecast.nextUpdate})
                        </td>
                    </tr>
                    <tr>
                        <td>Last forecast update:</td>
                        <td>
                            {addData.forecast.lastUpdateString} (
                            {addData.forecast.lastUpdate})
                        </td>
                    </tr>
                    <tr>
                        <td>Forecast hours:</td>
                        <td>{addData.forecast.forecastHours}</td>
                    </tr>
                    <tr>
                        <td>Forecast start:</td>
                        <td>{addData.forecast.forecastStart}</td>
                    </tr>
                    <tr>
                        <td>Forecast end:</td>
                        <td>{addData.forecast.forecastEnd}</td>
                    </tr>
                    {/* Add more rows for codeHistoryUpdate if desired */}
                </tbody>
            </table>
            <div style={{ height: "300px" }}></div>
        </div>
    );
};

export default InfoDisplay;
