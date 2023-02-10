import React, { useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'
import { Col } from "react-bootstrap"
import { useData, Reading } from '../../contexts/DataContext'
import { useFilter, Limits, FillReturnDataType } from '../../contexts/FilterContext'
interface SimpleChartProps {
    clientWidth: number,
    label: string,
}

const SimpleChart = ({ clientWidth, label }: SimpleChartProps): JSX.Element => {

    const { chart } = useData()

    const chartRef = useRef<HTMLDivElement>(null)

    const [limits, setLimits] = useState<Limits>({ tsStart: 0, tsStop: 0, yMin: 0, yMax: 0 })
    const [filled, setFilled] = useState<[number, number][][]>([])
    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)
    const [svgWidth, setSvgWidth] = useState(0)
    const [svgHeight, setSvgHeight] = useState(0)
    const { fillData } = useFilter()

    const margin = { top: 10, right: 60, bottom: 30, left: 40 }

    // redraw the charts when the window width changes
    useEffect(() => {
        if (clientWidth > 0) {
            setWidth(clientWidth - margin.left - margin.right)
            setHeight(Math.floor(clientWidth / 5) - margin.top - margin.bottom)
            setSvgWidth(clientWidth)
            setSvgHeight(Math.floor(clientWidth / 5))
        }
    }, [clientWidth, margin.left, margin.right, margin.top, margin.bottom])


    useEffect(() => {
        if (width > 0 && chart?.length > 1) {
            let key: keyof Reading = label.toLowerCase() as keyof Reading
            const { filled, limits }: FillReturnDataType = fillData(chart, width, key)
            if (filled) setFilled(filled)
            if (limits) setLimits(limits)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chart, width])



    //redraw on size change or data change
    useEffect(() => {
        // if there is no width or no data we should not be here
        if (filled.length === 0 || width === 0) { return }

        // grab, clear and resize char container
        var svgContainer = d3.select(chartRef.current)
        svgContainer.selectAll("*").remove()
        var svg = svgContainer.append("svg")
            .attr("height", svgHeight)
            .attr("width", svgWidth)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")


        var timeSinceLastHourMark = limits.tsStart % (1 * 60 * 60)
        var td = new Date((limits.tsStart - timeSinceLastHourMark) * 1000);
        var hrs = td.getHours()
        var tickCnt = 1 + Math.floor((timeSinceLastHourMark + (limits.tsStop - limits.tsStart)) / (2 * 60 * 60)), tickValues = []
        for (let i = 0; i < tickCnt; i++) { tickValues.push(limits.tsStart - timeSinceLastHourMark + (i + 0.5) * (60 * 60 * 2)) }

        // Add X axis --> it is a date format
        // create axes calc function
        var x = d3.scaleLinear()
            .domain([limits.tsStart - timeSinceLastHourMark, limits.tsStop])
            .range([margin.left, width]);

        // draw the axis, which is in date format
        svg.append("g")
            .attr("transform", "translate(0," + (height + 10) + ")")
            .attr('class', 'x axis-grid')
            .call(
                d3
                    .axisBottom(x)
                    .tickSize(-height)
                    .tickValues(tickValues)
                    .tickFormat(function (d) {
                        td.setTime(1000 * (d as number))
                        hrs = td.getUTCHours()
                        if (hrs === 0) {
                            return "12am " + td.toDateString()
                        } else {
                            return hrs + "h"
                        }
                    })
            )

        // Add Y axis
        // create axes calc function
        var y = d3.scaleLinear()
            .domain([limits.yMin, limits.yMax])
            .range([(height + 5), 5])

        if (label === "Direction") {
            svg.append("g")
                .attr("transform", "translate(" + margin.left + ",5)")
                .attr('class', 'y axis-grid')
                .call(d3
                    .axisLeft(y)
                    .tickSize(-width + margin.left)
                    .tickValues([0, 90, 180, 270, 360, 450])
                );

            ["N", "E", "S", "W", "N", "E"].forEach((v, i) => {
                svg.append("text").attr("y", 300 - 57 * i).attr("x", 55).text(v)
            })
        }
        else {
            // draw left and right axis 
            svg.append("g")
                .attr("transform", "translate(" + margin.left + ",5)")
                .attr('class', 'y axis-grid')
                .call(d3.axisLeft(y)
                    .tickSize(-width + margin.right))
            svg.append("g")
                .attr("transform", "translate(" + width + ",5)")
                .attr('class', 'y axis-grid')
                .call(d3.axisRight(y)
                    .tickSize(-width + margin.left))
        }

        //label axis
        if (label === "Pressure")
            svg.append("text")
                .attr("class", "title")
                .attr("text-anchor", "middle")
                .attr("y", "1.75em")
                .attr("x", 400)
                .text("Rising barometric pressure usually brings better weather");

        //label axis
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("y", ".75em")
            .attr("x", -150)
            .attr("transform", "rotate(-90)")
            .text(label);

        filled.forEach((f, i) => {
            // add the line segment
            svg.append("path")
                .datum(f)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(function (d) {
                        // if (d.length === 0) return 0
                        if (isNaN(d[0]) || isNaN(d[1]))
                            console.log("NaN at " + i + " d[0]:" + d[0] + " d[1]:" + d[1] + " label:" + label)
                        const a = x(d[0])
                        return a
                    })
                    .y(function (d) {
                        // if (d.length === 0) return 0
                        const a = y(d[1])
                        return a
                    })
                )
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filled, width]) // Redraw chart if data or size changes


    return (
        <Col xs={12} >
            <div ref={chartRef} />
        </Col>
    )
}

export default SimpleChart