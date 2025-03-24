import React, { useState, useEffect, useRef } from 'react'
import { useData } from 'contexts/DataContext'
import Viewer from 'react-viewer'
import OutOfOrder from 'images/OutOfOrder.jpg'
import OffTime from 'images/OffTime.jpg'
import { useInterval, b64toBlob } from '../Globals'
import Button from 'react-bootstrap/Button';
import { Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'



import switch_camera from 'images/switch-camera.png';


interface Props {
}

export default function UpdatingImage({ }: Props) {

    const [visible, setVisible] = React.useState<boolean>(false)
    const [imgSrc, setImgSrc] = useState<string>("")
    const [imgSrcLarge, setImgSrcLarge] = useState<string>("")
    const [camera, setCamera] = useState(1);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [timeToSunrise, setTimeToSunrise] = useState<String>("")

    const { sun, bigImage1, bigImage2, cameraImages, offline, sleeping } = useData()
    const imgRef = useRef(null)

    useEffect(() => {
        if (sleeping) setSunriseText();
    }, [sleeping])

    const setSunriseText = () => {
        let tsNow = (new Date()).getTime() / 1000;
        // if it is before sunrise...
        if (tsNow < sun?.rise) {
            const SecondsToSunrise = Math.round(sun.rise - tsNow)
            console.log("SecondsToSunrise: ", SecondsToSunrise, " Sunrise: ",
                sun.rise, " tsNow: ", Math.round(tsNow))
            const h = Math.floor(SecondsToSunrise / 3600)
            const m = Math.floor(SecondsToSunrise / 60 - h * 60)
            setTimeToSunrise("Sunrise in " + h + ":" + (m > 10 ? m : "0" + m));
        } else {
            setTimeToSunrise("")
        }
    }

    useInterval(setSunriseText, 1000 * 60)//seconds

    useEffect(() => {
        let cycleCount = 0; // To track cycles when at the last image

        const interval = setInterval(() => {
            const images = camera === 1 ? cameraImages.camera1 : cameraImages.camera2;
            if (images.length === 0) return; // Prevent division by zero

            setCurrentIndex((prevIndex) => {
                if (prevIndex + 1 === images.length) {
                    if (cycleCount < 4) { // Wait for 4 cycles (0, 1, 2, 3)
                        cycleCount++;
                        return prevIndex; // Stay on last image
                    } else {
                        cycleCount = 0; // Reset cycle count
                        return 0; // Restart from first image
                    }
                } else {
                    return prevIndex + 1; // Normal increment
                }
            });
        }, 400);

        return () => clearInterval(interval);
    }, [camera, cameraImages]);


    // useEffect(() => {
    //     const image = camera == 1 ? image1 : image2;
    //     // night image is set by gliderport PI3 into the database
    //     if (offline) {
    //         console.log("image effect: offline")
    //         setImgSrc(OutOfOrder)
    //     }
    //     else if (image === null) {
    //         console.log("image effect: null image")
    //         setImgSrc(OutOfOrder)
    //     }
    //     else {
    //         // console.log("image effect: new image added")
    //         const blob = b64toBlob(image, "image/jpeg")
    //         if (blob != null) {
    //             const blobUrl = URL.createObjectURL(blob)
    //             setImgSrc(blobUrl)
    //         }
    //     }
    // }, [image1, image2, offline, camera])



    1223

    const getLargeImage = () => {

    }


    return (
        <Row style={{
            marginBottom: "15px",
        }} >
            <Row>
                {(sleeping || (camera == 1 ? cameraImages.camera1.length == 0 : cameraImages.camera2.length == 0)) ? (
                    <div style={{ position: "relative" }}>
                        <img
                            src={OffTime} // Replace with actual path
                            alt="OffTime"
                            style={{ width: "100%", marginBottom: "10px" }}
                        />
                        <svg height="35" width="450" style={{ position: "absolute", top: "10px", left: "20px", fontSize: "1.8vw" }}>
                            <text x="0" y="30" fill="green">{timeToSunrise}</text>
                        </svg>
                    </div>
                ) : offline ? (
                    <div style={{ position: "relative" }}>
                        <img
                            src={OutOfOrder} // Replace with actual path
                            alt="OutOfOrder"
                            style={{ width: "100%", marginBottom: "10px" }}
                        />
                        <svg height="35" width="350" transform="translate(0,0) rotate(-35 -0 -0)" className="top-left">
                            <text x="0" y="30" fill="red" >Internet offline</text>
                            Sorry, your browser does not support inline SVG.
                        </svg>
                    </div>
                ) : (
                    <div style={{ position: "relative" }}>
                        <img
                            onClick={() => { getLargeImage(); setVisible(true) }}
                            src={`data:image/jpeg;base64,${camera == 1 ? cameraImages.camera1[currentIndex].image : cameraImages.camera2[currentIndex].image}`}
                            alt={`Camera {camera} - ${currentIndex}`}
                            style={{ width: "100%", marginBottom: "10px" }}
                        />
                        <svg height="35" width="350" style={{ position: "absolute", top: "0px", left: "20px", fontSize: "24px" }}>
                            <text x="0" y="30" fill="black">{camera == 1 ? cameraImages.camera1[currentIndex].dateString : cameraImages.camera2[currentIndex].dateString}</text>
                        </svg>
                    </div>
                )}
            </Row>
            <Row>
                <Col xs={6} >
                    <span style={{
                        border: "1px solid black",
                        borderRadius: "8px",
                        padding: "18px",
                        backgroundColor: "rgba(7, 190, 250, 0.8)",

                    }} onClick={() => { setCamera(camera == 1 ? 2 : 1) }}>
                        <img src={switch_camera} alt="Switch Camera" onClick={() => { setCamera(camera == 1 ? 2 : 1) }} style={{ width: '50px', height: '50px' }} />
                        <span style={{ marginLeft: 10 }} >go to {camera == 1 ? "left" : "right"} camera</span>
                    </span>
                </Col>
                <Col xs={6} >
                    Live Image every 15 Seconds, click to expand and zoom
                </Col>
            </Row>
            {/* <Button className="btn btn-info" style={{ marginTop: "5px" }} onClick={() => { setCamera(camera == 1 ? 2 : 1) }}>{camera == 2 ? <FontAwesomeIcon icon={faArrowLeft} /> : null}  Switch to Camera {camera == 1 ? 2 : 1}  {camera == 1 ? <FontAwesomeIcon icon={faArrowRight} /> : null}</Button> */}
            <Viewer
                visible={visible}
                onClose={() => { setVisible(false); }}
                images={[{ src: imgSrcLarge, alt: '' }]}
            />


            {/* <span className="bottom-left">{timeToSunrise}</span> */}
            {/* <span style={{ position: "absolute", top: "80px", left: "-150px", }} >{timeToSunrise}</span> */}
            {/* {OutOfOrder ? <p className="ooo" >Temporarily Out of Order</p> : null} */}
        </Row>
    )
}

