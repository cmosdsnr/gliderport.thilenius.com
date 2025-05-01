import React, { useState, useEffect } from 'react'
import { useData } from 'contexts/DataContext'
import { useStatusCollection } from '@/contexts/StatusCollection'
import { useInterval } from 'hooks/useInterval'

const CurrentTable = ({ ...rest }) => {

    const { readings } = useData();
    const { sun } = useStatusCollection();

    const latest = readings[readings.length - 1] ?? {
        speed: 0,
        temperature: 0,
        pressure: 0,
        humidity: 0,
        direction: 0,
        secondsPassed: 0,
        time: 0
    };
    // seconds since the latest reading
    const [secondsPassed, setSecondsPassed] = useState(
        Math.max(0, Math.floor(Date.now() / 1000) - latest.time)
    );

    // update secondsPassed every 5s
    useInterval(() => {
        setSecondsPassed(Math.max(0, Math.floor(Date.now() / 1000) - latest.time));
    }, 5_000);


    function timeAgo(ts: number) {
        const diff = Math.floor(Date.now() / 1000) - ts;
        const diffSeconds = diff % 60;
        const diffMinutes = Math.floor(diff / 60);
        const diffHours = Math.floor(diff / (60 * 60));

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


    const dt = new Date(1000 * latest.time);
    // formatted last-seen string
    const lastSeen = (() => {
        const dt = new Date(latest.time * 1000);
        return `Latest Reading: ${dt.toLocaleString(undefined, {
            dateStyle: 'short',   // e.g. “9/4/23”
            timeStyle: 'short'    // e.g. “3:05 PM”
        })} (${timeAgo(latest.time)})`;
    })();


    // format sunrise/sunset
    const sunrise = sun?.rise
        ? new Date(sun.rise * 1000).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }
        )
        : 'N/A';
    const sunset = sun?.set
        ? new Date(sun.set * 1000).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }
        )
        : 'N/A';

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
                    <td className="bold">{latest.speed} mph</td>
                    <td className="blue"> Temperature: </td>
                    <td className="bold">{latest.temperature} F</td>
                </tr>
                <tr>
                    <td className="blue">Direction:</td>
                    <td className="bold"> {latest.direction + " deg  (" + Math.abs(270 - latest.direction) + " deg off)"}</td>
                    <td className="blue">Pressure:</td>
                    <td className="bold">{latest.pressure} mBar</td>
                </tr>
                <tr>
                    <td className="blue">Sunrise:</td>
                    <td className="bold"> {sunrise} </td>
                    <td className="blue">Humidity:</td>
                    <td className="bold">{latest.humidity}%</td>
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
