/**
 * @file FilterFrequencyResponse.tsx
 * @module FilterFrequencyResponse
 *
 * @description
 * React component that visualizes:
 * - Frequency response of a digital filter in dB vs frequency
 * - Raw wind speed readings over time with min/max envelopes
 * - Binned & interpolated wind speed (speed, filtered, envelopes)
 * - Filtered wind direction over time
 *
 * Uses Recharts for rendering line charts and Luxon for timestamp formatting.
 */
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import { getFilter } from '@/contexts/filters';
import { useSensorData } from '@/contexts/SensorDataContext';
import type { Reading } from '@/contexts/SensorDataContext';
import { DateTime } from 'luxon';

/**
 * Frequency response data point: frequency in Hz and magnitude in dB.
 */
interface FrequencyResponseData {
    /** Frequency at this point (Hz) */
    frequency: number;
    /** Magnitude of response (dB) */
    magnitude: number;
}

/**
 * Combined data point for time-series charts.
 */
interface DataPoint {
    /** Formatted time string (MM/dd HH:mm) */
    time: string;
    /** (unfiltered) speed */
    speed: number;
    direction: number;
    temperature: number;
    humidity: number;
    pressure: number;
    min: number;
    /** Maximum speed envelope */
    max: number;
    /** Filtered speed */
    filtered: number;
    /** Filtered minimum envelope */
    minFiltered: number;
    /** Filtered maximum envelope */
    maxFiltered: number;
    /** Filtered direction */
    directionFiltered: number;
}

/**
 * Input type for raw readings: formatted time and speed, with optional envelopes.
 */
interface RawReading {
    time: string;
    speed: number;
    min?: number;
    max?: number;
}

/**
 * Component that renders charts for frequency response and time-series data.
 */
const FilterFrequencyResponse: React.FC = (): React.JSX.Element => {
    const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
    const { readings } = useSensorData();
    const filter = getFilter();

    /**
     * Compute raw readings formatted to MM/dd HH:mm.
     */
    const rawData: RawReading[] = useMemo(
        () => readings.map(r => ({
            time: DateTime.fromSeconds(r.time).toFormat('MM/dd HH:mm'),
            speed: r.speed
        })),
        [readings]
    );

    /**
     * Format X-axis labels: show hour in 24h (padded), except hour 0 as full date.
     * E.g. “02”, “04”, … “22”, and at midnight “05/12/2025”.
     */
    const tickFormatter = (timeStr: string) => {
        const dt = DateTime.fromFormat(timeStr, 'MM/dd HH:mm');
        return dt.hour === 0
            ? dt.toFormat('MM/dd/yyyy')
            : dt.hour.toString().padStart(2, '0');
    };

    const tickFreqFormatter = (f: number) => {
        if (f === 0) return '';
        const r = Math.round(1 / f) / 60;
        return r.toFixed(2) + ' min';
    };

    /**
     * Compute frequency response of FIR filter.
     */
    const frequencyResponse = useMemo<FrequencyResponseData[]>(() => {
        const Fs = 1 / 60; // Sampling frequency (Hz), one sample per minute
        const numPoints = 512;
        const resp: FrequencyResponseData[] = [];
        for (let i = 0; i < numPoints; i++) {
            const freqHz = (i / (numPoints - 1)) * (Fs / 2);
            const omega = (2 * Math.PI * freqHz) / Fs;
            let real = 0;
            let imag = 0;
            filter.forEach((coef, n) => {
                real += coef * Math.cos(omega * n);
                imag -= coef * Math.sin(omega * n);
            });
            const mag = Math.sqrt(real * real + imag * imag);
            const db = Math.max(20 * Math.log10(Math.max(mag, 1e-10)), -100);
            resp.push({
                frequency: freqHz,
                magnitude: parseFloat(db.toFixed(2))
            });
        }
        // debugger
        return resp;
    }, [filter]);

    // Speed chart: domain from 0 to 12 mph, ticks every 2 mph.
    const speedDomain: [number, number] = [0, 12];
    const speedTicks = Array.from({ length: 7 }, (_, i) => i * 2);

    /**
     * Bin, average, interpolate, and filter raw readings to create DataPoint series.
     */
    const Data: DataPoint[] = useMemo(() => {
        if (readings.length < 2) return [];
        const N = 15;
        const windowSec = N * 60;
        const totalTime = readings[readings.length - 1].time - readings[0].time;
        const targetPoints = 1440;
        const binSize = Math.ceil(totalTime / targetPoints);

        type BinAcc = {
            timeSum: number;
            speedSum: number;
            directionSum: number;
            temperatureSum: number;
            humiditySum: number;
            pressureSum: number;
            weight: number;
        };
        const bins: BinAcc[] = [];
        let binStart = readings[0].time;
        let binEnd = binStart + binSize;
        let acc: Reading = { time: 0, speed: 0, direction: 0, humidity: 0, temperature: 0, pressure: 0 }, count = 0;

        readings.forEach(r => {
            if (r.time < binEnd) {
                acc.time += r.time;
                acc.speed += r.speed;
                acc.direction += r.direction;
                acc.temperature += r.temperature;
                acc.humidity += r.humidity;
                acc.pressure += r.pressure;
                count++;
            } else {
                if (count > 0) {
                    bins.push({
                        timeSum: acc.time,
                        speedSum: acc.speed,
                        directionSum: acc.direction,
                        temperatureSum: acc.temperature,
                        humiditySum: acc.humidity,
                        pressureSum: acc.pressure,
                        weight: count
                    });
                }
                binStart = r.time;
                binEnd = binStart + binSize;
                acc.time = r.time;
                acc.speed = r.speed;
                acc.direction = r.direction;
                acc.temperature = r.temperature;
                acc.humidity = r.humidity;
                acc.pressure = r.pressure;
                count = 1;
            }
        });
        if (count > 0) {
            bins.push({
                timeSum: acc.time,
                speedSum: acc.speed,
                directionSum: acc.direction,
                temperatureSum: acc.temperature,
                humiditySum: acc.humidity,
                pressureSum: acc.pressure,
                weight: count
            });
        }

        const averaged: Reading[] = bins.map(b => ({
            time: b.timeSum / b.weight,
            speed: b.speedSum / b.weight,
            direction: b.directionSum / b.weight,
            temperature: b.temperatureSum / b.weight,
            humidity: b.humiditySum / b.weight,
            pressure: b.pressureSum / b.weight
        }));

        const start = Math.floor(averaged[0].time / 60) * 60;
        const end = Math.floor(averaged[averaged.length - 1].time / 60) * 60;
        const oneMinute = 60;
        const interpolated: Reading[] = [];

        let idx = 0;
        for (let t = start; t <= end; t += oneMinute) {
            while (idx < averaged.length - 1 && averaged[idx + 1].time < t) idx++;
            const r1 = averaged[idx];
            const r2 = averaged[Math.min(idx + 1, averaged.length - 1)];
            if (!r1 || !r2 || r1.time === r2.time) continue;
            const ratio = (t - r1.time) / (r2.time - r1.time);
            interpolated.push({
                time: t,
                speed: r1.speed + ratio * (r2.speed - r1.speed),
                direction: r1.direction + ratio * (r2.direction - r1.direction),
                temperature: r1.temperature + ratio * (r2.temperature - r1.temperature),
                humidity: r1.humidity + ratio * (r2.humidity - r1.humidity),
                pressure: r1.pressure + ratio * (r2.pressure - r1.pressure),
            });
        }

        const minMaxMap = interpolated.map(({ time }) => {
            const windowStart = time - windowSec;
            const windowEnd = time + windowSec;
            const inWindow = readings.filter(
                r => r.time >= windowStart && r.time <= windowEnd
            );
            const speeds = inWindow.map(r => r.speed);
            return {
                min: speeds.length ? Math.min(...speeds) : 0,
                max: speeds.length ? Math.max(...speeds) : 0
            };
        });

        const filteredAcc: Record<string, number[]> = {
            speed: [],
            direction: [],
            min: [],
            max: []
        };
        const halfLen = Math.floor(filter.length / 2);
        interpolated.forEach((_, i) => {
            let acc = { speed: 0, direction: 0, min: 0, max: 0 };
            for (let j = 0; j < filter.length; j++) {
                const k = Math.max(
                    0,
                    Math.min(i + j - halfLen, interpolated.length - 1)
                );
                acc.speed += filter[j] * interpolated[k].speed;
                acc.direction += filter[j] * interpolated[k].direction;
                acc.min += filter[j] * minMaxMap[k].min;
                acc.max += filter[j] * minMaxMap[k].max;
            }
            filteredAcc.speed.push(acc.speed);
            filteredAcc.direction.push(acc.direction);
            filteredAcc.min.push(acc.min);
            filteredAcc.max.push(acc.max);
        });

        return interpolated.map((pt, i) => ({
            time: DateTime.fromSeconds(pt.time).toFormat('MM/dd HH:mm'),
            speed: pt.speed,
            direction: pt.direction,
            min: minMaxMap[i].min,
            max: minMaxMap[i].max,
            filtered: filteredAcc.speed[i],
            minFiltered: filteredAcc.min[i],
            maxFiltered: filteredAcc.max[i],
            directionFiltered: Math.round(filteredAcc.direction[i]),
            temperature: pt.temperature,
            humidity: pt.humidity,
            pressure: pt.pressure
        }));
    }, [readings, filter]);

    /**
     * Build consistent 2-hour ticks: from earliest even hour to latest, stepping by 2h.
     */
    const xTicks2h = useMemo(() => {
        if (Data.length === 0) return [];
        const times = Data.map(d => DateTime.fromFormat(d.time, 'MM/dd HH:mm'));
        const first = times[0].startOf('hour');
        const last = times[times.length - 1].startOf('hour');
        // Align to next even hour if needed
        const start = first.hour % 2 === 0 ? first : first.plus({ hours: 1 });
        const ticks: string[] = [];
        for (let dt = start; dt <= last; dt = dt.plus({ hours: 2 })) {
            ticks.push(dt.toFormat('MM/dd HH:mm'));
        }
        return ticks;
    }, [Data]);

    // somewhere at top of your file
    const tooltipFreqFormatter = (rawFreq: number) => {
        // rawFreq is the dataKey value -- here frequency in Hz
        const periodMin = 1 / (rawFreq * 60);      // seconds → minutes
        return periodMin.toFixed(2) + ' min';      // “0.50 min”, etc.
    };


    return (
        <>
            {/* Frequency response chart */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={frequencyResponse}
                    margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="frequency"
                        type="number"
                        domain={[0, 1 / 120]}
                        ticks={Array.from({ length: 11 }, (_, i) => i * 1 / 1200)}
                        label={{ value: '1/Frequency (min)', position: 'insideBottom', dy: 30 }}
                        tickFormatter={tickFreqFormatter}
                    />
                    <YAxis
                        domain={[0, 10]}
                        ticks={[-100, -80, -60, -40, -20, 0, 20]}
                        label={{ value: 'Magnitude (dB)', angle: -90, position: 'insideLeft', dx: -10 }}
                    />
                    <YAxis orientation="right" domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                    <Tooltip
                        labelFormatter={tooltipFreqFormatter}
                        formatter={(v: number) => `${v.toFixed(2)} dB`} />
                    <Line type="monotone" dataKey="magnitude" dot={false} stroke="#8884d8" />
                </LineChart>
            </ResponsiveContainer>

            {/* Raw speed with envelope */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={rawData.map(r => ({
                        ...r,
                        min: Data.find(d => d.time === r.time)?.minFiltered,
                        max: Data.find(d => d.time === r.time)?.maxFiltered
                    }))}
                    margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="time"
                        ticks={xTicks2h}
                        tickFormatter={tickFormatter}
                        allowDuplicatedCategory={false}
                    />
                    <YAxis
                        domain={speedDomain}
                        ticks={speedTicks}
                        label={{ value: 'Speed (mph)', angle: -90, position: 'insideLeft', dx: -10 }}
                    />
                    <YAxis orientation="right" domain={speedDomain} ticks={speedTicks} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}`} />
                    <Legend
                        onClick={(e: any) => {
                            // e.dataKey is the name you gave each Line
                            setHiddenLines(h => ({
                                ...h,
                                [e.dataKey!]: !h[e.dataKey!]
                            }));
                        }}
                    />
                    <Line type="monotone" dataKey="speed" hide={hiddenLines['speed']} dot={false} name="Raw Speed" />
                    <Line type="monotone" dataKey="min" hide={hiddenLines['min']} dot={false} name="Min" />
                    <Line type="monotone" dataKey="max" hide={hiddenLines['max']} dot={false} name="Max" />
                </LineChart>
            </ResponsiveContainer>


            {/* Filtered speed & envelopes chart */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={Data} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="time"
                        ticks={xTicks2h}
                        tickFormatter={tickFormatter}
                        allowDuplicatedCategory={false}
                    />
                    <YAxis
                        domain={speedDomain}
                        ticks={speedTicks}
                        label={{ value: 'Speed (mph)', angle: -90, position: 'insideLeft', dx: -10 }}
                    />
                    <YAxis orientation="right" domain={speedDomain} ticks={speedTicks} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}`} />
                    <Legend
                        onClick={(e: any) => {
                            // e.dataKey is the name you gave each Line
                            setHiddenLines(h => ({
                                ...h,
                                [e.dataKey!]: !h[e.dataKey!]
                            }));
                        }}
                    />
                    <Line type="monotone" dataKey="filtered" stroke="#82ca9d" hide={hiddenLines['filtered']} dot={false} name="Filtered" />
                    <Line type="monotone" dataKey="maxFiltered" stroke="#82ca9d" hide={hiddenLines['maxFiltered']} dot={false} name="MaxFiltered" />
                    <Line type="monotone" dataKey="minFiltered" stroke="#82ca9d" hide={hiddenLines['minFiltered']} dot={false} name="MinFiltered" />
                </LineChart>
            </ResponsiveContainer>

            {/* Direction chart */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={Data} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="time"
                        ticks={xTicks2h}
                        tickFormatter={tickFormatter}
                        allowDuplicatedCategory={false}
                    />
                    <YAxis
                        domain={[0, 450]}
                        ticks={[0, 90, 180, 270, 360, 450]}
                        label={{ value: 'Direction (°)', angle: -90, position: 'insideLeft', dx: -10 }}
                    />
                    <YAxis orientation="right" domain={[0, 450]} ticks={[0, 90, 180, 270, 360, 450]} />
                    <Tooltip />
                    <Legend
                        onClick={(e: any) => {
                            // e.dataKey is the name you gave each Line
                            setHiddenLines(h => ({
                                ...h,
                                [e.dataKey!]: !h[e.dataKey!]
                            }));
                        }}
                    />
                    <Line type="monotone" dataKey="directionFiltered" stroke="#ff9900" hide={hiddenLines['directionFiltered']} dot={false} name="DirectionFiltered" />
                    <Line type="monotone" dataKey="direction" stroke="#ff9900" hide={hiddenLines['direction']} dot={false} name="Direction" />
                </LineChart>
            </ResponsiveContainer>

            {/* Temperature chart */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={Data} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="time"
                        ticks={xTicks2h}
                        tickFormatter={tickFormatter}
                        allowDuplicatedCategory={false}
                    />
                    <YAxis
                        domain={[0, 450]}
                        ticks={[0, 90, 180, 270, 360, 450]}
                        label={{ value: 'Direction (°)', angle: -90, position: 'insideLeft', dx: -10 }}
                    />
                    <YAxis orientation="right" domain={[0, 450]} ticks={[0, 90, 180, 270, 360, 450]} />
                    <Tooltip />
                    <Legend
                        onClick={(e: any) => {
                            // e.dataKey is the name you gave each Line
                            setHiddenLines(h => ({
                                ...h,
                                [e.dataKey!]: !h[e.dataKey!]
                            }));
                        }}
                    />
                    <Line type="monotone" dataKey="temperatureFiltered" stroke="#ff9900" hide={hiddenLines['directionFiltered']} dot={false} name="Temperature (Filtered)" />
                    <Line type="monotone" dataKey="temperature" stroke="#ff9900" hide={hiddenLines['direction']} dot={false} name="Temperature" />
                </LineChart>
            </ResponsiveContainer>
        </>
    );
};

export default FilterFrequencyResponse;
