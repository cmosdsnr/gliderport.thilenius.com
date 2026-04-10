/**
 * @packageDocumentation
 *
 * D3-powered wind direction and speed dial for the Gliderport home page.
 *
 * Exports the {@link WindDial} component, which reads live sensor readings
 * from {@link useSensorData} and redraws itself whenever the data or zoom
 * level changes.
 *
 * ### Visual layout
 * The SVG fills up to 400 × 400 px and contains:
 * - A radial colour gradient background (grey → green → cyan → blue → pink)
 *   representing wind speed zones.
 * - Two translucent arc overlays computed from the site geometry, indicating
 *   the usable soaring window above the cliff edge (rotated ~5 ° NW).
 * - Five dashed concentric rings at 4 mph intervals (4, 8, 12, 16, 20 mph).
 * - Cardinal direction labels (N, S, E, W) and mph ring labels.
 * - A primary arrow from the origin to the current wind vector.
 * - Up to 10 historical sample markers (drawn as × crosses) enclosed in a
 *   bounding ellipse to show recent spread.
 * - A text readout of the latest speed, direction, cliff-perpendicular
 *   component, and cross-wind component.
 *
 * ### Zoom
 * Hovering the component locks page scroll; the mouse wheel adjusts
 * `zoomFactor` between 1× and 3×, which narrows the D3 scale domain and
 * magnifies the centre of the dial.
 */
import React, { useState, useRef, useEffect, useCallback, WheelEvent } from 'react'
import * as d3 from 'd3'
import 'css/windDial.css'
import { useSensorData } from '@/contexts/SensorDataContext'

/**
 * Props for the {@link WindDial} component.
 */
export interface WindDialProps {
    /**
     * Elapsed seconds since the most recent sensor reading was received.
     * Used to build the human-readable "X minutes ago" / "X hours ago" label
     * displayed inside the dial.
     */
    passedSeconds: number;
    /**
     * Ref to the sibling camera-image container.  The dial uses its
     * `clientHeight` to vertically centre itself alongside the image when
     * the image is taller than the dial's maximum size of 400 px.
     */
    picRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * D3 wind direction and speed dial.
 *
 * Renders a `<div>` that D3 uses as its mount point, injecting and replacing
 * an `<svg>` element on every redraw.  The component redraws whenever new
 * sensor readings arrive or the `lastSeen` label changes.
 *
 * @param passedSeconds - Seconds since the last sensor reading.
 * @param picRef - Ref to the adjacent camera container used for vertical alignment.
 * @returns A `<div>` containing the D3-managed SVG wind dial.
 *
 * @example
 * ```tsx
 * <WindDial passedSeconds={elapsed} picRef={cameraContainerRef} />
 * ```
 */
export function WindDial({ passedSeconds, picRef }: WindDialProps): React.ReactElement {
    const divRef = useRef<HTMLDivElement>(null)
    const [lastSeen, setLastSeen] = useState<string>('')
    const { readings } = useSensorData()

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

    /**
     * Measures the container width on mount and on every subsequent window
     * resize, capping `svgWidth` at `sizeInPx` (400 px).  The listener is
     * removed when the component unmounts.
     */
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

    /**
     * Derives a human-readable "last seen" label from `passedSeconds` and
     * stores it in `lastSeen`.  Prioritises hours, then minutes, then seconds.
     */
    useEffect(() => {
        const hrs = Math.floor(passedSeconds / 3600)
        if (hrs > 0) setLastSeen(`${hrs} hours ago`)
        else {
            const mins = Math.floor(passedSeconds / 60)
            if (mins > 0) setLastSeen(`${mins} minute${mins > 1 ? 's' : ''} ago`)
            else setLastSeen(`${passedSeconds} seconds ago`)
        }
    }, [passedSeconds])

    /**
     * Main D3 drawing effect.  Runs whenever `readings` or `lastSeen` changes.
     *
     * Clears and fully redraws the SVG each time, including:
     * 1. Linear scales for the x/y coordinate system and radius mapping.
     * 2. A radial gradient `<defs>` element and a circular clip path.
     * 3. Gradient-filled background circle.
     * 4. Two sets of 40 progressively shrinking translucent circles
     *    representing the soaring-window arc geometry above the cliff edge.
     * 5. Five dashed concentric speed rings (at 90-unit intervals).
     * 6. Historical sample markers (× crosses) and their bounding ellipse
     *    (drawn only when more than 10 readings are available).
     * 7. Primary wind-vector arrow from the origin to the latest reading.
     * 8. Cardinal direction labels and mph ring labels.
     * 9. Latest speed, direction, cliff-perpendicular, and cross-wind text.
     */
    useEffect(() => {
        if (!readings) return
        /** Margin in pixels around the circular plot area. */
        const margin = 25

        var x = d3.scaleLinear()
            .domain([-500 / zoomFactor.current, 500 / zoomFactor.current])
            .range([margin, svgWidth.current - margin])


        var y = d3.scaleLinear()
            .domain([-500 / zoomFactor.current, 500 / zoomFactor.current])
            .range([svgWidth.current - margin, margin])


        var xa = d3.scaleLinear()
            .domain([-500, 500])
            .range([0, svgWidth.current])


        var ya = d3.scaleLinear()
            .domain([-500, 500])
            .range([svgWidth.current, 0])


        var r = d3.scaleLinear()
            .domain([0, 1000 / zoomFactor.current])
            .range([0, svgWidth.current - 2 * margin])

        var svgContainer = d3.select(divRef.current)
        svgContainer.selectAll("*").remove()
        var svg = svgContainer.append("svg")
            .attr("height", svgWidth.current)
            .attr("width", svgWidth.current)
            .append("g")
        // .attr("transform", "translate(" + r(translate.x) + "," + r(translate.y) + ")")

        var svgDefs = svg.append('defs')

        var mainGradient = svgDefs.append('radialGradient').attr('id', 'radialGradient1')
            .attr('cx', "50%").attr('cy', "50%").attr('r', "50%").attr('fx', "50%").attr('fy', "50%")
        mainGradient.append('stop').attr('stop-color', "grey").attr('offset', 0.25)
        mainGradient.append('stop').attr('stop-color', "green").attr('offset', 0.45)
        mainGradient.append('stop').attr('stop-color', "cyan").attr('offset', 0.60)
        mainGradient.append('stop').attr('stop-color', "#0F0FFF").attr('offset', 0.80)
        mainGradient.append('stop').attr('stop-color', "rgb(255,208,208)").attr('offset', .98)


        svg.append("clipPath")
            .attr("id", "wdClip")
            .append("circle")
            .attr("cx", x(0))
            .attr("r", r(500 / zoomFactor.current))
            .attr("cy", y(0))

        // draw colored rings
        svg.append("circle")
            .attr("cx", x(0))
            .attr("r", r(500))
            .attr("cy", y(0))
            .style("stroke-width", 0)
            .style("fill", 'url(#radialGradient1)')
            .attr("clip-path", "url(#wdClip)")



        /** Compute the arc geometry for the soaring-window overlay from two unit-circle points and a curvature radius. */
        const y1 = 0
        const x1 = 0
        const y2 = -Math.sin(Math.PI / 4)
        const x2 = -Math.cos(Math.PI / 4)
        let cr = 1.5  // bigger radius is a flatter curve

        const q = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

        const y3 = (y1 + y2) / 2
        const x3 = (x1 + x2) / 2

        let cx = x3 + Math.sqrt(cr ** 2 - (q / 2) ** 2) * (y1 - y2) / q
        let cy = y3 + Math.sqrt(cr ** 2 - (q / 2) ** 2) * (x2 - x1) / q

        /** Rotate the arc centres by theta degrees counter-clockwise to align with the cliff-edge direction (~5 ° NW). */
        const theta = 5 // Cliff edge is about 5deg nw
        const cosTheta = Math.cos(Math.PI * theta / 180)
        const sinTheta = Math.sin(Math.PI * theta / 180)

        const cx1 = 500 * (cosTheta * cx - sinTheta * cy)
        const cy1 = 500 * (sinTheta * cx + cosTheta * cy)
        const cx2 = 500 * (cosTheta * cx + sinTheta * cy)
        const cy2 = 500 * (sinTheta * cx - cosTheta * cy)
        cr = 500 * cr

        for (let c = 0; c < 40; c++) {
            cr = 0.995 * cr
            const opacity = c < 39 ? 0.08 : 1
            svg.append("circle")
                .attr("cx", x(cx1))
                .attr("r", r(cr))
                .attr("cy", y(cy1))
                .style("stroke-width", 0)
                // .style("fill", "rgba(255,255,255," + opacity + ")")
                .style("fill", "rgb(200,220,255)")
                .style("opacity", opacity)
                .attr("clip-path", "url(#wdClip)")

            svg.append("circle")
                .attr("cx", x(cx2))
                .attr("r", r(cr))
                .attr("cy", y(cy2))
                .style("stroke-width", 0)
                .style("fill", "rgb(200,220,255)")
                .style("opacity", opacity)
                .attr("clip-path", "url(#wdClip)")
        }
        /** Draw 5 dashed concentric speed rings at 90-unit (4 mph) intervals. */
        for (var i = 5; i > 0; i--) {
            svg.append("circle")
                .attr("cx", x(0))
                .attr("cy", y(0))
                .attr("r", r(i * 90))
                .style("stroke-width", 1)
                .style("stroke", 'black')
                .style("fill", 'none')
                .style("stroke-dasharray", ("3, 3"))
                .attr("clip-path", "url(#wdClip)")
        }
        /** Plot the last 10 wind readings as × markers and surround them with a bounding ellipse to visualise spread. */
        if (readings.length > 10) {
            var lxMin = 1000, lyMin = 1000
            var lxMax = -1000, lyMax = -1000
            for (let i = 0; i < 10; i++) {
                // debugger
                var lx = 22.5 * readings[readings.length - 10 + i].speed * Math.cos((360 + 90 - readings[readings.length - 10 + i].direction) * Math.PI / 180)
                var ly = 22.5 * readings[readings.length - 10 + i].speed * Math.sin((360 + 90 - readings[readings.length - 10 + i].direction) * Math.PI / 180)

                //Draw X
                svg.append('line')
                    .attr("x1", x(lx) - 3)
                    .attr("y1", y(ly) + 3)
                    .attr("x2", x(lx) + 3)
                    .attr("y2", y(ly) - 3)
                    .style("stroke-width", 1)
                    .style("stroke", ArrowColor)
                svg.append('line')
                    .attr("x1", x(lx) - 3)
                    .attr("y1", y(ly) - 3)
                    .attr("x2", x(lx) + 3)
                    .attr("y2", y(ly) + 3)
                    .style("stroke-width", 1)
                    .style("stroke", ArrowColor)
                if (lx > lxMax) lxMax = lx
                if (ly > lyMax) lyMax = ly
                if (lx < lxMin) lxMin = lx
                if (ly < lyMin) lyMin = ly
            }
            cx = (lxMax + lxMin) / 2
            cy = (lyMax + lyMin) / 2
            var rx = (lxMax - cx) * 1.5
            var ry = (lyMax - cy) * 1.5

            // console.log(cx + " " + cy + " " + rx + " " + ry)
            svg.append('ellipse')
                .attr('cx', x(cx))
                .attr('cy', y(cy))
                .attr('rx', r(rx))
                .attr('ry', r(ry))
                .attr('stroke', ArrowColor)
                .attr('fill', 'none')
        }
        /** Latest reading values — also referenced by the text labels rendered below. */
        const speed = readings.length > 0 ? readings[readings.length - 1].speed : 0
        const direction = readings.length > 0 ? readings[readings.length - 1].direction : 0

        lx = 22.5 * speed * Math.cos((360 + 90 - direction) * Math.PI / 180)
        ly = 22.5 * speed * Math.sin((360 + 90 - direction) * Math.PI / 180)

        var markerBoxWidth = 10,
            markerBoxHeight = 10,
            refX = 10,
            refY = 5,
            arrowPoints: [number, number][] = [[0, 0], [0, 10], [10, 5]]

        // if (data.direction.length > 2) debugger
        /** Define an SVG arrowhead marker and draw the primary wind-vector line from the origin to the current reading. */
        svgDefs.append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', [0, 0, markerBoxWidth, markerBoxHeight])
            .attr('refX', refX)
            .attr('refY', refY)
            .attr('markerWidth', markerBoxWidth)
            .attr('markerHeight', markerBoxHeight)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', d3.line()(arrowPoints))
            .attr('stroke', ArrowColor)
            .attr('fill', ArrowColor)

        svg.append('path')
            .attr('d', d3.line()(
                [[x(0), y(0)], [x(lx), y(ly)]]
            ))
            .attr('stroke', ArrowColor)
            .attr('marker-end', 'url(#arrow)')
            .attr('fill', 'none')

        /** Draw the vertical N–S axis line. */
        svg.append("line")
            .attr("x1", x(0))
            .attr("y1", y(-500))
            .attr("x2", x(0))
            .attr("y2", y(500))
            .style("stroke-width", 1)
            .style("stroke", 'black')
            .attr("clip-path", "url(#wdClip)")

        /** Draw the horizontal E–W axis line. */
        svg.append("line")
            .attr("x1", x(500))
            .attr("y1", y(0))
            .attr("x2", x(-500))
            .attr("y2", y(0))
            .style("stroke-width", 1)
            .style("stroke", 'black')
            .attr("clip-path", "url(#wdClip)")

        /** Append cardinal direction labels (E, W, N, S) at the rim of the dial. */
        var fontSize = 20
        svg.style("font", fontSize + "px times")
        svg.append("text").attr("x", xa(500) - fontSize).attr("y", ya(0) + fontSize / 3).text("E")
        svg.append("text").attr("x", xa(-500)).attr("y", ya(0) + fontSize / 3).text("W")
        svg.append("text").attr("x", xa(0) - fontSize / 3).attr("y", ya(500) + fontSize).text("N")
        svg.append("text").attr("x", xa(0) - fontSize / 3).attr("y", ya(-500)).text("S")

        fontSize = 14
        //rotate(-45 " + x(0) + " " + y(0) + ")")
        var block = svg.append('g').attr("class", "wind-dial-text").attr("clip-path", "url(#wdClip)").attr("transform", "translate(0,0) rotate(-45 " + xa(10) + " " + ya(10) + ")")
        block.append("text").attr("x", x(0) - fontSize / 2).attr("y", y(-1 * 90) - fontSize / 2).text("4")
        block.append("text").attr("x", x(0) - fontSize / 2).attr("y", y(-2 * 90) - fontSize / 2).text("8")
        block.append("text").attr("x", x(0) - fontSize / 2).attr("y", y(-3 * 90) - fontSize / 2).text("12")
        block.append("text").attr("x", x(0) - fontSize / 2).attr("y", y(-4 * 90) - fontSize / 2).text("16")
        block.append("text").attr("x", x(0) - fontSize / 2).attr("y", y(-5 * 90) - fontSize / 2).text("20")


        block = svg.append('g').attr("class", "wind-dial-mph").attr("transform", "translate(0,0) rotate(-45 " + xa(10) + " " + ya(10) + ")")
        block.append("text").attr("x", xa(0) - fontSize / 2).attr("y", ya(-500) - fontSize).text("mph")


        svg.append("text").attr("class", "wind-dial-latest-reading").attr("x", xa(-500)).attr("y", ya(470)).text("Latest Reading: ")
        svg.append("text").attr("class", "wind-dial-latest-reading").attr("x", xa(-500)).attr("y", ya(430)).text(lastSeen)
        svg.append("text").attr("class", "wind-dial-speed").attr("x", xa(350) - 0).attr("y", ya(460)).text("Speed:")
        svg.append("text").attr("x", xa(350) - 20).attr("y", ya(460) + 21).text(speed + " mph")
        svg.append("text").attr("x", xa(350) - 10).attr("y", ya(460) + 46).text("Direction:")
        svg.append("text").attr("x", xa(350) - 20).attr("y", ya(460) + 67).text(direction + " Deg")


        svg.append("text").attr("x", xa(-490) - 0).attr("y", ya(-400)).text("Cliff \u27C2 wind: " + (Math.cos((direction - 265) * Math.PI / 180) * speed).toFixed(1) + " mph")
        const cross = Math.abs(Math.sin((direction - 265) * Math.PI / 180) * speed).toFixed(1)
        const crossDir = Math.sin((direction - 265) * Math.PI / 180) > 0 ? 'S' : 'N'
        svg.append("text").attr("x", xa(-490) - 0).attr("y", ya(-400) + 18).text("Cross wind: " + cross + " mph " + crossDir)
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
