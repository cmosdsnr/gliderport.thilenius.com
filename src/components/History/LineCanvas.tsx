// src/components/LineCanvas.tsx
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
const LineCanvas: React.FC<LineCanvasProps> = ({ data, dayStart, limits, width }) => {

    const startTs = Number(dayStart + 3600 * limits[0]);
    const endTs = Number(dayStart + 3600 * limits[1]);
    const totalHours = limits[1] - limits[0];

    // Build ticks: one mark per whole hour
    const ticks = useMemo(
        () => Array.from({ length: totalHours + 1 }, (_, i) => startTs + 3600 * i),
        [startTs, endTs]
    );

    // Compute date label (Today/Tomorrow or weekday + M/d)
    const dateLabel = useMemo(() => {
        const dtNow = new Date();
        const dtStart = new Date(dayStart * 1000 + 12 * 3600 * 1000);
        if (dtNow.toDateString() === dtStart.toDateString()) return 'Today';
        const tomorrow = new Date(dtNow);
        tomorrow.setDate(dtNow.getDate() + 1);
        if (tomorrow.toDateString() === dtStart.toDateString()) return 'Tomorrow';
        return format(dtStart, 'EEE M/d');
    }, [dayStart]);

    // chartData: one point per boundary (for domain inference) in seconds
    const chartData = useMemo(
        () => data.map(([ts, code]) => ({ ts, code, dummy: 0 })),
        [data]
    );

    // segments: colored background slices between code changes
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
    }, [data, dayStart, startTs, endTs]);

    return (
        <div style={{ width, height: 60, position: 'relative' }}>
            {/* date label */}
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
                <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 5 }}>
                    <XAxis
                        dataKey="ts"
                        type="number"
                        domain={[startTs, endTs]}
                        ticks={ticks}
                        tickFormatter={h => `${(h - dayStart) / 3600}`}
                        axisLine={false}
                        tickLine={{ stroke: '#ccc' }}
                        height={20}
                        allowDataOverflow={true}
                        interval={0}
                    />
                    <YAxis type="number" domain={[0, 1]} hide />
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

                    {/* custom tooltip */}
                    <Tooltip
                        cursor={false}
                        content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null;
                            // payload[0].payload is the full data object: { ts, code, dummy }
                            const { code } = payload[0].payload as any;
                            const hh = Math.floor(label);
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