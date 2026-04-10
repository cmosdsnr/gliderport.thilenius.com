/**
 * @packageDocumentation
 * Site-traffic statistics component.  Fetches hit data from the
 * `StatusCollection` context and renders a summary table plus an interactive
 * chart that can be filtered by time granularity and metric type.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import { useStatusCollection } from 'contexts/StatusCollection';
import StatsPlot from './StatsHitsPlot';
import { DateTime } from 'luxon';

/** Chart time-granularity options available to the user. */
type ViewOption = 'day' | 'week' | 'month';
/** Metric displayed in the chart: all visits or unique-IP visits. */
type MetricOption = 'total' | 'unique';

/**
 * Displays a site-traffic summary table and an interactive time-series chart.
 *
 * @remarks
 * Reads `siteHits` from {@link useStatusCollection} and rebuilds derived state
 * (summaries, chart arrays, labels) whenever `siteHits.timestamp` changes.
 * The user can switch chart granularity between day / week / month and toggle
 * between total visits and unique-IP visits.  The chart itself is rendered by
 * `StatsPlot` which receives a `[timestamp, value][]` array.
 *
 * @returns The rendered statistics panel including table and chart.
 *
 * @example
 * ```tsx
 * <StatsHitsComponent />
 * ```
 */
export function StatsHitsComponent(): React.ReactElement {
    const { siteHits } = useStatusCollection();

    /** Currently selected time granularity for the chart. */
    const [view, setView] = useState<ViewOption>('week');
    /** Currently selected metric for the chart (total hits or unique IPs). */
    const [metric, setMetric] = useState<MetricOption>('total');

    const [data, setData] = useState<{
        month: { total: number[]; unique: number[]; start: number };
        week: { total: number[]; unique: number[]; start: number };
        day: { total: number[]; unique: number[]; start: number };
        monthSummary: { total: number; unique: number; label: string };
        weekSummary: { total: number; unique: number; startLabel: string; stopLabel: string };
        daySummary: { total: number; unique: number; startLabel: string; stopLabel: string };
        all: { total: number; unique: number };
        lastResetLabel: string;
    }>({
        month: { total: [], unique: [], start: 0 },
        week: { total: [], unique: [], start: 0 },
        day: { total: [], unique: [], start: 0 },
        monthSummary: { total: 0, unique: 0, label: '' },
        weekSummary: { total: 0, unique: 0, startLabel: '', stopLabel: '' },
        daySummary: { total: 0, unique: 0, startLabel: '', stopLabel: '' },
        all: { total: 0, unique: 0 },
        lastResetLabel: '',
    });
    const [timestamp, setTimestamp] = useState<number>(0);

    useEffect(() => {
        if (!siteHits?.days || !siteHits?.weeks || !siteHits?.months) {
            console.warn('No site hits data available');
            return;
        }
        if (siteHits.timestamp === timestamp) {
            console.log('No new site hits data, skipping update');
            return;
        }

        setTimestamp(siteHits.timestamp);
        console.log('Updating site hits data @', siteHits.timestamp);

        // Convert raw start‐timestamps into Luxon DateTimes (PST)
        const monthStartDT = DateTime.fromMillis(siteHits.months.start, {
            zone: 'America/Los_Angeles',
        });
        const weekStartDT = DateTime.fromMillis(siteHits.weeks.start, {
            zone: 'America/Los_Angeles',
        });
        const dayStartDT = DateTime.fromMillis(siteHits.days.start, {
            zone: 'America/Los_Angeles',
        });

        // Build “summary” objects for day/week/month
        const lastMonthIndex = siteHits.months.total.length - 1;
        const monthSummary = {
            total: siteHits.months.total[lastMonthIndex],
            unique: siteHits.months.unique[lastMonthIndex],
            label: monthStartDT
                .plus({ months: lastMonthIndex })
                .monthLong || '',
        };

        const lastWeekIndex = siteHits.weeks.total.length - 1;
        const weekSummary = {
            total: siteHits.weeks.total[lastWeekIndex],
            unique: siteHits.weeks.unique[lastWeekIndex],
            startLabel: weekStartDT
                .plus({ weeks: lastWeekIndex })
                .toLocaleString(DateTime.DATE_SHORT),
            stopLabel: weekStartDT
                .plus({ weeks: lastWeekIndex + 1 })
                .minus({ days: 1 })
                .toLocaleString(DateTime.DATE_SHORT),
        };

        const lastDayIndex = siteHits.days.total.length - 1;
        const daySummary = {
            total: siteHits.days.total[lastDayIndex],
            unique: siteHits.days.unique[lastDayIndex],
            startLabel: dayStartDT
                .plus({ days: lastDayIndex })
                .toLocaleString(DateTime.DATE_SHORT),
            stopLabel: dayStartDT
                .plus({ days: lastDayIndex + 1 })
                .toLocaleString(DateTime.DATE_SHORT),
        };

        // Store raw arrays (we’ll pick total vs. unique later)
        const month = {
            start: siteHits.months.start,
            total: siteHits.months.total,
            unique: siteHits.months.unique,
        };
        const week = {
            start: siteHits.weeks.start,
            total: siteHits.weeks.total,
            unique: siteHits.weeks.unique,
        };
        const day = {
            start: siteHits.days.start,
            total: siteHits.days.total,
            unique: siteHits.days.unique,
        };

        // Sum across all months for "all"
        const totalSum = siteHits.months.total.reduce((acc: number, curr: number) => acc + curr, 0);
        const uniqueSum = siteHits.months.unique.reduce((acc: number, curr: number) => acc + curr, 0);

        // Format lastReset as MM/DD/YYYY
        const lastResetLabel = DateTime.fromMillis(siteHits.lastReset, {
            zone: 'America/Los_Angeles',
        }).toLocaleString(DateTime.DATE_SHORT);

        setData({
            month,
            week,
            day,
            monthSummary,
            weekSummary,
            daySummary,
            all: { total: totalSum, unique: uniqueSum },
            lastResetLabel,
        });
    }, [siteHits?.timestamp]);

    /**
     * Derives the chart data points from the current `view` and `metric` selections.
     * Each element is a `[epochMs, value]` tuple where `epochMs` is the start of the
     * bucket and `value` is the hit count for that bucket.
     */
    const chartPoints = useMemo<[number, number][]>(() => {
        if (view === 'day') {
            return data.day[metric].map((val, i) => [
                data.day.start + i * 24 * 3600 * 1000,
                val,
            ]);
        }
        if (view === 'week') {
            return data.week[metric].map((val, i) => [
                data.week.start + i * 7 * 24 * 3600 * 1000,
                val,
            ]);
        }
        // month:
        return data.month[metric].map((val, i) => [
            data.month.start + i * 30 * 24 * 3600 * 1000,
            val,
        ]);
    }, [data, view, metric]);

    return (
        <>
            <Row>
                <Col xs={12} className="greyBackground">
                    <h4>Site Statistics:</h4>
                    <center>
                        <table className="stats-table">
                            <tbody>
                                <tr>
                                    <th></th>
                                    <th>all</th>
                                    <th>unique IP’s</th>
                                </tr>
                                <tr>
                                    <th>
                                        Daily Visits {data.daySummary.startLabel}
                                    </th>
                                    <th>{data.daySummary.total}</th>
                                    <th>{data.daySummary.unique}</th>
                                </tr>
                                <tr>
                                    <th>
                                        Weekly Visits {data.weekSummary.startLabel}-
                                        {data.weekSummary.stopLabel}
                                    </th>
                                    <th>{data.weekSummary.total}</th>
                                    <th>{data.weekSummary.unique}</th>
                                </tr>
                                <tr>
                                    <th>
                                        Monthly Visits ({data.monthSummary.label})
                                    </th>
                                    <th>{data.monthSummary.total}</th>
                                    <th>{data.monthSummary.unique}</th>
                                </tr>
                                <tr>
                                    <th>Total visits:</th>
                                    <th>{data.all.total}</th>
                                    <th>{data.all.unique}</th>
                                </tr>
                                <tr>
                                    <th>Last reset:</th>
                                    <th>{data.lastResetLabel}</th>
                                </tr>
                            </tbody>
                        </table>
                    </center>
                </Col>
            </Row>

            <Row>
                <Col xs={12}>
                    {/* ─── Both radio groups in a single flex container ─────────────────── */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                            marginTop: 10,
                        }}
                    >
                        {/* ─── Top‐Left: Day / Week / Month ────────────── */}
                        <Form>
                            <Form.Check
                                inline
                                label="Day"
                                name="granularity"
                                type="radio"
                                id="radio-day"
                                value="day"
                                checked={view === 'day'}
                                onChange={() => setView('day')}
                            />
                            <Form.Check
                                inline
                                label="Week"
                                name="granularity"
                                type="radio"
                                id="radio-week"
                                value="week"
                                checked={view === 'week'}
                                onChange={() => setView('week')}
                            />
                            <Form.Check
                                inline
                                label="Month"
                                name="granularity"
                                type="radio"
                                id="radio-month"
                                value="month"
                                checked={view === 'month'}
                                onChange={() => setView('month')}
                            />
                        </Form>

                        {/* ─── Top‐Right: Total / Unique ───────────────── */}
                        <Form>
                            <Form.Check
                                inline
                                label="Total"
                                name="metric"
                                type="radio"
                                id="radio-total"
                                value="total"
                                checked={metric === 'total'}
                                onChange={() => setMetric('total')}
                            />
                            <Form.Check
                                inline
                                label="Unique"
                                name="metric"
                                type="radio"
                                id="radio-unique"
                                value="unique"
                                checked={metric === 'unique'}
                                onChange={() => setMetric('unique')}
                            />
                        </Form>
                    </div>

                    {/* ─── Chart container ───────────────────────────────────────────────── */}
                    <div style={{ width: '100%', height: 400 }}>
                        <StatsPlot data={chartPoints} />
                    </div>
                </Col>
            </Row>
        </>
    );
};

export default StatsHitsComponent;
