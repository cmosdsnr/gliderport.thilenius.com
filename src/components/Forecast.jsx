import React, { useRef, useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import "../css/forecast.css"
export default function Forecast() {
    const [headers, setHeaders] = useState([])
    const [rows, setRows] = useState([[]])
    const { loadData, forecastFull } = useData()

    // load history
    useEffect(() => {
        loadData("ForecastFull")
    }, [])

    useEffect(() => {
        console.log(forecastFull)
        if (forecastFull?.length > 0) {
            let keysList = {}
            forecastFull.forEach((v, i) => {
                keysList = { ...keysList, ...v }
            })
            let keys = Object.keys(keysList)
            setHeaders(keys)
            let hr = []
            let hrs = []
            forecastFull.forEach((v, i) => {
                keys.forEach((w, j) => {
                    if (v[w] != null) {
                        if (v[w]['1h'] != null)
                            hr.push(v[w]['1h'])
                        else if (w === 'dt') {
                            const dt = new Date(1000 * v[w])
                            hr.push(dt.toLocaleString().replace(/\/[0-9]*,/, ""))
                        } else if (w === "temp" || w === "feels_like" || w === "dew_point") {
                            hr.push(parseInt(v[w]))
                        }
                        else
                            hr.push(v[w])
                    }
                    else hr.push("")
                })
                hrs.push(hr)
                hr = []
            })
            setRows(hrs)
        }
    }, [forecastFull])


    return (
        <>
            <h1><center>Forecast Data for the next 48 hrs</center></h1>
            <table style={{ marginRight: "50px" }}>
                <tbody>
                    <tr>
                        {headers.map((d, i) => {
                            return (<th key={i}>{d}</th>)
                        })}
                    </tr>

                    {rows.map((row, i) => {
                        return (<tr key={i}>
                            {Array.isArray(row) ? row.map((w, j) => {
                                return (<td key={j}>{w}</td>)
                            }) : <></>}
                        </tr>)
                    })}
                </tbody>
            </table>
        </>
    )
}

