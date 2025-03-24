import React, { useState, useEffect } from 'react'
import { useData } from 'contexts/DataContext'

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

    function timeAgo(date: Date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime(); // difference in milliseconds
        const diffSeconds = Math.floor(diffMs / (1000 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours >= 1) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMinutes >= 1) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else if (diffSeconds >= 1) {
            return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
        }
        else {
            return 'just now';
        }
    }

    useEffect(() => {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        });

        if (latest?.time) {
            var dt = new Date(1000 * latest.time);
            setLastSeen("Latest Reading: " + dt.toLocaleDateString() + " " + dt.toLocaleTimeString() + " (" + timeAgo(dt) + ")");
        } else {
            setLastSeen("Latest Reading: No data received yet")
        }

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
