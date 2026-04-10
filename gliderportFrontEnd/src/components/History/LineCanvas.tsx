/**
 * @packageDocumentation
 *
 * Renders a compact horizontal timeline of wind codes for a single calendar day.
 *
 * Each contiguous interval during which a particular code was active is drawn as a
 * coloured {@link ReferenceArea} band inside a Recharts {@link ComposedChart}.
 * A transparent dummy {@link Line} is included solely to give Recharts enough shape
 * information to infer the chart domain without rendering a visible line.
 *
 * Features:
 * - Hour tick marks along the X axis, labelled as local hour numbers.
 * - A floating date label overlay (“Today”, “Tomorrow”, or abbreviated weekday + date).
 * - A hover tooltip that displays the code name for the segment under the cursor.
 * - All rendering is driven by `useMemo` so expensive segment calculations are
 *   only recomputed when `data`, `dayStart`, or `limits` change.
 */

import React, { useMemo } from 'react';
import {
    ComposedChart,
    XAxis,
    YAxis,
    Line,
    Tooltip,
    ReferenceArea,
    ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { codes, codeDef } from '../Globals';
import { DayOfCodes } from './History';

/**
 * Props accepted by the {@link LineCanvas} component.
 */
export interface LineCanvasProps {
    /**
     * Ordered array of `[absoluteTimestampSec, codeIndex]` tuples covering one day.
     * Timestamps are Unix seconds (UTC); `codeIndex` indexes into the global `codes` map.
     */
    data: DayOfCodes;
    /**
     * Unix timestamp (seconds) for 00:00:00 local time on this particular day.
     * Used to compute the absolute timestamp range of the chart domain and to derive
     * human-readable hour labels on the X axis.
     */
    dayStart: number;
    /**
     * `[startHourLocal, endHourLocal]` in 24-hour format defining the visible time window.
     * @example [6, 20] // show 6 AM to 8 PM
     */
    limits: [number, number];
    /**
     * Pixel width of the outer container.  The chart fills 100 % of this width
     * and renders at a fixed height of 60 px.
     */
    width: number;
}

/**
 * Renders a compact horizontal timeline of wind code intervals for one calendar day.
 *
 * The chart is 60 px tall and fills the provided `width`.  Coloured
 * {@link ReferenceArea} bands occupy the full Y range so the visual result looks
 * like a segmented colour bar rather than a traditional line chart.  A transparent
 * dummy {@link Line} is required by Recharts to establish chart shape and domain.
 *
 * @param props - See {@link LineCanvasProps}.
 * @returns A `div` containing a Recharts {@link ResponsiveContainer} with the
 *   coloured timeline and a floating date label overlay.
 *
 * @remarks
 * The component is exported both as a named export and as a `React.memo`-wrapped
 * default export.  Prefer the default export in parent components to avoid
 * unnecessary re-renders when sibling state changes.
 *
 * @example
 * <LineCanvas
 *   data={dayOfCodes}
 *   dayStart={midnight}
 *   limits={[6, 20]}
 *   width={containerWidth}
 * />
 */
export function LineCanvas({ data, dayStart, limits, width }: LineCanvasProps): React.ReactElement {
    const [startHour, endHour] = limits;
    const startTs = dayStart + 3600 * startHour;
    const endTs = dayStart + 3600 * endHour;
    const totalHours = endHour - startHour;

    /**
     * One Unix-second timestamp per whole hour across the visible window,
     * used as explicit tick positions on the X axis.
     */
    const ticks = useMemo(
        () =>
            Array.from(
                { length: totalHours + 1 },
                (_, i) => startTs + 3600 * i
            ),
        [startTs, totalHours]
    );

    /**
     * Human-readable label for the day: `”Today”`, `”Tomorrow”`, or an
     * abbreviated weekday + date string (e.g. `”Mon 4/7”`).
     * Computed by comparing `dayStart` (shifted to noon to avoid DST edge cases)
     * against the current and next calendar day.
     */
    const dateLabel = useMemo(() => {
        const dtNow = new Date();
        const dtStart = new Date(dayStart * 1000 + 12 * 3600 * 1000);
        if (dtNow.toDateString() === dtStart.toDateString()) return 'Today';
        const tomorrow = new Date(dtNow);
        tomorrow.setDate(dtNow.getDate() + 1);
        if (tomorrow.toDateString() === dtStart.toDateString()) return 'Tomorrow';
        return format(dtStart, 'EEE M/d');
    }, [dayStart]);

    /**
     * Chart-ready data points, each carrying the original `ts` (X value),
     * `code` index, and a constant `dummy` value of `0` for the transparent line.
     */
    const chartData = useMemo(
        () => data.map(([ts, code]) => ({ ts, code, dummy: 0 })),
        [data]
    );

    /**
     * Ordered list of coloured segments between consecutive code changes.
     * Each segment covers the half-open interval `[x1, x2)` on the X axis
     * and is filled with the colour associated with the code that was active
     * during that interval.  The final segment always uses the `IT_IS_DARK`
     * colour to fill from the last code change to `endTs`.
     */
    const segments = useMemo(() => {
        const segs: { x1: number; x2: number; color: string }[] = [];
        let prevCode = codeDef.IT_IS_DARK;
        let prevTs = startTs;
        data.forEach(([ts, nextCode]) => {
            const color = codes[prevCode]?.color ?? '#ccc';
            segs.push({ x1: prevTs, x2: ts, color });
            prevCode = nextCode;
            prevTs = ts;
        });
        segs.push({ x1: prevTs, x2: endTs, color: codes[codeDef.IT_IS_DARK].color });
        return segs;
    }, [data, startTs, endTs]);

    return (
        <div style={{ width, height: 60, position: 'relative' }}>
            {/* date label overlay */}
            <div
                style={{
                    position: 'absolute',
                    top: 4,
                    left: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 12,
                    fontFamily: 'Verdana',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }}
            >
                {dateLabel}
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 0, right: 10, left: 10, bottom: 5 }}
                >
                    <XAxis
                        dataKey="ts"
                        type="number"
                        domain={[startTs, endTs]}
                        ticks={ticks}
                        tickFormatter={(h) => `${(h - dayStart) / 3600}`}
                        axisLine={false}
                        tickLine={{ stroke: '#ccc' }}
                        height={20}
                        allowDataOverflow
                        interval={0}
                    />
                    <YAxis type="number" domain={[0, 1]} hide />
                    {/* Transparent dummy line — required by Recharts to infer chart domain */}
                    <Line
                        type="monotone"
                        dataKey="dummy"
                        stroke="transparent"
                        dot={false}
                        isAnimationActive={false}
                    />
                    {segments.map((s, i) => (
                        <ReferenceArea key={i} x1={s.x1} x2={s.x2} y1={0} y2={1} fill={s.color} />
                    ))}

                    {/* Tooltip renders the human-readable code name for the hovered segment */}
                    <Tooltip
                        cursor={false}
                        content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null;
                            const { code } = payload[0].payload as any;
                            return (
                                <div
                                    style={{
                                        background: 'rgba(255,255,255,0.9)',
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        fontSize: 12,
                                    }}
                                >
                                    <div>{codes[code].code}</div>
                                </div>
                            );
                        }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default React.memo(LineCanvas);
