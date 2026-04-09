// StatsHitsPlot.tsx
import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';

export interface StatsPlotProps {
    data: [number, number][]; // [timestamp, value]
}

/**
 * StatsPlot renders a bar chart of site statistics using recharts.
 * @param props - The chart data as an array of [timestamp, value].
 * @returns {React.ReactElement} The rendered bar chart.
 */
export function StatsPlot({ data }: StatsPlotProps): React.ReactElement {
    // Memoize the transformed data so we only rebuild when `data` changes
    const chartData = useMemo(() => {
        console.log('StatsPlot → new chartData length:', data.length);
        return data.map(([timestamp, value]) => ({
            timestamp,
            value,
            time: new Date(timestamp).toLocaleDateString(),
        }));
    }, [data]);

    // Custom tooltip to show date & value
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-2 border rounded shadow">
                    <p className="text-sm">
                        Date: {new Date(label).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-blue-600">Value: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    // X-axis tick formatter (e.g. “Jun 03”)
    const formatXAxisTick = (timestamp: number) =>
        new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={formatXAxisTick}
                    stroke="#666"
                />
                <YAxis stroke="#666" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
        </ResponsiveContainer>
    );
}

export default StatsPlot;
