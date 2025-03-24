import React, { useState, useEffect, useRef } from 'react'
import { Row, Col } from 'react-bootstrap'
import StatusCanvas from './StatusCanvas'
import { useData } from 'contexts/DataContext'

export default function Status() {
    const [lastStatus, setLastStatus] = useState<string>("")
    const rowRef = useRef<HTMLDivElement>(null)
    const width = useRef<number>(0)

    const {
        status,
        lastCheck,
        loadData,
    } = useData()


    useEffect(() => {
        var dt = new Date(1000 * lastCheck)
        var mm = dt.getMonth() + 1 // getMonth() is zero-based
        var dd = dt.getDate()
        var hh = dt.getHours()
        var mn = dt.getMinutes()
        var ss = dt.getSeconds()
        setLastStatus(
            [
                (mm > 9 ? '' : '0') + mm, "-",
                (dd > 9 ? '' : '0') + dd, "-",
                dt.getFullYear(), " at ",
                (hh > 9 ? '' : '0') + hh, ":",
                (mn > 9 ? '' : '0') + mn, ":",
                (ss > 9 ? '' : '0') + ss,
            ].join('')
        )
    }, [lastCheck])


    useEffect(() => {
        loadData("Status")
        const resizeAndDraw = () => {
            const divContainer = rowRef.current
            if (!divContainer) {
                console.log("no container")
                return
            }
            width.current = divContainer.clientWidth
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])

    useEffect(() => {
        // debugger
    }, [status])



    return (
        <>
            <Row>
                <Col xs={{ offset: 3, span: 6 }} style={{ textAlign: 'center' }}>
                    <h4>Gliderport Internet Status History</h4>
                    <p>red indicates the gliderports internet is down (either power failure or internet issues)</p>
                    <p>green indicates the data/images/video should be available</p>
                    <p>Status was last checked on {lastStatus}</p>
                </Col>
            </Row>
            <Row ref={rowRef}>
                {status?.map((day, i) => {
                    return (
                        <StatusCanvas key={i} width={width.current} data={day} full={i === (status.length - 1)} />
                    )
                })
                }
            </Row >
            <Row style={{ height: '200px' }}>
            </Row>
        </>
    )
}
