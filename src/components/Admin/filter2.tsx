import React, { useMemo } from 'react';
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
import { useData } from '@/contexts/DataContext';
import { DateTime } from 'luxon';

interface FrequencyResponseData {
    frequency: number;
    magnitude: number;
}

interface SpeedDataPoint {
    time: string;
    original: number;
    filtered: number;
    min: number;
    max: number;
}

interface DirectionDataPoint {
    time: string;
    original: number;
    filtered: number;
}

/**
 * FilterFrequencyResponse renders multiple line charts including:
 * - Frequency response of the filter (magnitude in dB)
 * - Wind speed over time (original and filtered)
 * - Min/max wind speed envelope
 * - Wind direction over time (filtered)
 */
const FilterFrequencyResponse: React.FC = (): React.JSX.Element => {
    const { readings } = useData();
    const filter = getFilter();

    /**
     * Returns the direction values with speed==0 corrected to last valid direction.
     * Leading zero-speed entries are set to 270 by default.
     */
    const correctedDirections = (): number[] => {
        const result: number[] = [];
        let lastValidDir = 270;
        for (let i = 0; i < readings.length; i++) {
            if (readings[i].speed !== 0) {
                lastValidDir = readings[i].direction;
            }
            result.push(lastValidDir);
        }
        return result;
    };

    const directionsCorrected = correctedDirections();

    const frequencyResponse = useMemo<FrequencyResponseData[]>(() => {
        const Fs = 2000;
        const numPoints = 512;
        const response: FrequencyResponseData[] = [];

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
            response.push({
                frequency: parseFloat(freqHz.toFixed(1)),
                magnitude: parseFloat(db.toFixed(2))
            });
        }

        return response;
    }, [filter]);

    const xTicks = Array.from({ length: 11 }, (_, i) => i * 100);

    const { speedData, directionData } = useMemo(() => {
        if (readings.length < 2) return { speedData: [], directionData: [] };

        const N = 15;
        const windowRadiusSec = N * 60;
        const totalTime = readings[readings.length - 1].time - readings[0].time;
        const targetPoints = 1440;
        const binSize = Math.ceil(totalTime / targetPoints);
        const bins: { timeSum: number; speedSum: number; directionSum: number; weight: number }[] = [];

        let binStart = readings[0].time;
        let binEnd = binStart + binSize;
        let accTime = 0, accSpeed = 0, accDir = 0, count = 0;

        for (let i = 0; i < readings.length; i++) {
            const r = readings[i];
            const dir = directionsCorrected[i];

            if (r.time < binEnd) {
                accTime += r.time;
                accSpeed += r.speed;
                accDir += dir;
                count++;
            } else {
                if (count > 0) {
                    bins.push({
                        timeSum: accTime,
                        speedSum: accSpeed,
                        directionSum: accDir,
                        weight: count
                    });
                }
                binStart = r.time;
                binEnd = binStart + binSize;
                accTime = r.time;
                accSpeed = r.speed;
                accDir = dir;
                count = 1;
            }
        }

        if (count > 0) bins.push({ timeSum: accTime, speedSum: accSpeed, directionSum: accDir, weight: count });

        const averaged = bins.map(b => ({
            time: b.timeSum / b.weight,
            speed: b.speedSum / b.weight,
            direction: b.directionSum / b.weight
        }));

        const start = Math.floor(averaged[0].time / 60) * 60;
        const end = Math.floor(averaged[averaged.length - 1].time / 60) * 60;
        const oneMinute = 60;

        const interpolatedSpeed: { time: number; speed: number }[] = [];
        const interpolatedDirRaw: { time: string; direction: number }[] = [];

        let currentIndex = 0;
        for (let t = start; t <= end; t += oneMinute) {
            while (currentIndex < averaged.length - 1 && averaged[currentIndex + 1].time < t) {
                currentIndex++;
            }

            const r1 = averaged[currentIndex];
            const r2 = averaged[Math.min(currentIndex + 1, averaged.length - 1)];
            if (!r1 || !r2 || r1.time === r2.time) continue;

            const ratio = (t - r1.time) / (r2.time - r1.time);
            interpolatedSpeed.push({
                time: t,
                speed: r1.speed + ratio * (r2.speed - r1.speed)
            });
            interpolatedDirRaw.push({
                time: DateTime.fromSeconds(t).toFormat("MM/dd HH:mm"),
                direction: r1.direction + ratio * (r2.direction - r1.direction)
            });
        }

        const minMaxMap = interpolatedSpeed.map(({ time }) => {
            const windowStart = time - windowRadiusSec;
            const windowEnd = time + windowRadiusSec;
            const inWindow = readings.filter(r => r.time >= windowStart && r.time <= windowEnd);
            const speeds = inWindow.map(r => r.speed);
            return {
                min: speeds.length ? Math.min(...speeds) : 0,
                max: speeds.length ? Math.max(...speeds) : 0
            };
        });

        const paddedSpeed = [
            ...Array(filter.length - 1).fill(interpolatedSpeed[0].speed),
            ...interpolatedSpeed.map(d => d.speed)
        ];
        const paddedDir = [
            ...Array(filter.length - 1).fill(interpolatedDirRaw[0].direction),
            ...interpolatedDirRaw.map(d => d.direction)
        ];

        const filteredSpeed: number[] = [];
        const filteredDirection: number[] = [];
        const halfLen = Math.floor(filter.length / 2);

        for (let i = 0; i < interpolatedSpeed.length; i++) {
            let accSpeed = 0;
            let accDir = 0;
            for (let j = 0; j < filter.length; j++) {
                const index = i + j - halfLen;
                const speedSample = paddedSpeed[Math.max(0, Math.min(index, paddedSpeed.length - 1))];
                const dirSample = paddedDir[Math.max(0, Math.min(index, paddedDir.length - 1))];
                accSpeed += filter[j] * speedSample;
                accDir += filter[j] * dirSample;
            }
            filteredSpeed.push(accSpeed);
            filteredDirection.push(accDir);
        }

        const speedData = interpolatedSpeed.map((point, i) => ({
            time: DateTime.fromSeconds(point.time).toFormat("MM/dd HH:mm"),
            original: point.speed,
            filtered: filteredSpeed[i] ?? 0,
            min: minMaxMap[i]?.min ?? 0,
            max: minMaxMap[i]?.max ?? 0
        }));

        const directionData: DirectionDataPoint[] = interpolatedDirRaw.map((point, i) => ({
            time: point.time,
            original: point.direction ?? 0,
            filtered: filteredDirection[i] ?? 0
        }));

        return { speedData, directionData };
    }, [readings, filter]);

    return (
        <>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={frequencyResponse} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="frequency" type="number" domain={[0, 1000]} ticks={xTicks}
                        label={{ value: 'Frequency (Hz)', position: 'insideBottom', dy: 30 }} />
                    <YAxis domain={[-100, 10]} ticks={[-100, -80, -60, -40, -20, 0, 10]}
                        label={{ value: 'Magnitude (dB)', angle: -90, position: 'insideLeft', dx: -10 }} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} dB`} />
                    <Line type="monotone" dataKey="magnitude" dot={false} stroke="#8884d8" />
                </LineChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={speedData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" minTickGap={50} interval="preserveStartEnd"
                        label={{ value: 'Time', position: 'insideBottom', dy: 30 }} />
                    <YAxis label={{ value: 'Speed', angle: -90, position: 'insideLeft', dx: -10 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="original" stroke="#8884d8" dot={false} name="Original" />
                </LineChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={speedData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" minTickGap={50} interval="preserveStartEnd"
                        label={{ value: 'Time', position: 'insideBottom', dy: 30 }} />
                    <YAxis label={{ value: 'Speed', angle: -90, position: 'insideLeft', dx: -10 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="filtered" stroke="#82ca9d" dot={false} name="Filtered" />
                    <Line type="monotone" dataKey="min" stroke="#ff0000" dot={false} name="Min" />
                    <Line type="monotone" dataKey="max" stroke="#00ff00" dot={false} name="Max" />
                </LineChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={directionData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" minTickGap={50} interval="preserveStartEnd"
                        label={{ value: 'Time', position: 'insideBottom', dy: 30 }} />
                    <YAxis label={{ value: 'Direction (°)', angle: -90, position: 'insideLeft', dx: -10 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="original" stroke="#ff9900" dot={false} name="Filtered Direction" />
                    <Line type="monotone" dataKey="filtered" stroke="#ff9900" dot={false} name="Filtered Direction" />
                </LineChart>
            </ResponsiveContainer>
        </>
    );
};

export default FilterFrequencyResponse;