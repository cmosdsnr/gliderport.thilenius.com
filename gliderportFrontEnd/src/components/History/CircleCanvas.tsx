/**
 * @packageDocumentation
 *
 * Renders a circular (clock-style) pie chart of wind code intervals for a single
 * calendar day using Recharts {@link PieChart}.
 *
 * The chart is composed of two concentric {@link Pie} rings:
 * 1. **Outer tick ring** — a thin ring of equal-width segments, one per hour,
 *    rendered with transparent fills and visible strokes to act as hour markers.
 *    Each segment is labelled with its local hour number.
 * 2. **Inner code ring** — filled segments whose angular width is proportional to
 *    the fraction of the visible time window occupied by each wind code interval.
 *    The final segment always uses the `IT_IS_DARK` colour.
 *
 * A Recharts {@link Label} at the chart centre displays the day name
 * (“Today”, “Tomorrow”, or a formatted weekday/date string).
 *
 * Both rings are wrapped in a square {@link Canvas} element sized to `width × width`.
 */

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

/**
 * Props accepted by the {@link CircleCanvas} component.
 */
export interface CircleCanvasProps {
    /**
     * Ordered array of `[absoluteTimestampSec, codeIndex]` tuples covering one day.
     * Timestamps are Unix seconds (UTC); `codeIndex` indexes into the global `codes` map.
     */
    data: DayOfCodes;
    /**
     * Unix timestamp (seconds) for 00:00:00 local time on this particular day.
     * Used together with `limits` to determine the total visible time window.
     */
    dayStart: number;
    /**
     * `[startHourLocal, endHourLocal]` in 24-hour format defining the visible time window.
     * The pie spans from `dayStart + startHour * 3600` to `dayStart + endHour * 3600`.
     * @example [6, 20] // show 6 AM to 8 PM
     */
    limits: [number, number];
    /**
     * Pixel width (and height) of the square chart container.
     * Both the {@link Canvas} wrapper and the Recharts radii are derived from this value.
     */
    width: number;
}

/**
 * Renders a circular (clock-style) pie chart of wind code intervals for one
 * calendar day.
 *
 * @param props - See {@link CircleCanvasProps}.
 * @returns A square {@link Canvas} element containing a Recharts {@link PieChart}
 *   with an outer hour-tick ring, an inner colour-coded segment ring, and a
 *   centre day label.
 *
 * @remarks
 * The component is exported both as a named export and as a `React.memo`-wrapped
 * default export.  Prefer the default export in parent components to avoid
 * unnecessary re-renders when sibling state changes.
 *
 * The outer tick ring uses `startAngle=80` / `endAngle=-260` so that
 * 12 o'clock roughly corresponds to 4 AM local time (the typical start of the
 * monitored window).  The inner code ring uses the same angles so both rings
 * align correctly.
 *
 * @example
 * <CircleCanvas
 *   data={dayOfCodes}
 *   dayStart={midnight}
 *   limits={[6, 20]}
 *   width={containerWidth / 4}
 * />
 */
export function CircleCanvas({ data, dayStart, limits, width }: CircleCanvasProps): React.ReactElement {
    const [startHour, endHour] = limits;
    const totalSec = (endHour - startHour) * 3600;
    let prevCode = codeDef.IT_IS_DARK;
    let lastTime = dayStart + startHour * 3600;

    /**
     * Pie slice data for the inner code ring.
     *
     * Each slice represents one contiguous interval during which a particular wind
     * code was active.  The `value` field is the interval's duration expressed as a
     * percentage of `totalSec` so that all slices sum to 100.  The final slice
     * always uses the `IT_IS_DARK` colour to cover the period from the last code
     * change to `endHour`.
     */
    const pieData = useMemo(() => {
        const slices: { name: string; value: number; color: string }[] = [];
        prevCode = codeDef.IT_IS_DARK;
        lastTime = dayStart + startHour * 3600;

        data.forEach(([ts, nextCode]) => {
            const span = ts - lastTime;
            slices.push({
                name: `${codes[prevCode].code}`,
                value: (span / totalSec) * 100,
                color: codes[prevCode].color,
            });
            prevCode = nextCode;
            lastTime = ts;
        });

        const remaining = (dayStart + endHour * 3600 - lastTime);
        slices.push({
            name: 'dark',
            value: (remaining / totalSec) * 100,
            color: codes[codeDef.IT_IS_DARK].color,
        });

        return slices;
    }, [data, dayStart, startHour, endHour]);

    /**
     * Human-readable label rendered at the centre of the pie.
     * Returns `”Today”` or `”Tomorrow”` for the current/next calendar day,
     * or a full weekday + date string (e.g. `”Monday 4/7”`) for other days.
     * The first timestamp in `data` (shifted to noon) is used for comparison
     * to avoid DST edge cases near midnight.
     */
    const centerLabel = useMemo(() => {
        const dtNow = new Date();
        const dtTomorrow = new Date(dtNow.getTime() + 24 * 3600 * 1000);
        const dtStart = new Date(data[0][0] * 1000 + 12 * 3600 * 1000);
        if (dtNow.toDateString() === dtStart.toDateString()) return 'Today';
        if (dtTomorrow.toDateString() === dtStart.toDateString()) return 'Tomorrow';
        return format(dtStart, 'EEEE M/d');
    }, [data]);

    /**
     * Segment entries for the outer hour-tick ring — one equal-width segment per
     * hour in the visible window.  Each entry carries its local hour number as
     * `hour` (used by the custom label renderer) and a constant `value` of `1`
     * so all segments are the same angular size.
     *
     * @remarks The dependency array is intentionally empty here, meaning these
     * ticks are computed once on mount and not recalculated if `limits` changes
     * at runtime.  This is an existing behaviour and is not modified by this
     * documentation pass.
     */
    const hourTicks = useMemo(
        () =>
            Array.from(
                { length: endHour - startHour },
                (_, i) => ({ hour: i + startHour, value: 1 })
            ),
        [] // Note: intentionally omits [startHour, endHour] — existing behaviour.
    );

    return (
        <Canvas height={width} width={width}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>

                    {/* Outer ring: one equal-width segment per hour, drawn with visible stroke
                        dividers and numeric labels positioned at the midpoint of each segment. */}
                    <Pie
                        data={hourTicks}
                        dataKey="value"
                        startAngle={80}
                        endAngle={-260}
                        innerRadius={width * 0.45}
                        outerRadius={width * 0.48}
                        isAnimationActive={false}
                        paddingAngle={0}
                        labelLine={false}
                        fill="transparent"
                        stroke="#999"
                        strokeWidth={1}
                        /**
                         * Custom label renderer that places the local hour number at the
                         * angular midpoint of each tick segment, just inside the outer radius.
                         *
                         * @param cx - Centre X of the pie in SVG coordinates.
                         * @param cy - Centre Y of the pie in SVG coordinates.
                         * @param midAngle - The angle (degrees) at the midpoint of this segment.
                         * @param hour - The local hour integer carried by this tick entry.
                         */
                        label={({ cx, cy, midAngle, hour }) => {
                            const RAD = Math.PI / 180;
                            const r = width * 0.46;
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

                    {/* Inner ring: coloured segments proportional to each code interval's duration. */}
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
        </Canvas>
    );
};

export default React.memo(CircleCanvas);
