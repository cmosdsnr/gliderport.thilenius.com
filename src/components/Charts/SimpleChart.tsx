import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Col } from 'react-bootstrap';
import { useFilter, FillReturnDataType, Limits } from 'contexts/FilterContext';
import { useData, Reading } from '@/contexts/DataContext'

interface SimpleChartProps {
    clientWidth: number;
    label: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ clientWidth, label }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    const [limits, setLimits] = useState<Limits>({ tsStart: 0, tsStop: 0, yMin: 0, yMax: 0 });
    const [filled, setFilled] = useState<[number, number][][]>([]);
    const { fillData } = useFilter();

    const { readings } = useData();

    const margin = { top: 10, right: 60, bottom: 30, left: 50 };
    const width = clientWidth - margin.left - margin.right;
    const height = Math.floor(clientWidth / 5) - margin.top - margin.bottom;
    const svgWidth = clientWidth;
    const svgHeight = Math.floor(clientWidth / 5);

    useEffect(() => {
        if (width > 0 && readings?.length > 1) {
            const key: keyof Reading = label.toLowerCase() as keyof Reading;
            const { filled, limits }: FillReturnDataType = fillData(readings, width, key);
            setFilled(filled || []);
            setLimits(limits || { tsStart: 0, tsStop: 0, yMin: 0, yMax: 0 });
        }
    }, [readings, width, label, fillData]);

    useEffect(() => {
        if (filled.length === 0 || width === 0 || !chartRef.current) return;

        const svgContainer = d3.select(chartRef.current);
        svgContainer.selectAll("*").remove();

        const svg = svgContainer
            .append("svg")
            .attr("height", svgHeight)
            .attr("width", svgWidth)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);


        const start = new Date(limits.tsStart * 1000);
        start.setMinutes(0, 0, 0); // Set minutes, seconds, and milliseconds to zero
        const localHour = parseInt(
            new Intl.DateTimeFormat("en-US", {
                timeZone: "America/Los_Angeles",
                hour: "2-digit",
                hour12: false,
            }).format(start),
            10
        );
        //if localHour is odd subtract one hour from start
        const localHourOffset = localHour % 2 === 1 ? 60 * 60 * 1000 : 0;
        start.setTime(start.getTime() - localHourOffset);

        const tickValues = d3.range(start.getTime() / 1000, limits.tsStop, 2 * 3600);
        const x = d3
            .scaleLinear()
            .domain([limits.tsStart, limits.tsStop])
            .range([0, width]);

        svg
            .append("g")
            .attr("transform", `translate(0,${height})`)
            .call(
                d3
                    .axisBottom(x)
                    .tickSize(5)
                    .tickValues(tickValues)
                    .tickFormat(d => {
                        const td = new Date((d as number) * 1000);
                        const localTime = td.toLocaleTimeString("en-US", {
                            timeZone: "America/Los_Angeles",
                            hour: "2-digit",
                            hour12: false,
                        });
                        const localDate = td.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
                        return localTime === "00" ? localDate : localTime;
                    })
            );

        // Vertical grid lines (guidelines) for each tick
        tickValues.forEach(tick => {
            const xPos = x(tick);
            svg.append("line")
                .attr("x1", xPos)
                .attr("x2", xPos)
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "#ccc")
                .attr("stroke-width", 1);
        });

        const y = d3.scaleLinear().domain([limits.yMin, limits.yMax]).range([height, 0]);

        //svg.append("g").call(d3.axisLeft(y).ticks(4));

        if (label === "Direction") {
            const gridTicks = [0, 90, 180, 270, 360, 450];

            gridTicks.forEach(tick => {
                const yPos = y(tick);

                // Rightward line
                svg.append("line")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", yPos)
                    .attr("y2", yPos)
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 1);

                // Leftward extension
                svg.append("line")
                    .attr("x1", 0)
                    .attr("x2", -10)
                    .attr("y1", yPos)
                    .attr("y2", yPos)
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 1);
            });
            svg.append("g").call(d3.axisLeft(y).tickValues(gridTicks));
            svg.append("g").attr("transform", `translate(${width},0)`).call(d3.axisRight(y).tickValues([0, 90, 180, 270, 360, 450]));
            ["N", "E", "S", "W", "N", "E"].forEach((v, i) => {
                svg.append("text").attr("y", height + 5 - (height / 5) * i).attr("x", 10).text(v);
            });
        } else {
            const gridTicks = y.ticks(4);
            gridTicks.push(limits.yMax);
            gridTicks.forEach(tick => {
                const yPos = y(tick);

                // Rightward line
                svg.append("line")
                    .attr("x1", 0)
                    .attr("x2", width)
                    .attr("y1", yPos)
                    .attr("y2", yPos)
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 1);

                // Leftward extension
                svg.append("line")
                    .attr("x1", 0)
                    .attr("x2", -10)
                    .attr("y1", yPos)
                    .attr("y2", yPos)
                    .attr("stroke", "#ccc")
                    .attr("stroke-width", 1);
            });
            svg.append("g").call(d3.axisLeft(y).ticks(4));
            svg.append("g").attr("transform", `translate(${width},0)`).call(d3.axisRight(y).ticks(4));
        }

        if (label === "Pressure") {
            svg
                .append("text")
                .attr("class", "title")
                .attr("text-anchor", "middle")
                .attr("y", "1.75em")
                .attr("x", width / 2)
                .text("Rising barometric pressure usually brings better weather");
        }

        svg
            .append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("y", -35)
            .attr("x", -height / 2)
            .attr("transform", "rotate(-90)")
            .text(label);

        filled.forEach((f) => {
            svg
                .append("path")
                .datum(f)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr(
                    "d",
                    d3
                        .line<[number, number]>()
                        .x(d => x(d[0]))
                        .y(d => y(d[1]))
                );
        });
    }, [filled, width, svgWidth, svgHeight, limits, margin, label]);

    return (
        <Col xs={12}>
            <div ref={chartRef} />
        </Col>
    );
};

export default SimpleChart;
