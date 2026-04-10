/**
 * @packageDocumentation
 *
 * Live camera slideshow component for the Gliderport home page.
 *
 * Exports {@link UpdatingImage}, which cycles through frames from two IP
 * cameras and provides an interactive high-resolution viewer overlay.
 *
 * ### States
 * | Condition | Display |
 * |-----------|---------|
 * | `sleeping === true` OR no images loaded | `OffTime.jpg` placeholder with an SVG sunrise-countdown label |
 * | `offline === true` | `OutOfOrder.jpg` placeholder with a red "Internet offline" label |
 * | Normal operation | Active slideshow with camera-switch and rotation controls |
 *
 * ### Slideshow behaviour
 * - A 400 ms `setInterval` advances `currentIndex` through the available
 *   frames for the selected camera.
 * - After reaching the last frame the component pauses for 4 extra ticks
 *   (≈ 1.6 s) before wrapping back to frame 0.
 * - When rotation is disabled (persisted in `localStorage` via the toggle
 *   switch) the component always pins to the latest frame.
 *
 * ### High-resolution viewer
 * Clicking the active image calls {@link API.getLargeImage} to fetch a
 * base-64-encoded JPEG, converts it to an object URL via {@link b64toBlob},
 * and displays it in a `react-viewer` overlay that supports pan and zoom.
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
 * Props for the {@link UpdatingImage} component.
 *
 * Currently no props are required; all data is sourced from context hooks
 * ({@link useCamera}, {@link useSocialData}, {@link useStatusCollection}).
 */
export interface Props { }

/**
 * Live camera image slideshow with a high-resolution zoom viewer.
 *
 * Reads frames from {@link useSensorData} / {@link useCamera} and manages
 * three display states (sleeping, offline, active).  See the
 * {@link @packageDocumentation | module docs} for a full description of the
 * slideshow and viewer behaviour.
 *
 * @returns A Bootstrap `<Row>` containing the image area and camera controls.
 *
 * @example
 * ```tsx
 * // Placed on the Home page alongside the WindDial.
 * <UpdatingImage />
 * ```
 */
export function UpdatingImage({ }: Props): React.ReactElement {
    /** Controls visibility of the `react-viewer` high-resolution overlay. */
    const [visible, setVisible] = useState<boolean>(false);
    /** Index of the active camera: `1` for the left camera, `2` for the right camera. */
    const [camera, setCamera] = useState<number>(1);
    /** Current frame index within the active camera's image array. */
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    /** Whether the slideshow auto-advances frames.  Persisted in `localStorage` under the key `"rotate"`. */
    const [rotate, setRotate] = useLocalStorageState<boolean>('rotate', true);

    /** Human-readable countdown string shown over the `OffTime` placeholder (e.g. `"Sunrise in 1:45"`). */
    const [timeToSunrise, setTimeToSunrise] = useState<string>('');
    /** Object URL for the high-resolution JPEG fetched from the API, passed to the viewer overlay. */
    const [imgSrcLarge, setImgSrcLarge] = useState<string>('');

    /** Provides the `cameraImages` frame arrays for both cameras. */
    const { cameraImages } = useCamera();
    /** Provides the `offline` flag indicating whether internet connectivity is unavailable. */
    const { offline } = useSocialData();
    /** Ref for the active-image container element; passed to `WindDial` for vertical alignment. */
    const imgRef = useRef<HTMLDivElement | null>(null);
    /** Provides `sun` (sunrise/sunset timestamps) and `sleeping` (cameras off) from the status collection. */
    const { sun, sleeping } = useStatusCollection();

    /**
     * Triggers the sunrise countdown computation whenever the `sleeping` flag
     * transitions to `true` (cameras have gone offline for the night).
     */
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

    /** Re-runs {@link setSunriseText} every 60 seconds to keep the countdown accurate. */
    useInterval(setSunriseText, 60 * 1000);

    /**
     * Drives the 400 ms slideshow interval.  When rotation is enabled the
     * index advances through all frames, pausing for 4 extra ticks at the
     * last frame before wrapping.  When rotation is disabled the index is
     * pinned to the last frame on every tick.  The interval is recreated
     * whenever `camera`, `cameraImages`, or `rotate` changes.
     */
    useEffect(() => {
        let cycleCount = 0;
        const interval = setInterval(() => {
            const images = camera === 1 ? cameraImages.camera1 : cameraImages.camera2;
            if (!images.length) return;
            if (!rotate) {
                /** When rotation is disabled, pin to the latest available frame. */
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

    /**
     * Pins `currentIndex` to the last frame immediately when the selected
     * camera or image list changes while rotation is disabled.  This prevents
     * stale indices from a previous camera or image set being displayed.
     */
    useEffect(() => {
        if (!rotate) {
            const images = camera === 1 ? cameraImages.camera1 : cameraImages.camera2;
            if (images.length) setCurrentIndex(images.length - 1);
        }
    }, [camera, cameraImages, rotate]);

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
