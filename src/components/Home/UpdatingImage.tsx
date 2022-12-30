import React, { useState, useEffect, useRef } from "react"
import { useData } from '../../contexts/DataContext'
import Viewer from 'react-viewer'

import OutOfOrder from "../../images/OutOfOrder.jpg"
import OffTime from "../../images/OffTime.jpg"
import { useInterval, b64toBlob } from "../Globals"

export default function UpdatingImage({ offline }) {

    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [doNotReload, setDoNotReload] = useState<boolean>(false)
    const [visible, setVisible] = React.useState<boolean>(false)
    const [imgSrc, setImgSrc] = useState<string>("")
    const [imgSrcLarge, setImgSrcLarge] = useState<string>("")

    const [timeToSunrise, setTimeToSunrise] = useState<String>("")
    const [itIsDark, setItIsDark] = useState<boolean>(false)

    const { sun, image, bigImage, loadData } = useData()
    const imgRef = useRef(null)


    // update 'time passed' numbers on screen
    const interval = 10 //seconds
    useInterval(() => {
        const tsNow = (new Date()).getTime() / 1000
        // if it is before sunrise...
        if ((tsNow < sun?.rise - 15 * 60) || (tsNow > sun?.set + 15 * 60)) {
            let SecondsToSunrise = sun.rise - tsNow
            if (tsNow > sun.set) SecondsToSunrise += 24 * 3600
            const h = Math.floor(SecondsToSunrise / 3600)
            const m = Math.floor(SecondsToSunrise / 60 - h * 60)
            setTimeToSunrise("Sunrise in " + (h > 0 ? h + " hours, " : "") + m + " minutes")
            setItIsDark(true)
        } else {
            setItIsDark(false)
        }
    }, interval * 1000)


    useEffect(() => {
        const tsNow = (new Date()).getTime() / 1000
        if ((tsNow < sun?.rise - 15 * 60) || (tsNow > sun?.set + 15 * 60)) {
            setItIsDark(true)
        } else {
            setItIsDark(false)
        }
    }, [sun])

    // load initial image
    useEffect(() => {
        loadData("Image")
    }, [])

    useEffect(() => {
        if (itIsDark) {
            setImgSrc(OffTime)
        } else if (offline) {
            setImgSrc(OutOfOrder)
        } else if (image != null) {
            const blob = b64toBlob(image, "image/jpeg")
            const blobUrl = URL.createObjectURL(blob)
            setImgSrc(blobUrl)
        }
    }, [image, itIsDark, offline])

    useEffect(() => {
        if (itIsDark) {
            setImgSrcLarge(OffTime)
        } else if (offline) {
            setImgSrcLarge(OutOfOrder)
        } else if (bigImage != null) {
            const blob = b64toBlob(bigImage, "image/jpeg")
            const blobUrl = URL.createObjectURL(blob)
            setImgSrcLarge(blobUrl)
        }
    }, [bigImage, itIsDark, offline])

    return (
        <>
            <img ref={imgRef} onClick={() => { loadData("BigImage"); setVisible(true) }} src={imgSrc} className="img-fluid" alt="" />
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
            {itIsDark ? <span className="bottom-left">{timeToSunrise}</span> : null}
            {/* <p className="ooo">Some Equipment was removed<br />Waiting for staff to return it...</p> */}
            {/* <p className="ooo" >Temporarily Out of Order</p> */}
        </>
    )
}
