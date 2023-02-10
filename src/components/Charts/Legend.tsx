import React, { useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'
import { colors, blendColors } from './ColorGradients'


export default function Legend() {
    const [svgWidth, setSvgWidth] = useState(0)
    const rowRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const resizeAndDraw = () => {
            const container = rowRef.current
            if (!container) {
                console.log("no container")
                return
            }
            setSvgWidth(container.clientWidth)
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])


    useEffect(() => {
        var svgContainer = d3.select(rowRef.current)
        svgContainer.selectAll("*").remove()

        var generateWedgeString = function (startX: number, startY: number, startAngle: number, endAngle: number, radius: number): string {
            var x1 = startX + radius * Math.cos(Math.PI * startAngle / 180);
            var y1 = startY + radius * Math.sin(Math.PI * startAngle / 180);
            var x2 = startX + radius * Math.cos(Math.PI * endAngle / 180);
            var y2 = startY + radius * Math.sin(Math.PI * endAngle / 180);

            var pathString = "M" + startX + " " + startY + " L" + x1 + " " + y1 + " A" + radius + " " + radius + " 0 0 1 " + x2 + " " + y2 + " z";

            return pathString;

        }

        var svg = svgContainer.append("svg")
            .attr("height", 600)
            .attr("width", svgWidth)
            .append("g")

        var svgDefs = svg.append('defs')
        var mainGradient;

        // 130 - 175 - 220 (175 +/-45deg) split into 30, 3 deg each
        for (let i = 0; i < 30; i++) {
            var l, j = Math.floor(i / 5)
            //     4,4,4,3,3,3,2,2,2,1,1,1,0,0,0,0
            //     5,2,9,6,3,0,7,4,1,8,5,2,9,6,3,0,3,6,9,2,5,8,1,4,7,0,3,6,9,2(,5)
            // i = 0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9,0,1,2,3,4,5,6,7,8,9(,0)
            // j = 2,2,2,2,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2,2,2(,2)
            // l = 2,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2(,2)       
            //     x,7,5,1,x,6,3,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,x,3,6,x,1,5,7,x    

            if (i < 4 || i > 26) {
                j = 2
            } else {
                if (i < 7 || i > 23) {
                    j = 1
                }
                else { j = 0 }
            }
            if (i < 1 || i > 29) {
                l = 2
            } else {
                if (i < 5 || i > 25) {
                    l = 1
                }
                else { l = 0 }
            }
            var m = 0;
            if (i === 1 || i === 29) { m = 0.75 }
            else if (i === 2 || i === 28) { m = 0.5 }
            else if (i === 3 || i === 27) { m = 0.25 }
            else if (i === 5 || i === 25) { m = 0.67 }
            else if (i === 6 || i === 24) { m = 0.33 }
            // debugger
            mainGradient = svgDefs.append('radialGradient').attr('id', 'cc' + i)
            mainGradient.append('stop').attr('stop-color', blendColors(colors[l][4], colors[j][4], m)).attr('offset', 0.25)
            mainGradient.append('stop').attr('stop-color', blendColors(colors[l][3], colors[j][3], m)).attr('offset', 0.45)
            mainGradient.append('stop').attr('stop-color', blendColors(colors[l][2], colors[j][2], m)).attr('offset', 0.60)
            mainGradient.append('stop').attr('stop-color', blendColors(colors[l][1], colors[j][1], m)).attr('offset', 0.80)
            mainGradient.append('stop').attr('stop-color', blendColors(colors[l][0], colors[j][0], m)).attr('offset', 0.98)


            svg.append("clipPath")
                .attr("id", "ccClip" + i)
                .append("path")
                .attr("d", generateWedgeString(400, 300, 130 + 3 * i, 133 + 3 * i + 0.1, 350))

            svg.append("circle")
                .attr("cx", 400)
                .attr("r", 350)
                .attr("cy", 300)
                .style("stroke-width", 0)
                .style("fill", 'url(#cc' + i + ')')
                .attr("clip-path", 'url(#ccClip' + i + ')')
        }
        var markerBoxWidth = 10,
            markerBoxHeight = 10,
            refX = 10,
            refY = 5,
            arrowPoints: [number, number][] = [[0, 0], [0, 10], [10, 5]]

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
            .attr('stroke', 'black')
            .attr('fill', 'black')

        svg.append('path')
            .attr('d', d3.line()([[400, 300], [40, 300]]))
            .attr('stroke', 'black')
            .attr('marker-end', 'url(#arrow)')
            .attr('fill', 'none')

        svg.append('path')
            .attr("transform", "translate(0,0) rotate(-5, 400, 300)")
            .attr('d', d3.line()([[400, 300], [0, 300]]))
            .attr('stroke', 'grey')
            .attr('marker-end', 'url(#arrow)')
            .attr('fill', 'none')


        svg.append("clipPath")
            .attr("id", "arch")
            .append("path")
            .attr("d", generateWedgeString(400, 300, 130, 221, 350))
        svg.append("circle")
            .attr("cx", 400)
            .attr("r", 350)
            .attr("cy", 300)
            .style("stroke-width", 2)
            .style("stroke", "black")
            .style("fill", "none")
            .attr("clip-path", 'url(#arch)')

        for (let i = 0; i < 6; i++) {
            svg.append("circle")
                .attr("cx", 400)
                .attr("r", 65 * (i + 1))
                .attr("cy", 300)
                .style("stroke-width", 2)
                .style("stroke", "black")
                .style("fill", "none")
                .attr("clip-path", 'url(#arch)')
        }
        svg.append("text").attr("x", 10).attr("y", 299).text("cliff").style("font", "15px times")
            .attr("transform", "translate(0,0) rotate(-5, 400, 300)")

        for (let i = 0; i < 10; i++) {
            svg.append('path')
                .attr("transform", "translate(0,0) rotate(" + (-50 + i * 10) + ", 400, 300)")
                .attr('d', d3.line()([[60, 300], [40, 300]]))
                .attr('stroke', 'black')

            svg.append("text").attr("x", 10).attr("y", 306).text(220 + i * 10).style("font", "15px times")
                .attr("transform", "translate(0,0) rotate(" + (-50 + i * 10) + ", 400, 300)")
        }

    }, [svgWidth])


    return (
        <div ref={rowRef} />
    )
}
