
// src/components/History.tsx
import React, { useState, useEffect } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { useAuth } from '@/contexts/AuthContext';
import { ToId } from '@/util/ToId';
import { useContainerSize } from './useContainerSize';
import KeyCanvas from './KeyCanvas';
import LineCanvas from './LineCanvas';
import CircleCanvas from './CircleCanvas';
import { DateTime } from 'luxon';

/**
 * A single wind code entry: [timestamp, codeValue].
 */
export type CodeEntry = [number, number];

/**
 * A full day of wind code entries.
 */
export type DayOfCodes = CodeEntry[];

/**
 * Complete history: an array of per-day code sequences.
 */
export type Codes = DayOfCodes[];


/**
 * Returns the UNIX timestamp of local midnight in America/Los_Angeles
 * for the given UTC timestamp.
 *
 * @param ts - UTC timestamp in seconds
 * @returns Local midnight timestamp (seconds)
 */
function getLastMidnightLA(ts: number): number {
    // 1) Build a Luxon DateTime in the America/Los_Angeles zone
    const dtLA = DateTime.fromSeconds(ts, { zone: "America/Los_Angeles" });
    // 2) Snap to the start of that local day (i.e. midnight)
    const midnightLA = dtLA.startOf("day");
    // 3) Convert back to a UNIX timestamp (seconds)
    return Math.floor(midnightLA.toSeconds());
}


export default function History() {
    const { pb } = useAuth();
    const [history, setHistory] = useState<Codes>([]);
    const [view, setView] = useState<'line' | 'clock'>('line');
    const [limits, setLimits] = useState<[number, number]>([4, 20]);
    const [midnight, setMidnight] = useState<number>(0);

    // refs + sizes
    const [keyRef, { width: keyWidth }] = useContainerSize<HTMLDivElement>();
    const [chartRef, { width: chartWidth }] = useContainerSize<HTMLDivElement>();


    useEffect(() => {
        const fetchWindCodes = async () => {
            let codes: any;
            try {
                const url = new URL("/getWindTableCodes", import.meta.env.VITE_UPDATE_SERVER_URL);
                const res = await fetch(url.toString());
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const j = await res.json();
                codes = j.codes;
                const mn = getLastMidnightLA(codes[0][0][0]);
                setMidnight(mn)
                setLimits([
                    Math.floor((codes[0][0][0] - mn) / 3600) - 1,
                    Math.ceil((codes[0][codes[0].length - 1][0] - mn) / 3600) + 1]);
            } catch (err: any) {
                console.error(err.message);
                return;
            }
            try {
                const url = new URL("/getForecastCodes", import.meta.env.VITE_UPDATE_SERVER_URL);
                const res = await fetch(url.toString());
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const forecastCodes: any = await res.json();

                // merge codes[codes.length - 1] with forecastCodes
                const lastDay = codes[codes.length - 1]; // which is today
                const today = forecastCodes[0];
                const lastTs = lastDay[lastDay.length - 1][0];
                let idx = 0;
                while (idx < today.length && today[idx][0] < lastTs) idx++;
                while (idx < today.length) {
                    const ts = today[idx][0];
                    const code = today[idx][1];
                    if (ts > lastTs) {
                        lastDay.push([ts, code]);
                    }
                    idx++;
                }
                codes.push(forecastCodes[1]);
                setHistory(codes);
            } catch (err: any) {
                console.error(err.message);
                return;
            }
        };

        fetchWindCodes();
    }, []);


    const toggleView = () => setView((v) => (v === 'line' ? 'clock' : 'line'));

    return (
        <>
            <Row className="history-container mb-3">
                <Col sm={3}>
                    <Button size="sm" onClick={toggleView}>
                        Switch to {view === 'line' ? 'Clock' : 'Line'} View
                    </Button>
                </Col>
                <Col sm={6}>
                    <h4>8 Day History with 2 Day Forecast</h4>
                </Col>
            </Row>

            <div ref={keyRef} className="mb-3">
                <KeyCanvas width={keyWidth} />
            </div>

            <div ref={chartRef} style={{ paddingBottom: '200px' }}>
                {view === 'line'
                    ? history.map((day, i) => (
                        <LineCanvas key={i} data={day} dayStart={midnight + i * (24 * 3600)} limits={limits} width={chartWidth} />
                    ))
                    : (
                        <Row xs={1} sm={2} lg={3} xl={4}>
                            {history.map((day, i) => (
                                <Col key={i} className="mb-4">
                                    <CircleCanvas data={day} dayStart={midnight + i * (24 * 3600)} limits={limits} width={chartWidth / 4} />
                                </Col>
                            ))}
                        </Row>
                    )}
            </div >
        </>
    );
}
