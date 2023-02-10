import React, { useState, useEffect } from 'react'
import { useData } from '../../contexts/DataContext'

const CurrentTable = ({ ...rest }) => {

    const { sun, passedSeconds, latest, printDate } = useData()

    const [sunset, setSunset] = useState("")
    const [sunrise, setSunrise] = useState("")
    const [lastSeen, setLastSeen] = useState("")
    const [dirText, setDirText] = useState("")

    useEffect(() => {
        if (!isNaN(latest?.direction)) {
            setDirText(latest.direction + " deg  (" + Math.abs(270 - latest.direction) + " deg off)")
        }
    }, [latest])

    useEffect(() => {
        if (sun) {
            setSunset(printDate(sun.set))
            setSunrise(printDate(sun.rise))
        }
    }, [sun.set, sun.rise])

    useEffect(() => {
        if (latest?.time) {
            var dt = new Date(latest ? 1000 * latest.time : 0)
            let ps = passedSeconds > 0 ? passedSeconds : 0
            let passedMinutes = Math.floor(passedSeconds / 60)
            let passedHours = Math.floor(passedSeconds / 3600)
            var ls = "Latest Reading: "
            ls += (1 + dt.getUTCMonth()) + "/" + dt.getUTCDate() + "/" + dt.getUTCFullYear() +
                ' at ' + dt.getUTCHours().toString() + ":" + (dt.getUTCMinutes() < 10 ? "0" : "") + dt.getUTCMinutes().toString()
            if (ps < 60) {
                ls += "  (" + ps + " seconds ago)"
            } else if (passedMinutes < 4) {
                ps -= 60 * passedMinutes
                ls += "  (" + passedMinutes + " min " + ps + " seconds ago)"
            } else if (passedMinutes < 60) {
                ls += "  (" + passedMinutes + " minutes ago)"
            } else {
                ls += "  (" + passedHours + " hours ago)"
            }
            setLastSeen(ls)
        }



        // var svgContainer = d3.select(slRef.current)
        // svgContainer.selectAll("*").remove()
        // var svg = svgContainer.append("svg")
        //     .attr("height", 10)
        //     .attr("width", slRef.current.clientWidth)
        //     .append("g")

        // var svgDefs = svg.append('defs')

        // var mainGradient = svgDefs.append('linearGradient').attr('id', 'sinceLast')
        // mainGradient.append('stop').attr('stop-color', "lightGreen").attr('offset', 0.55)
        // mainGradient.append('stop').attr('stop-color', "red").attr('offset', 1)

        // svg.append("rect")
        //     .attr("x", 0)
        //     .attr("width", slRef.current.clientWidth)
        //     .attr("y", 0)
        //     .attr("height", 10)
        //     .style("stroke-width", 2)
        //     .style("stroke", 'url(#sinceLast)')
        //     .style("fill", 'url(#sinceLast)')

        // var offset = passedSeconds > 0 ? Math.log10(passedSeconds) / 2.477 : 0
        // offset = offset > 1 ? 1 : parseInt(slRef.current.clientWidth * offset)
        // if (isNaN(offset)) { debugger }
        // svg.append("rect")
        //     .attr("x", offset)
        //     .attr("width", slRef.current.clientWidth - offset)
        //     .attr("y", 0)
        //     .attr("height", 10)
        //     .style("stroke-width", 2)
        //     .style("stroke", 'white')
        //     .style("fill", 'white')

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passedSeconds, latest])


    return (

        <table style={{ width: '100%', ...rest }} >
            <tbody>
                <tr>
                    <td colSpan={4} className="bold">
                        <center>{lastSeen}</center><br />
                    </td>
                </tr>
                <tr>
                    <td className="blue">Speed:</td>
                    <td className="bold">{latest ? latest.speed : 0} mph</td>
                    <td className="blue"> Temperature: </td>
                    <td className="bold">{latest ? latest.temperature : 0} F</td>
                </tr>
                <tr>
                    <td className="blue">Direction:</td>
                    <td className="bold"> {dirText}</td>
                    <td className="blue">Pressure:</td>
                    <td className="bold">{latest ? latest.pressure : 0} mBar</td>
                </tr>
                <tr>
                    <td className="blue">Sunrise:</td>
                    <td className="bold"> {sunrise} </td>
                    <td className="blue">Humidity:</td>
                    <td className="bold">{latest ? latest.humidity : 0}%</td>
                </tr>
                <tr>
                    <td className="blue">Sunset:</td>
                    <td className="bold">{sunset} </td>
                </tr>
                {/* <tr>
                    <td className="blue">LastSeen:</td>
                    <td colSpan="3" className="blue" ref={slRef} border="1px solid black">
                    </td>
                </tr> */}
            </tbody>
        </table>
    )
}

export default CurrentTable
