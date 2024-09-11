import React, { useRef, useEffect, useState } from "react"
import Row from "react-bootstrap/Row"
import Col from "react-bootstrap/Col"
import LineCanvas from "./LineCanvas"
import CircleCanvas from "./CircleCanvas"
import KeyCanvas from "./KeyCanvas"
import { useData } from '../../contexts/DataContext'
import '../../css/history.css';

export default function History() {

    const containerRef = useRef<HTMLInputElement>()
    const containerKeyRef = useRef<HTMLInputElement>()
    const [clockFormat, setClockFormat] = useState(false)
    const [toggleText, setToggleText] = useState("Toggle to Clock Format")
    const [circleWidth, setCircleWidth] = useState(100)
    const [keyWidth, setKeyWidth] = useState(100)
    // const [history, setHistory] = useState(Array.apply(null, Array(8)).map(function (x, i) { return {}; }))

    const { loadData, history } = useData()

    // load history
    useEffect(() => {
        loadData("History")
    }, [])

    useEffect(() => {
        if (history) console.log(history)
    }, [history])

    const resizeAndDraw = () => {

        const container = containerRef.current
        const containerKey = containerKeyRef.current
        console.log(typeof container)
        if (!container || !containerKey) {
            if (!container) { console.log("no container") }
            if (!containerKey) { console.log("no containerKey") }
            return
        }
        const maxWidth = 500
        var cw = container.clientWidth;
        // console.log(cw)
        setCircleWidth(cw > maxWidth ? maxWidth : cw)
        setKeyWidth(containerKey.clientWidth)
    }

    useEffect(() => {
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])

    useEffect(() => {
        resizeAndDraw()
        // debugger
    }, [clockFormat, history])

    const toggleFormat = () => {
        setToggleText("Toggle to " + (clockFormat ? "Clock" : "Line") + " Format")
        setClockFormat(!clockFormat)
    }

    return (
        <>
            <Row className="history-container">
                <Col sm={3}>
                    <button
                        className="btn btn-primary btn-sm history-button"
                        onClick={toggleFormat}
                    >
                        {toggleText}
                    </button>
                </Col>
                <Col sm={6}>
                    <h4 className="history-title">8 Day History with 2 day Forecast</h4>
                </Col>
            </Row>
            <Row ref={containerKeyRef} className="key-container">
                <KeyCanvas width={keyWidth} />
            </Row>

            {!clockFormat ? (
                <div className="line-history-container">
                    {history?.map((day, i) => (
                        <Row key={i} ref={containerRef}>
                            <LineCanvas width={keyWidth} data={day} />
                        </Row>
                    ))}
                </div>
            ) : (
                <Row className="circle-history-container">
                    {history?.map((day, i) => (
                        <Col
                            ref={containerRef}
                            key={i}
                            xs={12}
                            md={6}
                            lg={{ span: 4, offset: 0 }}
                            xl={{ span: 3, offset: 0 }}
                        >
                            <CircleCanvas width={circleWidth} data={day} />
                        </Col>
                    ))}
                </Row>
            )}
        </>
    )
}
