/**
 * 
 * @packageDocumentation
 *   Renders a horizontal time-series view of wind “codes” for a single day.
 *   Each colored segment represents an interval during which a particular code applied,
 *   overlaid on a lightweight line chart (with a transparent dummy line).
 *   Includes custom hour ticks, background slices, and tooltips showing the code label.
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
 * Props for the LineCanvas component.
 *
 * LineCanvasProps
 * {DayOfCodes} data
 *   Array of [absoluteTimestampSec, code] entries for one day.
 * {number} dayStart
 *   UNIX timestamp (seconds) for local midnight of this day.
 * {[number, number]} limits
 *   Tuple [startHourLocal, endHourLocal] in 24h (e.g. [6, 20]).
 * {number} width
 *   Pixel width of the chart container.
 */
interface LineCanvasProps {
    /** Array of [absoluteTimestampSec, code] for one day */
    data: DayOfCodes;
    /** UNIX timestamp (sec) for local midnight of this day */
    dayStart: number;
    /** [startHourLocal, endHourLocal] in 24h hours (e.g. [6, 20]) */
    limits: [number, number];
    /** pixel width of the chart container */
    width: number;
}

/**
 * LineCanvas
 *
 * Displays a compact horizontal chart of wind code intervals between `limits[0]` and `limits[1]` hours.
 * Uses colored ReferenceArea slices for each code segment, hour ticks at the bottom,
 * and a tooltip that shows the code name on hover.
 *
 * @param props - LineCanvasProps
 * @returns {React.ReactElement}
 */
export function LineCanvas({ data, dayStart, limits, width }: LineCanvasProps): React.ReactElement {
    const [startHour, endHour] = limits;
    const startTs = dayStart + 3600 * startHour;
    const endTs = dayStart + 3600 * endHour;
    const totalHours = endHour - startHour;

    // Build ticks: one timestamp per whole hour
    const ticks = useMemo(
        () =>
            Array.from(
                { length: totalHours + 1 },
                (_, i) => startTs + 3600 * i
            ),
        [startTs, totalHours]
    );

    // Compute date label: “Today”, “Tomorrow”, or abbreviated weekday + M/d
    const dateLabel = useMemo(() => {
        const dtNow = new Date();
        const dtStart = new Date(dayStart * 1000 + 12 * 3600 * 1000);
        if (dtNow.toDateString() === dtStart.toDateString()) return 'Today';
        const tomorrow = new Date(dtNow);
        tomorrow.setDate(dtNow.getDate() + 1);
        if (tomorrow.toDateString() === dtStart.toDateString()) return 'Tomorrow';
        return format(dtStart, 'EEE M/d');
    }, [dayStart]);

    // Chart data: include a dummy value (0) so the chart has points for domain inference
    const chartData = useMemo(
        () => data.map(([ts, code]) => ({ ts, code, dummy: 0 })),
        [data]
    );

    // Compute colored background segments between code changes
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
        // final slice to endHour
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
                    {/* transparent dummy line to establish shape */}
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

                    {/* custom tooltip showing code label */}
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
