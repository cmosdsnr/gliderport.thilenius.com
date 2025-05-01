import React, { useRef, useState, useEffect } from 'react'
import { Row } from 'react-bootstrap'
import { FilterProvider } from 'contexts/FilterContext'
import WindChart from './WindChart'
import SimpleChart from './SimpleChart'


const Charts = ({ ...rest }) => {

    const [passedSeconds, setPassedSeconds] = useState(0)
    const [clientWidth, setClientWidth] = useState<number>(0)
    const rowRef = useRef<HTMLElement>(null)


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
        <FilterProvider>
            <Row ref={rowRef} style={{ backgroundColor: "rgb(240,255,255)" }} {...rest}>
                <WindChart clientWidth={clientWidth} label="Speed (mph) & Dir (color)" />
                <SimpleChart clientWidth={clientWidth} label="Direction" />
                <SimpleChart clientWidth={clientWidth} label="Temperature" />
                <SimpleChart clientWidth={clientWidth} label="Pressure" />
                <SimpleChart clientWidth={clientWidth} label="Humidity" />
            </Row>
        </FilterProvider>
    )
}
export default Charts