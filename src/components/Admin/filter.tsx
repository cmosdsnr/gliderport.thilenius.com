import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import { getFilter } from '@/contexts/filters';

interface FrequencyResponseData {
    frequency: number;
    magnitude: number;
}

/**
 * Component that computes and renders the frequency response of a filter
 * by evaluating the filter's frequency response H(e^{jω}) over a range of frequencies.
 */
const FilterFrequencyResponse: React.FC = (): React.JSX.Element => {
    const data = useMemo<FrequencyResponseData[]>(() => {
        const h = getFilter();
        const Fs = 2000; // Sampling frequency in Hz
        const numPoints = 512;
        const response: FrequencyResponseData[] = [];

        for (let i = 0; i < numPoints; i++) {
            const freqHz = (i / (numPoints - 1)) * (Fs / 2);
            const omega = (2 * Math.PI * freqHz) / Fs;
            let real = 0;
            let imag = 0;

            h.forEach((coef, n) => {
                real += coef * Math.cos(omega * n);
                imag -= coef * Math.sin(omega * n);
            });

            const mag = Math.sqrt(real * real + imag * imag);
            response.push({
                frequency: parseFloat(freqHz.toFixed(1)),
                magnitude: parseFloat(mag.toFixed(4))
            });
        }

        return response;
    }, []);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="frequency"
                    label={{ value: 'Frequency (Hz)', position: 'insideBottomRight', offset: -5 }}
                />
                <YAxis label={{ value: 'Magnitude', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => value.toFixed(4)} />
                <Line type="monotone" dataKey="magnitude" dot={false} stroke="#8884d8" />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default FilterFrequencyResponse;
