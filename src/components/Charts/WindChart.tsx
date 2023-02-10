import React, { useEffect, useState, useRef, MouseEvent } from 'react'
import * as d3 from 'd3'
import { Col } from "react-bootstrap"
import { useFilter, Limits, FilterReturnDataType } from '../../contexts/FilterContext'
import { getGradients } from './ColorGradients'
import Legend from "./Legend"
import { useData } from '../../contexts/DataContext'

interface WindChartProps {
    clientWidth: number,
    label: string,
}

const WindChart = ({ clientWidth, label }: WindChartProps): JSX.Element => {

    const {
        chart
    } = useData()

    const chartRef = useRef(null)

    const [limits, setLimits] = useState<null | Limits>(null)
    const [showLegend, setShowLegend] = useState(false)
    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)
    const [svgWidth, setSvgWidth] = useState(0)
    const [svgHeight, setSvgHeight] = useState(0)

    const [direction, setDirection] = useState([[0, 0]])
    const [min, setMin] = useState([[0, 0]])
    const [max, setMax] = useState<[number, number][]>([[0, 0]])
    const { filterData, fillForFilter } = useFilter()
    const margin = { top: 10, right: 60, bottom: 30, left: 30 }

    useEffect(() => {
        setWidth(clientWidth - margin.left - margin.right)
        setHeight(Math.floor(clientWidth / 5) - margin.top - margin.bottom)
        setSvgWidth(clientWidth)
        setSvgHeight(Math.floor(clientWidth / 5))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientWidth])

    useEffect(() => {
        if (width > 0 && chart?.length > 1) {
            // debugger
            const { fTop, fBottom, limits }: FilterReturnDataType = filterData(chart, width);
            setLimits(limits)
            setMax(fTop)
            setMin(fBottom)
            let { filled } = fillForFilter(chart, width, "direction")
            setDirection(filled)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chart, width])


    //redraw on size change or data change
    useEffect(() => {
        // if there is no width we should not be here
        if (!width) { return }
        if (!limits) { return }

        // grab, clear and resize char container
        var svgContainer = d3.select(chartRef.current)
        svgContainer.selectAll("*").remove()
        var svg = svgContainer.append("svg")
            .attr("height", svgHeight)
            .attr("width", svgWidth)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

        var svgDefs = svg.append('defs')


        var timeSinceLastHourMark = limits.tsStart % (1 * 60 * 60)
        var td = new Date((limits.tsStart - timeSinceLastHourMark) * 1000);
        var tickCnt = 1 + Math.floor((timeSinceLastHourMark + (limits.tsStop - limits.tsStart)) / (2 * 3600))
        var tickValues = []

        // Add X axis --> it is a date format
        var x = d3.scaleLinear()
            .domain([limits.tsStart - timeSinceLastHourMark, limits.tsStop])
            .range([margin.left, width]);

        for (let i = 0; i < tickCnt; i++) { tickValues.push(limits.tsStart - timeSinceLastHourMark + (i + 0.5) * (2 * 3600)) }

        svg.append("g")
            .attr("transform", "translate(0," + (height + 10) + ")")
            .attr('class', 'x axis-grid')
            .call(
                d3
                    .axisBottom(x)
                    .tickSize(-height)
                    .tickValues(tickValues)
                    .tickFormat((d: any): string => {
                        td.setTime(1000 * d)
                        const hrs = td.getUTCHours()
                        if (hrs === 0) {
                            return "12am " + td.toDateString()
                        } else {
                            return hrs + "h"
                        }
                    })
            )

        // Add Y axis
        const dataMax = d3.max(max, function (d) { return d[1] })
        var y = d3.scaleLinear()
            .domain([0, dataMax != undefined && dataMax > 12 ? dataMax : 12])
            .range([(height + 5), 0])
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
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("y", ".75em")
            .attr("x", -150)
            .attr("transform", "rotate(-90)")
            .text(label);
        var cp = svg.append("clipPath").attr("id", "cp")

        if (max.length > 1)
            cp.append("path")
                .datum(max)
                .attr("d", d3.area()
                    .x(function (d: any): any { return x(d[0]) })
                    .y0(function (d: any, i: any): any { const t = d[0]; return y(min[i][1]) })
                    .y1(function (d: any): any { return y(d[1]) })
                )

        getGradients(svgDefs, dataMax ? dataMax : 12)
        const dir = Math.abs(direction[0][1] - 270)
        var state = dir > 40 ? 2 : (dir > 33 ? 1 : 0)
        var cnt = 0;
        var startOffset = 0
        max.forEach((v, i) => {
            const dir = Math.abs(direction[i][1] - 270)
            const nextState = dir > 40 ? 2 : (dir > 33 ? 1 : 0)
            // more than 10 pixels and state changed
            if (x(v[0] - max[i - cnt][0]) > 10 && nextState !== state) {
                //draw rectangle from i-cnt to cnt filled with state shading
                // debugger
                const w = x(v[0]) - x(max[i - cnt][0]) - 5 < 0 ? 0 : x(v[0]) - x(max[i - cnt][0]) - 5
                svg.append("rect")
                    .attr("x", x(max[i - cnt][0]) + startOffset)
                    .attr("width", w)
                    .attr("y", 0)
                    .attr("height", height)
                    .attr("clip-path", "url(#cp)")
                    .style("stroke-width", 2)
                    .style("stroke", 'url(#mg' + state + ')')
                    .style("fill", 'url(#mg' + state + ')')

                var gradientSelect
                if (state === 0) { gradientSelect = nextState === 1 ? 0 : 4 }
                if (state === 1) { gradientSelect = nextState === 2 ? 1 : 3 }
                if (state === 2) { gradientSelect = nextState === 1 ? 2 : 5 }

                for (let tx = 0; tx < 5; tx++) {
                    svg.append("rect")
                        .attr("x", x(v[0]) + 2 * tx)
                        .attr("y", 0)
                        .attr("height", height)
                        .attr("width", 2)
                        .style("stroke-width", 1)
                        .attr("clip-path", "url(#cp)")
                        .style("stroke", 'url(#gd0-' + tx + ')')
                        .style("fill", 'url(#gd' + gradientSelect + '-' + tx + ')')
                }
                // debugger
                cnt = 0
                startOffset = 5
                state = nextState
            } else {
                cnt++
            }
        })
        //add the last one (cnt wide)  
        if (max.length > 1) {
            if (max.length - cnt < 0) {
                console.log("Debug: cnt > max.length line 193")
                cnt = max.length
            }
            if (cnt === 0) {
                cnt++
            }
            svg.append("rect")
                .attr("x", x(max[max.length - cnt][0]))
                .attr("width", x(max[max.length - 1][0]) - x(max[max.length - cnt][0]))
                .attr("y", 0)
                .attr("height", height)
                .attr("clip-path", "url(#cp)")
                .style("stroke-width", 2)
                .style("stroke", 'url(#mg' + state + ')')
                .style("fill", 'url(#mg' + state + ')')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [min, max]) // Redraw chart if data changes

    const toggleLegend = (e: MouseEvent) => {
        e.preventDefault();
        if (showLegend) {
            setShowLegend(false)
        } else {
            setShowLegend(true)
        }
    }

    return (
        <Col xs={12} >
            <div ref={chartRef} />
            <button className="btn btn-info dropdown-toggle btn-sm" onClick={toggleLegend}>Color Code Legend</button>
            {showLegend ? (<Legend />) : (<></>)}
        </Col>
    )
}


export default WindChart
