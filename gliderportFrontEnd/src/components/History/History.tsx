/**
 * @packageDocumentation
 *
 * Fetches and displays the last 8 days of wind “codes” plus a 2-day forecast,
 * allowing the user to toggle between a {@link LineCanvas} (horizontal timeline)
 * view and a {@link CircleCanvas} (clock/pie) view.
 *
 * Data is loaded once on mount from two API endpoints:
 * - {@link API.getWindTableCodes} — historical per-day code sequences
 * - {@link API.getForecastCodes}  — two-day forecast sequences, merged into history
 *
 * Container widths are measured via {@link useContainerSize} so that
 * `KeyCanvas`, `LineCanvas`, and `CircleCanvas` all size responsively.
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
import { API } from '@/api';
/**
 * A single wind code entry as a two-element tuple.
 *
 * @example
 * const entry: CodeEntry = [1712000000, 3]; // timestamp (sec), code index
 */
export type CodeEntry = [number, number];

/**
 * All wind code entries for a single calendar day, ordered chronologically.
 */
export type DayOfCodes = CodeEntry[];

/**
 * The full history dataset: one {@link DayOfCodes} array per day,
 * ordered oldest-first.  Includes 8 historical days plus up to 2 forecast days.
 */
export type Codes = DayOfCodes[];

/**
 * Returns the UNIX timestamp (seconds) of local midnight in the
 * `America/Los_Angeles` timezone for the calendar day that contains `ts`.
 *
 * @param ts - Any UTC timestamp in seconds since the Unix epoch.
 * @returns The Unix timestamp (seconds) of 00:00:00 Pacific time on that same day.
 *
 * @example
 * // For a timestamp that is 2024-04-01 08:30 UTC (= 2024-04-01 01:30 LA)
 * getLastMidnightLA(1711960200); // → Unix sec for 2024-04-01 00:00 LA
 */
function getLastMidnightLA(ts: number): number {
    const dtLA = DateTime.fromSeconds(ts, { zone: 'America/Los_Angeles' });
    const midnightLA = dtLA.startOf('day');
    return Math.floor(midnightLA.toSeconds());
}

/**
 * Top-level page component that fetches wind-code history and forecast data,
 * then renders each day using either a {@link LineCanvas} (horizontal timeline)
 * or a {@link CircleCanvas} (clock/pie) depending on the active view mode.
 *
 * @remarks
 * - Data is fetched once on mount (empty dependency array).
 * - Historical codes come from {@link API.getWindTableCodes}; forecast codes
 *   from {@link API.getForecastCodes}.  The first forecast day is merged with
 *   the last historical day, and the second forecast day is appended as its own
 *   entry, yielding up to 10 days total.
 * - Hour `limits` are derived from the first timestamp in the historical data,
 *   padded by one hour on each side, and shared with every child canvas so all
 *   rows display the same time window.
 * - Container widths are measured via {@link useContainerSize} and forwarded to
 *   child canvases so they size responsively without CSS media queries.
 *
 * @returns The full history/forecast panel including the view-toggle button,
 *   a colour-key legend, and one canvas per day.
 */
export function History(): React.ReactElement {
    const { pb } = useAuth();

    /** Ordered array of daily code sequences: 8 historical days + up to 2 forecast days. */
    const [history, setHistory] = useState<Codes>([]);
    /** Active view mode — `'line'` renders {@link LineCanvas}, `'clock'` renders {@link CircleCanvas}. */
    const [view, setView] = useState<'line' | 'clock'>('line');
    /** `[startHourLocal, endHourLocal]` in 24-hour format, shared across all day canvases. */
    const [limits, setLimits] = useState<[number, number]>([4, 20]);
    /** UNIX timestamp (seconds) of local midnight (America/Los_Angeles) for the oldest fetched day. */
    const [midnight, setMidnight] = useState<number>(0);

    const [keyRef, { width: keyWidth }] = useContainerSize<HTMLDivElement>();
    const [chartRef, { width: chartWidth }] = useContainerSize<HTMLDivElement>();

    useEffect(() => {
        /**
         * Fetches historical wind codes and forecast codes, merges them into a
         * single `Codes` array, then updates `history`, `midnight`, and `limits`.
         *
         * Step 1 — historical codes: sets `midnight` and derives `limits` from the
         * first/last timestamps of the earliest day.
         *
         * Step 2 — forecast codes: splices today's forecast entries (after the last
         * historical timestamp) onto the final historical day, and pushes tomorrow's
         * forecast as a new day entry.
         */
        const fetchWindCodes = async () => {
            let codes: Codes;

            try {
                const res = await fetch(API.getWindTableCodes());
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const j = await res.json();
                codes = j.codes;
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

            try {
                const res = await fetch(API.getForecastCodes());
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const forecastCodes: Codes = await res.json();

                // Merge today's forecast into the last (today's) row after the last sensor reading
                const lastDay = codes[codes.length - 1];
                const today = forecastCodes[0];
                const lastTs = lastDay[lastDay.length - 1][0];
                let idx = 0;
                while (idx < today.length && today[idx][0] < lastTs) idx++;
                for (; idx < today.length; idx++) {
                    const [ts, code] = today[idx];
                    if (ts > lastTs) {
                        lastDay.push([ts, code]);
                    }
                }

                setHistory(codes);
            } catch (err: any) {
                console.error('Error fetching forecast codes:', err.message);
                return;
            }
        };

        fetchWindCodes();
    }, []); // Intentionally empty — fetch runs once on mount only.

    /**
     * Toggles the active view between `'line'` ({@link LineCanvas}) and
     * `'clock'` ({@link CircleCanvas}).
     */
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
                    <h4>Last 7 Days + Today</h4>
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
