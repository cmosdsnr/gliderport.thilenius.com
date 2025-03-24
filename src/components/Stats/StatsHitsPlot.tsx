import React, { useState, useEffect, useRef } from 'react';
import { Row, Col } from 'react-bootstrap';
import * as d3 from 'd3'

interface StatsPlotProps {
    data: Weeks;
}

type Points = [number, number]

const StatsPlot: React.FC<StatsPlotProps> = ({ data }) => {

    const chartRef = useRef(null)

    const [plotData, setPlotData] = useState<Points[]>([])
    const [width, setWidth] = useState(0)
    const rowRef = useRef<HTMLElement>(null)

    const margin = { top: 10, right: 60, bottom: 60, left: 25 }

    useEffect(() => {
        const resizeAndDraw = () => {
            const container = rowRef.current
            if (!container) {
                console.log("no container")
                return
            }
            setWidth(container.clientWidth)
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])

    useEffect(() => {
        if (data) {
            const start: number = Math.floor((new Date(data.start + "08:00:00")).getTime() / 1000)
            //  data.last - data.data.length * 7 * 24 * 3600
            let d: Points[] = []
            data.totals?.forEach((v, i) => d.push([start + i * 7 * 24 * 3600, v]));
            setPlotData(d)
            // debugger
        }
    }, [data])

    useEffect(() => {
        // if there is no width or no data we should not be here
        if (plotData.length === 0 || width === 0) { return }

        const height = 0.6 * width
        // debugger
        // // Adds the svg canvas
        var svgContainer = d3.select(chartRef.current)
        svgContainer.selectAll("*").remove()
        var svg = svgContainer.append("svg")
            .attr("width", width - margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

        const numberOfWeeks = plotData.length
        const stepWeeks = Math.floor(numberOfWeeks / (width / 40))
        let tickValues = []
        for (let i = 0; i < 1 + ((width - margin.left) / 40); i++) { tickValues.push(plotData[0][0] + i * stepWeeks * 7 * 24 * 3600) }

        // Set the ranges
        var x = d3.scaleLinear().range([0, width - margin.left - 51])
        var y = d3.scaleLinear().range([height, 0])

        // Scale the range of the data
        const [u, v] = d3.extent(plotData, function (d) { return d[0] })
        if (u != undefined && v != undefined) x.domain([u, v])
        y.domain([0, d3.max(plotData, function (d) { return d[1] }) as number])

        // draw bottom X axis 
        svg.append("g")
            .attr('class', 'x axis-grid')
            .attr("transform", "translate(" + margin.left + "," + (height + 10) + ")")
            .call(
                d3
                    .axisBottom(x)
                    .tickSize(-height)
                    .tickValues(tickValues)
                    .tickFormat(function (d) {
                        let td = new Date()
                        td.setTime(1000 * (d as number))
                        const m = td.getMonth() + 1
                        const a = td.getDate()
                        const y = td.getFullYear() - 2000
                        return m + "-" + a + "-" + y
                    })
            )
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", -2)
            .attr("dy", 5)
            .attr("transform", "rotate(-35)");

        // draw left axis 
        svg.append("g")
            .attr('class', 'y axis-grid')
            .attr("transform", "translate(" + margin.left + ",9)")
            .call(d3.axisLeft(y)
                .tickSize(-width + margin.right))

        //label left Y axis
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("y", ".75em")
            .attr("x", -190)
            .attr("y", -10)
            .attr("transform", "rotate(-90)")
            .text("Hits Per Week");

        // // Define the line
        var hitsLine = d3.line()
            .x(function (d) {
                // if (d.length === 0) return 0
                const a = x(d[0])
                return a
            })
            .y(function (d) {
                // if (d.length === 0) return 0
                const a = y(d[1])
                return a
            })

        svg.append("path")
            .attr("transform", "translate(" + margin.left + ",9)")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", hitsLine(plotData))


        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plotData, width]) // Redraw chart if data or size changes

    return (
        <Row>
            <Col xs={12} ref={rowRef} className="greyBackground" style={{ paddingTop: '15px' }}>
                <div ref={chartRef} />
            </Col>
        </Row>
    )
}

export default StatsPlot;