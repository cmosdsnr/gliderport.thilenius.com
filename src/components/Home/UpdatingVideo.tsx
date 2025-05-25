import React, { useState, useEffect, useRef } from 'react'
import { useData } from 'contexts/DataContext'
import Viewer from 'react-viewer'
import OutOfOrder from 'images/OutOfOrder.jpg'
import OffTime from 'images/OffTime.jpg'
import { b64toBlob } from '../Globals'
import { useInterval } from 'hooks/useInterval'
import Button from 'react-bootstrap/Button'
import { Row, Col, Form } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { useStatusCollection } from '@/contexts/StatusCollection'
import { useLocalStorageState } from 'hooks/useLocalStorageState'
import switch_camera from 'images/switch-camera.png'
import HLSPlayer from '../HlsPlayer';

interface Props { }

export default function UpdatingImage({ }: Props) {
    const [visible, setVisible] = React.useState<boolean>(false)
    const [camera, setCamera] = useState(1)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [rotate, setRotate] = useLocalStorageState<boolean>("rotate", true) // NEW: toggle rotation

    const [timeToSunrise, setTimeToSunrise] = useState<string>('')
    const [imgSrcLarge, setImgSrcLarge] = useState<string>('')
    const { cameraImages, offline } = useData()
    const imgRef = useRef(null)
    const { sun, sleeping } = useStatusCollection()

    /* ------------------------------------------------------------------ */
    /*                       Sunrise countdown logic                      */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        if (sleeping) setSunriseText()
    }, [sleeping])

    const setSunriseText = () => {
        const tsNow = Date.now() / 1000
        if (tsNow < sun?.rise) {
            const secondsToSunrise = Math.round(sun.rise - tsNow)
            const h = Math.floor(secondsToSunrise / 3600)
            const m = Math.floor(secondsToSunrise / 60 - h * 60)
            setTimeToSunrise(`Sunrise in ${h}:${m > 10 ? m : '0' + m}`)
        } else {
            setTimeToSunrise('')
        }
    }

    useInterval(setSunriseText, 60 * 1000)

    /* ------------------------------------------------------------------ */
    /*                        Slideshow / rotation                        */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        let cycleCount = 0 // To track cycles when at the last image

        const interval = setInterval(() => {
            const images = camera === 1 ? cameraImages.camera1 : cameraImages.camera2
            if (images.length === 0) return

            if (!rotate) {
                // Rotation disabled → always stick to most recent image (index = length - 1)
                setCurrentIndex(images.length - 1)
                return
            }

            setCurrentIndex(prevIndex => {
                if (prevIndex + 1 === images.length) {
                    if (cycleCount < 4) {
                        cycleCount++
                        return prevIndex
                    }
                    cycleCount = 0
                    return 0
                }
                return prevIndex + 1
            })
        }, 400)

        return () => clearInterval(interval)
    }, [camera, cameraImages, rotate])

    // When camera changes or new images arrive while rotation is off, make sure we show latest
    useEffect(() => {
        if (!rotate) {
            const images = camera === 1 ? cameraImages.camera1 : cameraImages.camera2
            if (images.length) setCurrentIndex(images.length - 1)
        }
    }, [camera, cameraImages, rotate])

    /* ------------------------------------------------------------------ */
    /*                    Fetch full‑resolution on click                  */
    /* ------------------------------------------------------------------ */
    const getLargeImage = async () => {
        try {
            const url = new URL('/getLargeImage', import.meta.env.VITE_UPDATE_SERVER_URL)
            url.searchParams.set('camera', camera.toString())
            const res = await fetch(url.toString())
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
            const data: { image: string; date: number } = await res.json()
            const blob = b64toBlob(data.image, 'image/jpeg')
            setImgSrcLarge(blob ? URL.createObjectURL(blob) : '')
        } catch (err) {
            console.error(err)
        }
    }

    /* ------------------------------------------------------------------ */
    /*                               Render                               */
    /* ------------------------------------------------------------------ */
    return (
        <Row style={{ marginBottom: '15px' }}>
            {/* Image area */}
            <Row>
                {sleeping ? (
                    <div style={{ position: 'relative' }}>
                        <img src={OffTime} alt="OffTime" style={{ width: '100%', marginBottom: '10px' }} />
                        <svg height="35" width="450" style={{ position: 'absolute', top: '10px', left: '20px', fontSize: '1.8vw' }}>
                            <text x="0" y="30" fill="green">{timeToSunrise}</text>
                        </svg>
                    </div>
                ) : offline ? (
                    <div style={{ position: 'relative' }}>
                        <img src={OutOfOrder} alt="OutOfOrder" style={{ width: '100%', marginBottom: '10px' }} />
                        <svg height="35" width="350" transform="translate(0,0) rotate(-35 -0 -0)" className="top-left">
                            <text x="0" y="30" fill="red">Internet offline</text>
                        </svg>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        {camera == 1 && <HLSPlayer src="https://gpupdate.thilenius.com/images/stream/camera1/index.m3u8" />}
                        {camera == 2 && <HLSPlayer src="https://gpupdate.thilenius.com/images/stream/camera2/index.m3u8" />}
                    </div>
                )}
            </Row>

            {/* Controls */}
            {!sleeping &&
                <Row className="justify-content-center align-items-center">
                    <Col xs="auto" className="mt-3">
                        <span
                            style={{
                                width: '30%',
                                border: '1px solid black',
                                borderRadius: '8px',
                                padding: '18px',
                                backgroundColor: 'rgba(7, 190, 250, 0.8)',
                                cursor: 'pointer'
                            }}
                            onClick={() => setCamera(camera === 1 ? 2 : 1)}
                        >
                            <img
                                src={switch_camera}
                                alt="Switch Camera"
                                style={{ width: '50px', height: '50px' }}
                            />
                            <span style={{ marginLeft: 10 }}>
                                go to {camera === 1 ? 'left' : 'right'} camera
                            </span>
                        </span>
                    </Col>
                </Row>
            }

            <Viewer visible={visible} onClose={() => setVisible(false)} images={[{ src: imgSrcLarge, alt: '' }]} />
        </Row>
    )
}
