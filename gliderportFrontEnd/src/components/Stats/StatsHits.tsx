// StatsHitsComponent.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import { useStatusCollection } from 'contexts/StatusCollection';
import StatsPlot from './StatsHitsPlot';
import { DateTime } from 'luxon';

type ViewOption = 'day' | 'week' | 'month';
type MetricOption = 'total' | 'unique';

/**
 * StatsHitsComponent displays site statistics and a chart of visits.
 * Allows toggling between day/week/month and total/unique metrics.
 * @returns {React.ReactElement} The rendered stats hits component.
 */
export function StatsHitsComponent(): React.ReactElement {
    const { siteHits } = useStatusCollection();

    // 1) New state for "view" (day/week/month) and "metric" (total/unique)
    const [view, setView] = useState<ViewOption>('week');
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

    // 2) chartPoints: pick day/ week/ month and total/ unique based on both state vars
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
