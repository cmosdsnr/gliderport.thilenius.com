import React, { useRef, useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import "../css/forecast.css"
export default function Forecast() {

    const { loadData, forecastFull } = useData()

    // load history
    useEffect(() => {
        loadData("ForecastFull")
    }, [])

    useEffect(() => {
        console.log(forecastFull)
    }, [forecastFull])


    return (
        <>
            <h1><center>Forecast Data for the next 48 hrs</center></h1>
            <table style={{ marginRight: "50px" }}>
                <tr>
                    {Object.keys(forecastFull[0])?.map((d, i) => {
                        return (<th>{d}</th>)

                    })}
                </tr>

                {forecastFull?.map((d, i) => {
                    return (<tr>
                        {Object.keys(d).map((w, j) => { return (<td>{JSON.stringify(d[w])}</td>) })}
                    </tr>)
                })}
            </table>
        </>
    )
}

