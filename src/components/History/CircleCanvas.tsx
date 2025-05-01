// src/components/CircleCanvas.tsx
import React, { useMemo } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Label,
    ResponsiveContainer,
} from 'recharts';
import Canvas from './Canvas';
import { codes, codeDef } from '../Globals';
import { format } from 'date-fns';
import { DayOfCodes } from './History';

interface CircleCanvasProps {
    /** Array of [absoluteTimestampSec, code] for one day */
    data: DayOfCodes;
    /** UNIX timestamp (sec) for local midnight of this day */
    dayStart: number;
    /** [startHourLocal, endHourLocal] in 24h hours (e.g. [6, 20]) */
    limits: [number, number];
    /** pixel width of the chart container */
    width: number;
}

const CircleCanvas: React.FC<CircleCanvasProps> = ({ data, dayStart, limits, width }) => {
    const [startHour, endHour] = limits;
    const totalSec = (endHour - startHour) * 3600;
    let prevCode = codeDef.IT_IS_DARK;
    let lastTime = dayStart + startHour * 3600;

    // Build slices (percent of totalSec)
    const pieData = useMemo(() => {
        const slices: { name: string; value: number; color: string }[] = [];
        prevCode = codeDef.IT_IS_DARK;
        lastTime = dayStart + startHour * 3600;

        data.forEach(([ts, nextCode], idx) => {
            const span = ts - lastTime;
            slices.push({
                name: `${codes[prevCode].code}`,
                value: (span / totalSec) * 100,
                color: codes[prevCode].color,
            });
            prevCode = nextCode;
            lastTime = ts;
        });

        // final dark slice
        const remaining = (dayStart + endHour * 3600 - lastTime);
        slices.push({
            name: 'dark',
            value: (remaining / totalSec) * 100,
            color: codes[codeDef.IT_IS_DARK].color,
        });

        return slices;
    }, [data, dayStart, startHour, endHour]);

    // Center label
    const centerLabel = useMemo(() => {
        const dtNow = new Date();
        const dtTomorrow = new Date(dtNow.getTime() + 24 * 3600 * 1000);
        const dtStart = new Date(data[0][0] * 1000 + 12 * 3600 * 1000);
        if (dtNow.toDateString() === dtStart.toDateString()) return 'Today';
        if (dtTomorrow.toDateString() === dtStart.toDateString()) return 'Tomorrow';
        return format(dtStart, 'EEEE M/d');
    }, [data]);


    const hourTicks = useMemo(
        () => Array.from({ length: endHour - startHour }, (_, hour) => ({ hour: hour + startHour, value: 1 })),
        []
    );

    return (
        <Canvas height={width} width={width}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>

                    {/* ──────────── HOUR TICKS ──────────── */}
                    <Pie
                        data={hourTicks}
                        dataKey="value"
                        startAngle={80}
                        endAngle={-260}
                        // a thin ring just outside your main pie:
                        innerRadius={width * 0.45}
                        outerRadius={width * 0.48}
                        isAnimationActive={false}
                        paddingAngle={0}
                        labelLine={false}
                        // transparent fill so only stroke shows:
                        fill="transparent"
                        stroke="#999"
                        strokeWidth={1}
                        // custom label at each tick’s mid-angle:
                        label={({ cx, cy, midAngle, hour }) => {
                            const RAD = Math.PI / 180;
                            const r = width * 0.46;            // push labels just outside the ring
                            const x = cx + r * Math.cos(-midAngle * RAD);
                            const y = cy + r * Math.sin(-midAngle * RAD);
                            return (
                                <text
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{ fontSize: 10, pointerEvents: 'none' }}
                                >
                                    {hour}
                                </text>
                            );
                        }}
                    >
                        {hourTicks.map((_, i) => (
                            <Cell key={`tick-cell-${i}`} />
                        ))}
                    </Pie>
                    <Pie
                        data={pieData}
                        dataKey="value"
                        innerRadius={width * 0.3}
                        outerRadius={width * 0.45}
                        startAngle={80}
                        endAngle={-260}
                        paddingAngle={0}
                        isAnimationActive={false}
                        labelLine={false}
                    >
                        {pieData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                        <Label
                            position="center"
                            content={() => (
                                <text
                                    x={width / 2}
                                    y={width / 2}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{ fontSize: '14px', pointerEvents: 'none' }}
                                >
                                    {centerLabel}
                                </text>
                            )}
                        />
                    </Pie>
                    <Tooltip formatter={(val: number) => ``} separator="" />
                </PieChart>
            </ResponsiveContainer>
        </Canvas >
    );
};

export default React.memo(CircleCanvas);
