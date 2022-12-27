import React, { useState, useEffect } from "react"
import { useData } from '../../contexts/DataContext'
import WindChart from "./WindChart"


export default function Charts() {

    const [data, setData] = useState({ speed: [[0, 0]], humidity: [[]], direction: [[]], pressure: [[]], temperature: [[]] })
    const { charts } = useData()


    // link up the data
    useEffect(() => {
        return charts(setData)
    }, [charts])

    return (

        <WindChart rawSpeed={data.speed} rawDirection={data.direction} tsStart={data.start} />

    )
}
