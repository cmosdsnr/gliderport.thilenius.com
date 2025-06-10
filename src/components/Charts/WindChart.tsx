// WindChart.tsx
/**
 * WindChart component renders a time-series wind data chart with colored gradients.
 *
 * It fetches readings from DataContext, applies filter and fill logic from FilterContext,
 * and displays an area plot with gradient overlays indicating wind code states.
 * A toggleable Legend explains the color codes.
 *
 * @packageDocumentation WindChart
 */
import React, { useEffect, useState, useRef, MouseEvent } from 'react'
import * as d3 from 'd3'
import { Col } from 'react-bootstrap'
import { useFilter, FilterReturnDataType, Limits } from 'contexts/FilterContext'
import { getGradients } from './ColorGradients'
import Legend from './Legend'
import { useData, Reading } from '@/contexts/DataContext'

/**
 * Props for WindChart.
 * clientWidth - width of the drawing container in pixels
 * label - label for the Y axis
 */
interface WindChartProps {
    clientWidth: number
    label: string
}

/**
 * Renders a D3-powered wind data chart.
 *
 * - Uses DataContext to retrieve `readings`.
 * - Uses FilterContext (`filterData`, `fillForFilter`) to compute boundaries and direction history.
 * - Draws X and Y axes aligned to 2‑hour ticks in LA time.
 * - Fills area between min/max, overlays gradient color blocks per state transitions.
 * - Provides a button to toggle the Color Code Legend.
 *
 * @param props - component props
 * @returns React element containing the chart
 */

export function WindChart({ clientWidth, label }: WindChartProps): React.ReactElement {
    const chartRef = useRef<HTMLDivElement>(null)

    const [limits, setLimits] = useState<Limits | null>(null)
    const [showLegend, setShowLegend] = useState<boolean>(false)
    const [width, setWidth] = useState<number>(0)
    const [height, setHeight] = useState<number>(0)
    const [svgWidth, setSvgWidth] = useState<number>(0)
    const [svgHeight, setSvgHeight] = useState<number>(0)

    const [direction, setDirection] = useState<[number, number][]>([[0, 0]])
    const [min, setMin] = useState<[number, number][]>([[0, 0]])
    const [max, setMax] = useState<[number, number][]>([[0, 0]])
    const [scaled, setScaled] = useState<[number, number][]>([])

    const { readings } = useData()
    const { filterData, fillForFilter } = useFilter()

    const margin = { top: 10, right: 60, bottom: 30, left: 30 }

    /**
     * Compute inner and svg dimensions when container width changes.
     */
    useEffect(() => {
        setWidth(clientWidth - margin.left - margin.right)
        setHeight(Math.floor(clientWidth / 5) - margin.top - margin.bottom)
        setSvgWidth(clientWidth)
        setSvgHeight(Math.floor(clientWidth / 5))
        // margin and functions assumed stable
    }, [clientWidth])

    /**
     * Apply filtering logic when raw readings or drawing width change.
     */
    useEffect(() => {
        if (width > 0 && readings?.length > 1) {
            const { fTop, fBottom, limits, filled }: FilterReturnDataType = filterData(readings, width)
            setLimits(limits)
            setMax(fTop)
            setMin(fBottom)
            setScaled(filled)
            const dir = fillForFilter(readings, width, 'direction')
            setDirection(dir.filled)
        }
        // filterData and fillForFilter stability assumed
    }, [readings, width])

    /**
     * Clear and redraw the chart on min/max changes.
     */
    useEffect(() => {
        if (!width || !limits) return

        const container = d3.select(chartRef.current)
        container.selectAll('*').remove()

        const svg = container
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`)

        const svgDefs = svg.append('defs')

        // Align X-axis ticks to two-hour LA-time boundaries
        const startDate = new Date(limits.tsStart * 1000)
        startDate.setMinutes(0, 0, 0)
        const hour = parseInt(
            new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Los_Angeles', hour: '2-digit', hour12: false,
            }).format(startDate), 10)
        if (hour % 2 === 1) startDate.setTime(startDate.getTime() - 3600000)

        const tickValues = d3.range(startDate.getTime() / 1000, limits.tsStop, 2 * 3600)

        const x = d3.scaleLinear()
            .domain([limits.tsStart, limits.tsStop])
            .range([margin.left, width])

        svg.append('g')
            .attr('transform', `translate(0,${height + 10})`)
            .attr('class', 'x axis-grid')
            .call(
                d3.axisBottom(x)
                    .tickSize(-height)
                    .tickValues(tickValues)
                    .tickFormat((d: any) => {
                        const t = new Date(d * 1000)
                        const hh = t.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hour12: false })
                        return hh === '00'
                            ? t.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })
                            : hh
                    })
            )

        const dataMax = d3.max(max, d => d[1]) ?? 12
        const y = d3.scaleLinear()
            .domain([0, dataMax > 12 ? dataMax : 12])
            .range([height + 5, 0])

        svg.append('g')
            .attr('transform', `translate(${margin.left},5)`)
            .attr('class', 'y axis-grid')
            .call(d3.axisLeft(y).ticks(4).tickSize(-width + margin.right))

        svg.append('g')
            .attr('transform', `translate(${width},5)`)
            .attr('class', 'y axis-grid')
            .call(d3.axisRight(y).ticks(4).tickSize(-width + margin.left))

        svg.append('text')
            .attr('class', 'y label')
            .attr('text-anchor', 'middle')
            .attr('y', '.75em')
            .attr('x', -150)
            .attr('transform', 'rotate(-90)')
            .text(label)

        const cp = svg.append('clipPath').attr('id', 'cp')
        if (max.length > 1) {
            cp.append('path')
                .datum(max)
                .attr('d', d3.area<[number, number]>()
                    .x(d => x(d[0]))
                    .y0((_, i) => y(min[i][1]))
                    .y1(d => y(d[1]))
                )
        }

        getGradients(svgDefs, dataMax)

        // Paint gradient blocks between state transitions
        let state = Math.abs(direction[0][1] - 270) > 40
            ? 2 : Math.abs(direction[0][1] - 270) > 33
                ? 1 : 0
        let cnt = 0
        let offset = 0

        max.forEach((v, i) => {
            const dirVal = Math.abs(direction[i][1] - 270)
            const next = dirVal > 40 ? 2 : dirVal > 33 ? 1 : 0

            if (x(v[0] - max[i - cnt][0]) > 10 && next !== state) {
                const w = Math.max(0, x(v[0]) - x(max[i - cnt][0]) - 5)
                svg.append('rect')
                    .attr('x', x(max[i - cnt][0]) + offset)
                    .attr('width', w)
                    .attr('height', height)
                    .attr('clip-path', 'url(#cp)')
                    .style('stroke-width', 2)
                    .style('stroke', `url(#mg${state})`)
                    .style('fill', `url(#mg${state})`)

                let gradSelect: number
                if (state === 0) gradSelect = next === 1 ? 0 : 4
                else if (state === 1) gradSelect = next === 2 ? 1 : 3
                else gradSelect = next === 1 ? 2 : 5

                for (let tx = 0; tx < 5; tx++) {
                    svg.append('rect')
                        .attr('x', x(v[0]) + 2 * tx)
                        .attr('width', 2)
                        .attr('height', height)
                        .attr('y', 0)
                        .attr('clip-path', 'url(#cp)')
                        .style('stroke-width', 1)
                        .style('stroke', `url(#gd${gradSelect}-${tx})`)
                        .style('fill', `url(#gd${gradSelect}-${tx})`)
                }

                cnt = 0; offset = 5; state = next
            } else {
                cnt++
            }
        })

        // Final block
        if (max.length > 1) {
            if (cnt === 0) cnt = 1
            const startIdx = max.length - cnt
            svg.append('rect')
                .attr('x', x(max[startIdx][0]))
                .attr('width', x(max[max.length - 1][0]) - x(max[startIdx][0]))
                .attr('height', height)
                .attr('clip-path', 'url(#cp)')
                .style('stroke-width', 2)
                .style('stroke', `url(#mg${state})`)
                .style('fill', `url(#mg${state})`)
        }

    }, [min, max])

    /**
     * Toggle display of the color legend.
     */
    function toggleLegend(e: MouseEvent) {
        e.preventDefault()
        setShowLegend(prev => !prev)
    }

    return (
        <Col xs={12}>
            <div ref={chartRef} />
            <button className="btn btn-info dropdown-toggle btn-sm" onClick={toggleLegend}>
                Color Code Legend
            </button>
            {showLegend && <Legend />}
        </Col>
    )
}

export default WindChart
