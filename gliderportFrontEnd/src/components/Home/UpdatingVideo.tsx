/**
 * UpdatingVideo component displays live video feeds from two cameras,
 * shows offline and sleeping placeholders, and provides a camera switch control.
 *
 * @packageDocumentation UpdatingVideo
 */
import React, { useState, useEffect } from 'react'
import { useSocialData } from '@/contexts/SocialDataContext'
import OutOfOrder from 'images/OutOfOrder.jpg'
import OffTime from 'images/OffTime.jpg'
import useInterval from 'hooks/useInterval'
import { Row, Col } from 'react-bootstrap'
import { useStatusCollection } from '@/contexts/StatusCollection'
import switch_camera from 'images/switch-camera.png'
import HLSPlayer from '../HlsPlayer'
import { API } from '@/api'

/**
 * React component that displays live video from two camera streams.
 * It handles offline and sleeping states, provides a sunrise countdown when sleeping,
 * and includes a camera switch control.
 *
 * @returns {React.ReactElement} The rendered UpdatingVideo component.
 */
export function UpdatingVideo(): React.ReactElement {
    const [camera, setCamera] = useState<number>(1)
    const [timeToSunrise, setTimeToSunrise] = useState<string>('')
    const { offline } = useSocialData()
    const { sun, sleeping } = useStatusCollection()

    // Update sunrise countdown when sleeping state changes
    useEffect(() => {
        if (sleeping) {
            updateSunriseText()
        } else {
            setTimeToSunrise('')
        }
    }, [sleeping, sun.rise])

    /**
     * Calculates and sets the time remaining until next sunrise.
     * Only runs when `sleeping` is true.
     */
    const updateSunriseText = () => {
        if (!sleeping) return
        const now = Date.now() / 1000
        let secondsToSunrise = Math.round(24 * 3600 + sun.rise - now)
        if (secondsToSunrise < 0) secondsToSunrise += 24 * 3600
        const h = Math.floor(secondsToSunrise / 3600)
        const m = Math.floor(secondsToSunrise / 60 - h * 60)
        setTimeToSunrise(`Sunrise in ${h}:${m < 10 ? '0' + m : m}`)
    }

    // Refresh countdown every minute
    useInterval(updateSunriseText, 60 * 1000)

    return (
        <Row style={{ marginBottom: '15px' }}>
            {/* Video display area */}
            <Row>
                {sleeping ? (
                    <div style={{ position: 'relative' }}>
                        <img
                            src={OffTime}
                            alt="Off time"
                            style={{ width: '100%', marginBottom: '10px' }}
                        />
                        <svg
                            height="35"
                            width="450"
                            style={{
                                position: 'absolute',
                                top: '10px',
                                left: '20px',
                                fontSize: '1.8vw',
                            }}
                        >
                            <text x="0" y="30" fill="green">
                                {timeToSunrise}
                            </text>
                        </svg>
                    </div>
                ) : offline ? (
                    <div style={{ position: 'relative' }}>
                        <img
                            src={OutOfOrder}
                            alt="Offline"
                            style={{ width: '100%', marginBottom: '10px' }}
                        />
                        <svg height="35" width="350" transform="translate(0,0) rotate(-35 0 0)" className="top-left">
                            <text x="0" y="30" fill="red">Internet offline</text>
                        </svg>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        {camera === 1 ? (
                            <HLSPlayer src={API.cameraStream(1)} />
                        ) : (
                            <HLSPlayer src={API.cameraStream(2)} />
                        )}
                    </div>
                )}
            </Row>

            {/* Camera switch control */}
            {!sleeping && (
                <Row className="justify-content-center align-items-center">
                    <Col xs="auto" className="mt-3">
                        <span
                            style={{
                                width: '30%',
                                border: '1px solid black',
                                borderRadius: '8px',
                                padding: '18px',
                                backgroundColor: 'rgba(7, 190, 250, 0.8)',
                                cursor: 'pointer',
                            }}
                            onClick={() => setCamera(camera === 1 ? 2 : 1)}
                        >
                            <img
                                src={switch_camera}
                                alt="Switch camera"
                                style={{ width: '50px', height: '50px' }}
                            />
                            <span style={{ marginLeft: 10 }}>
                                go to {camera === 1 ? 'left' : 'right'} camera
                            </span>
                        </span>
                    </Col>
                </Row>
            )}
        </Row>
    )
}

export default UpdatingVideo;
