import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Col } from 'react-bootstrap';
import { useData } from 'contexts/DataContext';
import { useFilter } from 'contexts/FilterContext';

interface SimpleChartProps {
    clientWidth: number;
    label: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ clientWidth, label }) => {
    const { chart } = useData();
    const chartRef = useRef<HTMLDivElement>(null);

    const [limits, setLimits] = useState<Limits>({ tsStart: 0, tsStop: 0, yMin: 0, yMax: 0 });
    const [filled, setFilled] = useState<[number, number][][]>([]);
    const { fillData } = useFilter();

    const margin = { top: 10, right: 60, bottom: 30, left: 40 };
    const width = clientWidth - margin.left - margin.right;
    const height = Math.floor(clientWidth / 5) - margin.top - margin.bottom;
    const svgWidth = clientWidth;
    const svgHeight = Math.floor(clientWidth / 5);

    // Compute filled data and limits only when `chart` or `width` changes
    useEffect(() => {
        if (width > 0 && chart?.length > 1) {
            const key: keyof Reading = label.toLowerCase() as keyof Reading;
            const { filled, limits }: FillReturnDataType = fillData(chart, width, key);
            if (filled) setFilled(filled);
            if (limits) setLimits(limits);
        }
    }, [chart, width, label, fillData]);

    // D3 chart drawing logic
    const drawChart = useCallback(() => {
        if (filled.length === 0 || width === 0) return;

        const svgContainer = d3.select(chartRef.current);
        svgContainer.selectAll("*").remove();

        const svg = svgContainer.append("svg")
            .attr("height", svgHeight)
            .attr("width", svgWidth)
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Compute time ticks
        const timeSinceLastHourMark = limits.tsStart % (1 * 60 * 60);
        const tickValues = [];
        for (let i = 0; i <= Math.floor((timeSinceLastHourMark + (limits.tsStop - limits.tsStart)) / (2 * 60 * 60)); i++) {
            tickValues.push(limits.tsStart - timeSinceLastHourMark + (i + 0.5) * (60 * 60 * 2));
        }

        // X axis
        const x = d3.scaleLinear()
            .domain([limits.tsStart - timeSinceLastHourMark, limits.tsStop])
            .range([margin.left, width]);

        svg.append("g")
            .attr("transform", `translate(0,${height + 10})`)
            .call(
                d3.axisBottom(x)
                    .tickSize(-height)
                    .tickValues(tickValues)
                    .tickFormat(d => {
                        const td = new Date((d as number) * 1000);
                        return td.getUTCHours() === 0 ? `12am ${td.toDateString()}` : `${td.getUTCHours()}h`;
                    })
            );

        // Y axis
        const y = d3.scaleLinear()
            .domain([limits.yMin, limits.yMax])
            .range([height + 5, 5]);

        const yAxis = d3.axisLeft(y).tickSize(-width + margin.left);
        svg.append("g").attr("transform", `translate(${margin.left},5)`).call(yAxis);

        if (label === "Direction") {
            svg.append("g")
                .attr("transform", `translate(${margin.left},5)`)
                .call(d3.axisLeft(y).tickSize(-width + margin.left).tickValues([0, 90, 180, 270, 360, 450]));

            ["N", "E", "S", "W", "N", "E"].forEach((v, i) => {
                svg.append("text").attr("y", 300 - 57 * i).attr("x", 55).text(v);
            });
        } else {
            svg.append("g").attr("transform", `translate(${width},5)`).call(d3.axisRight(y).tickSize(-width + margin.left));
        }

        // Chart title for Pressure
        if (label === "Pressure") {
            svg.append("text")
                .attr("class", "title")
                .attr("text-anchor", "middle")
                .attr("y", "1.75em")
                .attr("x", 400)
                .text("Rising barometric pressure usually brings better weather");
        }

        // Y-axis label
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("y", ".75em")
            .attr("x", -150)
            .attr("transform", "rotate(-90)")
            .text(label);

        // Draw lines
        filled.forEach((f, i) => {
            svg.append("path")
                .datum(f)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(d => x(d[0]))
                    .y(d => y(d[1]))
                );
        });

    }, [filled, width, svgWidth, svgHeight, limits, margin, label]);

    // Trigger chart redraw when data or size changes
    useEffect(() => {
        drawChart();
    }, [drawChart]);

    return (
        <Col xs={12}>
            <div ref={chartRef} />
        </Col>
    );
};

export default SimpleChart;
