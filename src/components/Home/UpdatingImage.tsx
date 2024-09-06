import React, { useState, useEffect, useRef } from "react"
import { useData } from '../../contexts/DataContext'
import Viewer from 'react-viewer'

import OutOfOrder from "../../images/OutOfOrder.jpg"

import { useInterval, b64toBlob } from "../Globals"

interface Props {
    offline: boolean
}

export default function UpdatingImage({ offline }: Props) {

    const [visible, setVisible] = React.useState<boolean>(false)
    const [imgSrc, setImgSrc] = useState<string>("")
    const [imgSrcLarge, setImgSrcLarge] = useState<string>("")
    const [camera, setCamera] = useState(1)

    const [timeToSunrise, setTimeToSunrise] = useState<String>("")

    const { sun, image1, bigImage1, image2, bigImage2, loadData } = useData()
    const imgRef = useRef(null)

    const outOfOrder = false;

    // update 'time passed' numbers on screen
    const interval = 10 //seconds
    useInterval(() => {
        let tsNow = (new Date()).getTime() / 1000;
        // if it is before sunrise...
        if (tsNow < sun?.rise) {
            const SecondsToSunrise = Math.round(sun.rise - tsNow)
            console.log("SecondsToSunrise: ", SecondsToSunrise, " Sunrise: ",
                sun.rise, " tsNow: ", Math.round(tsNow))
            const h = Math.floor(SecondsToSunrise / 3600)
            const m = Math.floor(SecondsToSunrise / 60 - h * 60)
            setTimeToSunrise("Sunrise in " + (h > 0 ? h + " hours, " : "") + m + " minutes")
        } else {
            setTimeToSunrise("")
        }
    }, interval * 1000)

    // load initial image
    useEffect(() => {
        loadData("Image1")
        loadData("Image2")
    }, [])

    useEffect(() => {
        const image = camera == 1 ? image1 : image2;
        // night image is set by gliderport PI3 into the database
        if (offline) {
            console.log("image effect: offline")
            setImgSrc(OutOfOrder)
        }
        else if (image === null) {
            console.log("image effect: null image")
            setImgSrc(OutOfOrder)
        }
        else {
            // console.log("image effect: new image added")
            const blob = b64toBlob(image, "image/jpeg")
            if (blob != null) {
                const blobUrl = URL.createObjectURL(blob)
                setImgSrc(blobUrl)
            }
        }
    }, [image1, image2, offline, camera])



    useEffect(() => {
        const bigImage = camera == 1 ? bigImage1 : bigImage2;
        // night image is set by gliderport PI3 into the database
        if (offline) {
            console.log("image effect: offline")
            setImgSrcLarge(OutOfOrder)
        }
        else if (bigImage === null) {
            console.log("image effect: null image")
            setImgSrcLarge(OutOfOrder)
        }
        else {
            // console.log("image effect: new image added")
            const blob = b64toBlob(bigImage, "image/jpeg")
            if (blob != null) {
                const blobUrl = URL.createObjectURL(blob)
                setImgSrcLarge(blobUrl)
            }
        }
    }, [bigImage1, bigImage2, offline, camera])



    return (
        <>
            <img ref={imgRef} onClick={() => { loadData("BigImage"); setVisible(true) }} src={imgSrc} className="img-fluid" alt="" />
            <button onClick={() => { setCamera(camera == 1 ? 2 : 1) }}>Switch to Camera {camera == 1 ? 2 : 1}</button>
            <Viewer
                visible={visible}
                onClose={() => { setVisible(false); }}
                images={[{ src: imgSrcLarge, alt: '' }]}
            />
            {offline ?
                <svg height="35" width="350" transform="translate(0,0) rotate(-35 -0 -0)" className="top-left">
                    <text x="0" y="30" fill="red" >Internet offline</text>
                    Sorry, your browser does not support inline SVG.
                </svg>
                : null
            }
            <span className="bottom-left">{timeToSunrise}</span>
            {outOfOrder ? <p className="ooo" >Temporarily Out of Order</p> : null}
        </>
    )
}
