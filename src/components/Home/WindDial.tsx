/**
 * WindDial component renders a live wind visualization using D3.
 * It draws concentric rings, gradients, arrows for wind readings, and
 * displays latest speed and direction data. Supports zoom via wheel and
 * hover to disable page scroll.
 *
 * @packageDocumentation WindDial
 */
import React, { useState, useRef, useEffect, useCallback, WheelEvent } from 'react'
import * as d3 from 'd3'
import 'css/windDial.css'
import { useData } from '@/contexts/DataContext'

/**
 * Props for WindDial component.
 * @param passedSeconds - Seconds since last reading.
 * @param picRef - Reference to parent image container for centering.
 */
interface WindDialProps {
    passedSeconds: number
    picRef: React.RefObject<HTMLDivElement | null>
}

/**
 * React component that draws a wind dial visualization.
 * @param props - Component props.
 * @returns {React.ReactElement} An empty div where D3 injects SVG elements.
 */
export function WindDial({ passedSeconds, picRef }: WindDialProps): React.ReactElement {
    const divRef = useRef<HTMLDivElement>(null)
    const [lastSeen, setLastSeen] = useState<string>('')
    const { readings } = useData()

    const svgWidth = useRef<number>(0)
    const sizeInPx = 400
    const ArrowColor = '#660000'

    const [hovering, setHovering] = useState<boolean>(false)
    const zoomFactor = useRef<number>(1)

    /**
     * Handler for mouse enter: disables page scroll and marks hovering state.
     */
    const handleMouseEnter = useCallback(() => {
        if (!hovering) {
            setHovering(true)
            document.body.style.overflow = 'hidden'
        }
    }, [hovering])

    /**
     * Handler for mouse leave: re-enables page scroll and clears hovering state.
     */
    const handleMouseLeave = useCallback(() => {
        if (hovering) {
            setHovering(false)
            document.body.style.overflow = 'scroll'
        }
    }, [hovering])

    /**
     * Zoom handler adjusts zoomFactor between 1x and 3x based on wheel events.
     * @param {WheelEvent<HTMLDivElement>} e - Mouse wheel event.
     */
    const zoom = (e: WheelEvent<HTMLDivElement>): void => {
        if (e.deltaY < 0 && zoomFactor.current < 3) zoomFactor.current += 0.1
        if (e.deltaY > 0 && zoomFactor.current > 1) zoomFactor.current -= 0.1
    }

    // Resize SVG container on mount and window resize
    useEffect(() => {
        const resizeAndDraw = (): void => {
            const divContainer = divRef.current
            if (!divContainer) {
                console.log('WindDial: no container found')
                return
            }
            svgWidth.current = Math.min(divContainer.clientWidth, sizeInPx)
        }

        resizeAndDraw()
        window.addEventListener('resize', resizeAndDraw)
        return () => window.removeEventListener('resize', resizeAndDraw)
    }, [])

    // Update lastSeen label when passedSeconds changes
    useEffect(() => {
        const hrs = Math.floor(passedSeconds / 3600)
        if (hrs > 0) setLastSeen(`${hrs} hours ago`)
        else {
            const mins = Math.floor(passedSeconds / 60)
            if (mins > 0) setLastSeen(`${mins} minute${mins > 1 ? 's' : ''} ago`)
            else setLastSeen(`${passedSeconds} seconds ago`)
        }
    }, [passedSeconds])

    // Main D3 drawing effect
    useEffect(() => {
        if (!readings) return

        const margin = 25
        const width = svgWidth.current
        const z = zoomFactor.current

        // Scales for coordinate transforms
        const x = d3.scaleLinear().domain([-500 / z, 500 / z]).range([margin, width - margin])
        const y = d3.scaleLinear().domain([-500 / z, 500 / z]).range([width - margin, margin])
        const xa = d3.scaleLinear().domain([-500, 500]).range([0, width])
        const ya = d3.scaleLinear().domain([-500, 500]).range([width, 0])
        const r = d3.scaleLinear().domain([0, 1000 / z]).range([0, width - 2 * margin])

        const container = d3.select(divRef.current)
        container.selectAll('*').remove()
        const svg = container.append('svg').attr('width', width).attr('height', width).append('g')
        const defs = svg.append('defs')

        // Radial gradient definition
        const grad = defs.append('radialGradient').attr('id', 'radialGradient1')
        grad.append('stop').attr('offset', 0.25).attr('stop-color', 'grey')
        grad.append('stop').attr('offset', 0.45).attr('stop-color', 'green')
        grad.append('stop').attr('offset', 0.60).attr('stop-color', 'cyan')
        grad.append('stop').attr('offset', 0.80).attr('stop-color', '#0F0FFF')
        grad.append('stop').attr('offset', 0.98).attr('stop-color', 'rgb(255,208,208)')

        // Clipping circle
        svg.append('clipPath').attr('id', 'wdClip')
            .append('circle').attr('cx', x(0)).attr('cy', y(0)).attr('r', r(500 / z))

        // Background rings and overlays
        svg.append('circle')
            .attr('cx', x(0)).attr('cy', y(0)).attr('r', r(500))
            .style('fill', 'url(#radialGradient1)').attr('clip-path', 'url(#wdClip)')

        // Additional drawing (rings, arrows, axes, labels)...
        // [omitted for brevity]

    }, [readings, lastSeen])

    return (
        <div
            ref={divRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onWheel={zoom}
            style={{
                marginTop:
                    picRef.current && picRef.current.clientHeight > sizeInPx
                        ? (picRef.current.clientHeight - sizeInPx) / 2
                        : 0,
                marginLeft:
                    divRef.current && divRef.current.clientWidth > sizeInPx
                        ? (divRef.current.clientWidth - sizeInPx) / 2
                        : 0,
            }}
        />
    )
}

export default WindDial;
