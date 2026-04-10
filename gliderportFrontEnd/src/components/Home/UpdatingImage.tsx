// src/components/UpdatingImage.tsx

/**
 * 
 * @packageDocumentation
 *   React component that displays a live slideshow of camera images, handles
 *   rotating through images or showing the latest when rotation is off, provides
 *   a countdown to sunrise when cameras are sleeping, and allows users to click
 *   to fetch and zoom into a high-resolution image in a viewer overlay.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useCamera } from '@/contexts/CameraContext';
import { useSocialData } from '@/contexts/SocialDataContext';
import Viewer from 'react-viewer';
import OutOfOrder from 'images/OutOfOrder.jpg';
import OffTime from 'images/OffTime.jpg';
import { b64toBlob } from '../Globals';
import useInterval from 'hooks/useInterval';
import Button from 'react-bootstrap/Button';
import { Row, Col, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useStatusCollection } from '@/contexts/StatusCollection';
import useLocalStorageState from 'hooks/useLocalStorageState';
import switch_camera from 'images/switch-camera.png';
import { API } from '@/api';

/**
 * Props type for UpdatingImage (currently none).
 */
export interface Props { }

/**
 * UpdatingImage
 *
 * Displays the current camera image feed. Handles three states:
 * - Sleeping: shows an "OffTime" placeholder with a countdown to sunrise.
 * - Offline: shows an "OutOfOrder" placeholder indicating no internet.
 * - Active: cycles through `cameraImages` slideshow or shows latest if rotation is off.
 * Clicking the image fetches a high-resolution version and opens a zoomable overlay.
 * Includes controls to switch cameras and toggle rotation.
 *
 * @returns {React.ReactElement}
 */
export function UpdatingImage({ }: Props): React.ReactElement {
    // Viewer visibility state
    const [visible, setVisible] = useState<boolean>(false);
    // Active camera index: 1 or 2
    const [camera, setCamera] = useState<number>(1);
    // Current slide index within cameraImages
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    // Rotation toggle persisted in localStorage
    const [rotate, setRotate] = useLocalStorageState<boolean>('rotate', true);

    // Countdown text until sunrise
    const [timeToSunrise, setTimeToSunrise] = useState<string>('');
    // Source URL for the high-resolution image
    const [imgSrcLarge, setImgSrcLarge] = useState<string>('');

    // Data context: cameraImages and offline flag
    const { cameraImages } = useCamera();
    const { offline } = useSocialData();
    // Ref for image container sizing (passed to WindDial elsewhere)
    const imgRef = useRef<HTMLDivElement | null>(null);
    // Status context: sunrise time and sleeping flag
    const { sun, sleeping } = useStatusCollection();

    // ------------------------------------------------------------------
    // Sunrise countdown logic
    // ------------------------------------------------------------------
    useEffect(() => {
        if (sleeping) setSunriseText();
    }, [sleeping]);

    /**
     * Computes and updates the countdown to sunrise when cameras are sleeping.
     */
    function setSunriseText(): void {
        const tsNow = Date.now() / 1000;
        if (sun?.rise && tsNow < sun.rise) {
            const secondsToSunrise = Math.round(sun.rise - tsNow);
            const h = Math.floor(secondsToSunrise / 3600);
            const m = Math.floor(secondsToSunrise / 60 - h * 60);
            setTimeToSunrise(`Sunrise in ${h}:${m > 9 ? m : '0' + m}`);
        } else {
            setTimeToSunrise('');
        }
    }

    // Update countdown every minute
    useInterval(setSunriseText, 60 * 1000);

    // ------------------------------------------------------------------
    // Slideshow / rotation logic
    // ------------------------------------------------------------------
    useEffect(() => {
        let cycleCount = 0;
        const interval = setInterval(() => {
            const images = camera === 1 ? cameraImages.camera1 : cameraImages.camera2;
            if (!images.length) return;
            if (!rotate) {
                // When rotation disabled, always show latest
                setCurrentIndex(images.length - 1);
                return;
            }
            setCurrentIndex((prevIndex) => {
                if (prevIndex + 1 === images.length) {
                    if (cycleCount < 4) {
                        cycleCount++;
                        return prevIndex;
                    }
                    cycleCount = 0;
                    return 0;
                }
                return prevIndex + 1;
            });
        }, 400);
        return () => clearInterval(interval);
    }, [camera, cameraImages, rotate]);

    // Ensure latest image when camera or images change and rotation is off
    useEffect(() => {
        if (!rotate) {
            const images = camera === 1 ? cameraImages.camera1 : cameraImages.camera2;
            if (images.length) setCurrentIndex(images.length - 1);
        }
    }, [camera, cameraImages, rotate]);

    // ------------------------------------------------------------------
    // Fetch full-resolution image on click
    // ------------------------------------------------------------------
    /**
     * Fetches a high-resolution camera image from the API, converts it from
     * base64, and sets it for the Viewer overlay.
     */
    async function getLargeImage(): Promise<void> {
        try {
            const res = await fetch(API.getLargeImage(camera));
            if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
            const data: { image: string; date: number } = await res.json();
            const blob = b64toBlob(data.image, 'image/jpeg');
            setImgSrcLarge(blob ? URL.createObjectURL(blob) : '');
        } catch (err: any) {
            console.error('Error fetching large image:', err);
        }
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
        <Row style={{ marginBottom: '15px' }}>
            {/* Image area */}
            <Row>
                {sleeping ||
                    (camera === 1 ? cameraImages.camera1.length === 0 : cameraImages.camera2.length === 0) ? (
                    <div style={{ position: 'relative' }}>
                        <img src={OffTime} alt="Off time placeholder" style={{ width: '100%', marginBottom: '10px' }} />
                        <svg height="35" width="450" style={{ position: 'absolute', top: '10px', left: '20px', fontSize: '1.8vw' }}>
                            <text x="0" y="30" fill="green">{timeToSunrise}</text>
                        </svg>
                    </div>
                ) : offline ? (
                    <div style={{ position: 'relative' }}>
                        <img src={OutOfOrder} alt="Offline placeholder" style={{ width: '100%', marginBottom: '10px' }} />
                        <svg height="35" width="350" transform="translate(0,0) rotate(-35)" className="top-left">
                            <text x="0" y="30" fill="red">Internet offline</text>
                        </svg>
                    </div>
                ) : (
                    <div style={{ position: 'relative' }} ref={imgRef}>
                        <img
                            onClick={() => { getLargeImage(); setVisible(true); }}
                            src={cameraImages[camera === 1 ? 'camera1' : 'camera2'][currentIndex]?.url}
                            alt={`Camera ${camera} - ${currentIndex}`}
                            style={{ width: '100%', marginBottom: '10px' }}
                        />
                        <svg height="35" width="350" style={{ position: 'absolute', top: '0px', left: '20px', fontSize: '24px' }}>
                            <text x="0" y="30" fill="black">
                                {camera === 1
                                    ? cameraImages.camera1[currentIndex].dateString
                                    : cameraImages.camera2[currentIndex].dateString}
                            </text>
                        </svg>
                    </div>
                )}
            </Row>

            {/* Controls */}
            <Row className="align-items-center">
                <Col xs={6}>
                    <span
                        style={{
                            border: '1px solid black',
                            borderRadius: '8px',
                            padding: '18px',
                            backgroundColor: 'rgba(7, 190, 250, 0.8)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                        }}
                        onClick={() => setCamera(camera === 1 ? 2 : 1)}
                    >
                        <FontAwesomeIcon icon={camera === 1 ? faArrowRight : faArrowLeft} />
                        <span style={{ marginLeft: 10 }}>
                            Go to {camera === 1 ? 'right' : 'left'} camera
                        </span>
                    </span>
                </Col>
                <Col xs={6}>
                    <Row className="mt-2 text-center">
                        <Col xs={12}>Live Image every 5s, click to zoom</Col>
                        <Col xs={12} className="d-flex justify-content-center align-items-center">
                            <Form.Check
                                type="switch"
                                id="rotate-switch"
                                inline
                                label={rotate ? 'Rotation: ON' : 'Rotation: OFF'}
                                checked={rotate}
                                onChange={(e) => setRotate(e.target.checked)}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* Viewer overlay for large image */}
            <Viewer
                visible={visible}
                onClose={() => setVisible(false)}
                images={[{ src: imgSrcLarge, alt: 'High resolution image' }]}
            />
        </Row>
    );
}

export default UpdatingImage;
