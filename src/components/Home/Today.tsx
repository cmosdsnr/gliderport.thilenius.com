import React, { useState, useEffect } from 'react'
import { DayOfCodes } from '../History/History'
import { codes } from '../Globals'

const Today = () => {
    const [today, setToday] = useState<DayOfCodes>([]);

    useEffect(() => {
        const fetchForecastCodes = async () => {
            try {
                const url = new URL("/getForecastCodes", import.meta.env.VITE_UPDATE_SERVER_URL);
                const res = await fetch(url.toString());
                if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                const forecastCodes: any = await res.json();
                forecastCodes[0].pop(); // remove last element (it is dark)
                setToday(forecastCodes[0]);
            } catch (err: any) {
                console.error(err.message);
                return;
            }
        }
        fetchForecastCodes();
    }, []);

    return (
        <table className="forecast-table">
            <thead>
                <tr>
                    <th colSpan={2}>Today's Forecast</th>
                </tr>
            </thead>
            <tbody>
                {today?.map((code, i) => {
                    return (
                        <tr key={i}>
                            <td className="forecast-time">
                                {new Date(code[0] * 1000)
                                    .toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        hour12: false
                                    })}
                            </td>
                            <td className="forecast-wind">
                                {codes[code[1]].code}
                            </td>
                        </tr>
                    )
                })
                }
            </tbody>
        </table>
    )
}

export default Today