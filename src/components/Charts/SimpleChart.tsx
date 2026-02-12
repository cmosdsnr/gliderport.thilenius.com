/**
 * SimpleChart.tsx
 *
 * Renders a time-series chart (e.g. wind speed, direction, temperature, pressure, humidity)
 * using D3 within a React Bootstrap layout. It listens to context-provided data and filters,
 * computes appropriate X/Y scales, draws axes (with special handling for direction charts),
 * grid lines, titles, and plots the data as SVG paths. It resizes dynamically to its container.
 *
 * @packageDocumentation SimpleChart
 */
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Col } from 'react-bootstrap';
import { useFilter, FillReturnDataType, Limits } from 'contexts/FilterContext';
import { useData, Reading } from '@/contexts/DataContext';

/**
 * Props for the SimpleChart component.
 * clientWidth - The width of the container to size the chart.
 * label - The data field to chart (e.g., "Direction", "Pressure").
 */
export interface SimpleChartProps {
    clientWidth: number;
    label: string;
}

/**
 * A simple time-series line chart using D3, rendering one or more filled data segments.
 * Automatically scales axes based on filtered data limits and redraws on resize or data change.
 *
 * @param props.clientWidth - container width for responsive sizing
 * @param props.label - name of the field in each reading to plot
 * @returns A React element wrapping the D3-generated SVG chart.
 */
export const SimpleChart: React.FC<SimpleChartProps> = ({ clientWidth, label }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    // State for axis limits and the filled path data
    const [limits, setLimits] = useState<Limits>({ tsStart: 0, tsStop: 0, yMin: 0, yMax: 0 });
    const [filled, setFilled] = useState<[number, number][][]>([]);

    // Hook to compute filtered/filled data based on readings
    const { fillData } = useFilter();
    const { readings } = useData();

    // Chart margins
    const margin = { top: 10, right: 60, bottom: 30, left: 50 };
    const width = clientWidth - margin.left - margin.right;
    const height = Math.floor(clientWidth / 5) - margin.top - margin.bottom;
    const svgWidth = clientWidth;
    const svgHeight = Math.floor(clientWidth / 5);

    /**
     * Recompute filled segments and axis limits when source data or container width changes.
     */
    useEffect(() => {
        if (width > 0 && readings?.length > 1) {
            const key = label.toLowerCase() as keyof Reading;
            const result: FillReturnDataType = fillData(readings, width, key);

            let newLimits = result.limits || { tsStart: 0, tsStop: 0, yMin: 0, yMax: 0 };

            if (label === 'Humidity' && result.filled && result.filled.length > 0) {
                let minVal = Infinity;
                let maxVal = -Infinity;
                result.filled.forEach(segment => {
                    segment.forEach(pt => {
                        const val = pt[1];
                        if (val < minVal) minVal = val;
                        if (val > maxVal) maxVal = val;
                    });
                });

                if (minVal !== Infinity) {
                    newLimits = {
                        ...newLimits,
                        yMin: Math.max(0, minVal - 5),
                        yMax: Math.min(100, maxVal + 5)
                    };
                }
            }

            setFilled(result.filled || []);
            setLimits(newLimits);
        }
    }, [readings, width, label, fillData]);

    /**
     * Draws or redraws the chart via D3 whenever data, dimensions, or limits change.
     */
    useEffect(() => {
        if (!chartRef.current || filled.length === 0 || width <= 0) return;

        const svgContainer = d3.select(chartRef.current);
        svgContainer.selectAll('*').remove();

        // Create main <svg> and group with margin transform
        const svg = svgContainer
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // X-scale and axis
        const x = d3.scaleLinear()
            .domain([limits.tsStart, limits.tsStop])
            .range([0, width]);

        // Compute 2‑hour ticks aligned on even hours in LA time
        const startDate = new Date(limits.tsStart * 1000);
        startDate.setMinutes(0, 0, 0);
        const localHour = parseInt(
            new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hour12: false })
                .format(startDate),
            10
        );
        const offsetMs = (localHour % 2 === 1 ? 1 : 0) * 3600_000;
        startDate.setTime(startDate.getTime() - offsetMs);
        const tickValues = d3.range(startDate.getTime() / 1000, limits.tsStop, 2 * 3600);

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickValues(tickValues)
                .tickFormat(d => {
                    const td = new Date((d as number) * 1000);
                    const time = td.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hour12: false });
                    return time === '00' ? td.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) : time;
                })
            );

        // Draw vertical grid lines
        tickValues.forEach(t => {
            svg.append('line')
                .attr('x1', x(t))
                .attr('x2', x(t))
                .attr('y1', 0)
                .attr('y2', height)
                .attr('stroke', '#ccc');
        });

        // Y-scale and axis
        const y = d3.scaleLinear().domain([limits.yMin, limits.yMax]).range([height, 0]);

        // Render horizontal grid & axes differently for "Direction"
        if (label === 'Direction') {
            const dirTicks = [0, 90, 180, 270, 360, 450];
            dirTicks.forEach(t => {
                svg.append('line')
                    .attr('x1', 0).attr('x2', width)
                    .attr('y1', y(t)).attr('y2', y(t))
                    .attr('stroke', '#ccc');
                svg.append('line')
                    .attr('x1', 0).attr('x2', -10)
                    .attr('y1', y(t)).attr('y2', y(t))
                    .attr('stroke', '#ccc');
            });
            svg.append('g').call(d3.axisLeft(y).tickValues(dirTicks));
            svg.append('g').attr('transform', `translate(${width},0)`).call(d3.axisRight(y).tickValues(dirTicks));
            ['N', 'E', 'S', 'W', 'N', 'E'].forEach((v, i) => {
                svg.append('text')
                    .attr('x', 10)
                    .attr('y', height + 5 - (height / 5) * i)
                    .text(v);
            });
        } else {
            const gridTicks = y.ticks(4).concat([limits.yMax]);
            gridTicks.forEach(t => {
                svg.append('line')
                    .attr('x1', 0).attr('x2', width)
                    .attr('y1', y(t)).attr('y2', y(t))
                    .attr('stroke', '#ccc');
                svg.append('line')
                    .attr('x1', 0).attr('x2', -10)
                    .attr('y1', y(t)).attr('y2', y(t))
                    .attr('stroke', '#ccc');
            });
            svg.append('g').call(d3.axisLeft(y).ticks(4));
            svg.append('g').attr('transform', `translate(${width},0)`).call(d3.axisRight(y).ticks(4));
        }

        // Optional annotation for pressure
        if (label === 'Pressure') {
            svg.append('text')
                .attr('text-anchor', 'middle')
                .attr('x', width / 2)
                .attr('y', '1.75em')
                .text('Rising barometric pressure usually brings better weather');
        }

        // Y-axis label rotated
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -35)
            .attr('text-anchor', 'middle')
            .text(label);

        // Draw the line paths for each filled segment
        filled.forEach(segment => {
            svg.append('path')
                .datum(segment)
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 1.5)
                .attr('d', d3.line<[number, number]>()
                    .x(d => x(d[0]))
                    .y(d => y(d[1]))
                );
        });
    }, [filled, width, svgWidth, svgHeight, limits, label]);

    return (
        <Col xs={12}>
            <div ref={chartRef} />
        </Col>
    );
};

export default SimpleChart;
