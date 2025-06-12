/**
 * 
 * @packageDocumentation
 *   Fetches and displays the last 8 days of wind “codes” plus a 2-day forecast,
 *   allowing the user to toggle between a line-chart view and a clock-style view.
 *   Uses three different canvases (KeyCanvas, LineCanvas, CircleCanvas) and
 *   measures container widths to size them responsively.
 */

import React, { useState, useEffect } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useContainerSize } from './useContainerSize';
import KeyCanvas from './KeyCanvas';
import LineCanvas from './LineCanvas';
import CircleCanvas from './CircleCanvas';
import { DateTime } from 'luxon';
import { serverUrl } from "@/components/paths";
/**
 * A single wind code entry: `[timestampSec, codeValue]`.
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
 * @param ts - UTC timestamp (seconds since epoch)
 * @returns Local midnight timestamp (seconds since epoch)
 */
function getLastMidnightLA(ts: number): number {
    // 1) Build a Luxon DateTime in the America/Los_Angeles zone
    const dtLA = DateTime.fromSeconds(ts, { zone: 'America/Los_Angeles' });
    // 2) Snap to the start of that local day (i.e. midnight)
    const midnightLA = dtLA.startOf('day');
    // 3) Convert back to a UNIX timestamp (seconds)
    return Math.floor(midnightLA.toSeconds());
}

/**
 * React component that fetches wind-code history + forecast,
 * and renders either a line or clock view for each day.
 *
 * @component
 * @returns {React.ReactElement}
 */
export function History(): React.ReactElement {
    const { pb } = useAuth();

    /** Array of daily code sequences (8 days + 2-day forecast) */
    const [history, setHistory] = useState<Codes>([]);
    /** Current view mode: 'line' for LineCanvas, 'clock' for CircleCanvas */
    const [view, setView] = useState<'line' | 'clock'>('line');
    /** [startHour, endHour] defining the slice of hours to display */
    const [limits, setLimits] = useState<[number, number]>([4, 20]);
    /** UNIX timestamp (sec) of the most recent local midnight in LA */
    const [midnight, setMidnight] = useState<number>(0);

    // refs + measured container widths
    const [keyRef, { width: keyWidth }] = useContainerSize<HTMLDivElement>();
    const [chartRef, { width: chartWidth }] = useContainerSize<HTMLDivElement>();

    useEffect(() => {
        /**
         * Fetches past codes and forecast codes, merges them,
         * and updates `history`, `midnight`, and `limits`.
         */
        const fetchWindCodes = async () => {
            let codes: Codes;

            // 1) Fetch historical wind codes
            try {
                const url = new URL('/api/getWindTableCodes', serverUrl);
                const res = await fetch(url.toString());
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const j = await res.json();
                codes = j.codes;
                // compute local midnight and hour limits based on first timestamp
                const mn = getLastMidnightLA(codes[0][0][0]);
                setMidnight(mn);
                setLimits([
                    Math.floor((codes[0][0][0] - mn) / 3600) - 1,
                    Math.ceil((codes[0][codes[0].length - 1][0] - mn) / 3600) + 1,
                ]);
            } catch (err: any) {
                console.error('Error fetching wind table codes:', err.message);
                return;
            }

            // 2) Fetch forecast codes and merge into history
            try {
                const url = new URL('/api/getForecastCodes', serverUrl);
                const res = await fetch(url.toString());
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const forecastCodes: Codes = await res.json();

                // merge today's forecast into the last historic day
                const lastDay = codes[codes.length - 1];
                const today = forecastCodes[0];
                const lastTs = lastDay[lastDay.length - 1][0];
                let idx = 0;
                // skip forecast entries that overlap historic data
                while (idx < today.length && today[idx][0] < lastTs) idx++;
                // append only new timestamps
                for (; idx < today.length; idx++) {
                    const [ts, code] = today[idx];
                    if (ts > lastTs) {
                        lastDay.push([ts, code]);
                    }
                }

                // add the second forecast day as its own entry
                codes.push(forecastCodes[1]);

                setHistory(codes);
            } catch (err: any) {
                console.error('Error fetching forecast codes:', err.message);
                return;
            }
        };

        fetchWindCodes();
    }, []);  // note: dependencies intentionally empty so runs once on mount

    /** Toggle between 'line' and 'clock' views */
    const toggleView = () => {
        setView(v => (v === 'line' ? 'clock' : 'line'));
    };

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
                        <LineCanvas
                            key={i}
                            data={day}
                            dayStart={midnight + i * 24 * 3600}
                            limits={limits}
                            width={chartWidth}
                        />
                    ))
                    : (
                        <Row xs={1} sm={2} lg={3} xl={4}>
                            {history.map((day, i) => (
                                <Col key={i} className="mb-4">
                                    <CircleCanvas
                                        data={day}
                                        dayStart={midnight + i * 24 * 3600}
                                        limits={limits}
                                        width={chartWidth / 4}
                                    />
                                </Col>
                            ))}
                        </Row>
                    )}
            </div>
        </>
    );
}

export default History;
