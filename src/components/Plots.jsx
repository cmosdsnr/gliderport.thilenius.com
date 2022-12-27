import React, { useRef, useState, useEffect } from 'react'
import { Row } from "react-bootstrap"
import WindChart from "./Charts/WindChart"
import SimpleChart from "./Charts/SimpleChart"


const Plots = props => {
    const { ...rest } = props

    const [clientWidth, setClientWidth] = useState(0)
    const rowRef = useRef(null)


    useEffect(() => {
        const resizeAndDraw = () => {
            const container = rowRef.current
            if (!container) {
                console.log("no container")
                return
            }
            setClientWidth(container.clientWidth)
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])

    return (
        <Row ref={rowRef} style={{ backgroundColor: "rgb(240,255,255)" }} {...rest}>
            <WindChart clientWidth={clientWidth} label="Speed (mph) & Dir (color)" />
            <SimpleChart clientWidth={clientWidth} label="Direction" />
            <SimpleChart clientWidth={clientWidth} label="Temperature" />
            <SimpleChart clientWidth={clientWidth} label="Pressure" />
            <SimpleChart clientWidth={clientWidth} label="Humidity" />
        </Row>
    )
}
export default Plots