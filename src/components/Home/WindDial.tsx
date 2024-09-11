import React, { useState, useRef, useEffect, useCallback, WheelEvent } from 'react'
import * as d3 from 'd3'
import { Reading } from '../../contexts/DataContext'
import './windDial.css';

interface WindDialProps {
    passedSeconds: number
    picRef: React.RefObject<HTMLDivElement>
    data: Reading[]
}

const WindDial = ({ passedSeconds, picRef, data }: WindDialProps) => {

    const divRef = useRef<HTMLDivElement>(null)
    const [lastSeen, setLastSeen] = useState<string>("")

    const svgWidth = useRef<number>(0)
    const sizeInPx = 400
    const ArrowColor = '#660000'

    const [hovering, setHovering] = useState<boolean>(false);
    const zoomFactor = useRef<number>(1);

    const handleMouseEnter = useCallback(() => {
        if (!hovering) {
            setHovering(true)
            document.body.style.overflow = "hidden"
        }
    }, [hovering])

    const handleMouseLeave = useCallback(() => {
        if (!!hovering) {
            setHovering(false)
            document.body.style.overflow = "scroll"
        }
    }, [hovering])

    const zoom = (e: WheelEvent<HTMLDivElement>) => {
        if (zoomFactor.current < 3 && e.deltaY < 0) zoomFactor.current = zoomFactor.current + 0.1
        if (zoomFactor.current > 1 && e.deltaY > 0) zoomFactor.current = zoomFactor.current - 0.1
    }

    useEffect(() => {

        const resizeAndDraw = () => {
            // const picContainer = picRef.current
            const divContainer = divRef.current
            if (!divContainer) {
                console.log("no container")
                return
            }
            svgWidth.current = divContainer.clientWidth > sizeInPx ? sizeInPx : divContainer.clientWidth
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        // window.addEventListener("wheel", zoom)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])



    useEffect(() => {
        const hours = Math.floor(passedSeconds / 3600)
        if (hours > 0) setLastSeen(hours + " hours ago")
        else {
            const minutes = Math.floor(passedSeconds / 60)
            if (minutes > 0) setLastSeen(minutes + " minute ago")
            else {
                setLastSeen(passedSeconds + " seconds ago")
            }
        }
        // console.log(lastSeen)
    }, [passedSeconds])

    useEffect(() => {
        if (!data) return
        //margin in px around circle plot
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



        // circle from 2 points and radius
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

        // lets rotate by theta degrees counter-clockwise
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
        // draw 5 dashed rings
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
        // Draw the arrows
        if (data.length > 10) {
            var lxMin = 1000, lyMin = 1000
            var lxMax = -1000, lyMax = -1000
            for (let i = 0; i < 10; i++) {
                // debugger
                var lx = 22.5 * data[data.length - 10 + i].speed * Math.cos((360 + 90 - data[data.length - 10 + i].direction) * Math.PI / 180)
                var ly = 22.5 * data[data.length - 10 + i].speed * Math.sin((360 + 90 - data[data.length - 10 + i].direction) * Math.PI / 180)

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
        //used lower down too
        const speed = data.length > 0 ? data[data.length - 1].speed : 0
        const direction = data.length > 0 ? data[data.length - 1].direction : 0

        lx = 22.5 * speed * Math.cos((360 + 90 - direction) * Math.PI / 180)
        ly = 22.5 * speed * Math.sin((360 + 90 - direction) * Math.PI / 180)

        var markerBoxWidth = 10,
            markerBoxHeight = 10,
            refX = 10,
            refY = 5,
            arrowPoints: [number, number][] = [[0, 0], [0, 10], [10, 5]]

        // if (data.direction.length > 2) debugger
        // draw line and arrow
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

        // X-Axis
        svg.append("line")
            .attr("x1", x(0))
            .attr("y1", y(-500))
            .attr("x2", x(0))
            .attr("y2", y(500))
            .style("stroke-width", 1)
            .style("stroke", 'black')
            .attr("clip-path", "url(#wdClip)")

        // Y-Axis
        svg.append("line")
            .attr("x1", x(500))
            .attr("y1", y(0))
            .attr("x2", x(-500))
            .attr("y2", y(0))
            .style("stroke-width", 1)
            .style("stroke", 'black')
            .attr("clip-path", "url(#wdClip)")

        // Label Directions
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


        svg.append("text").attr("x", xa(-490) - 0).attr("y", ya(-400)).text("Cliff \u27C2 wind:")
        svg.append("text").attr("x", xa(-490) + 90).attr("y", ya(-400)).text((Math.cos((direction - 265) * Math.PI / 180) * speed).toFixed(1) + " mph")
        const cross = Math.abs(Math.sin((direction - 265) * Math.PI / 180) * speed).toFixed(1)
        const crossDir = Math.sin((direction - 265) * Math.PI / 180) > 0 ? 'S' : 'N'
        svg.append("text").attr("x", xa(-490) - 0).attr("y", ya(-400) + 18).text("Cross wind:")
        svg.append("text").attr("x", xa(-490) + 90).attr("y", ya(-400) + 18).text(cross + " mph " + crossDir)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, lastSeen])

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onWheel={zoom}
            style={{
                marginTop:
                    picRef.current &&
                        picRef.current.clientHeight > sizeInPx ? (picRef.current.clientHeight - sizeInPx) / 2 : 0,
                marginLeft:
                    divRef.current &&
                        divRef.current.clientHeight > sizeInPx ? (divRef.current.clientHeight - sizeInPx) / 2 : 0
            }}
            ref={divRef}
        />

    )
}

export default WindDial
