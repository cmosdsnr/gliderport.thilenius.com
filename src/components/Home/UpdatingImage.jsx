import React, { useState, useEffect, useRef } from "react"
// import { useData } from '../../contexts/DataContext'
import Viewer from 'react-viewer';

import OutOfOrder from "../../images/OutOfOrder.jpg"
import OffTime from "../../images/OffTime.jpg"

export default function UpdatingImage({ itIsDark, offline, imageWasUpdated }) {

    const [isLoaded, setIsLoaded] = useState(false);
    const [doNotReload, setDoNotReload] = useState(false)
    const [visible, setVisible] = React.useState(false)
    const [imgSrc, setImgSrc] = useState()
    const [imgSrcLarge, setImgSrcLarge] = useState()

    const imgRef = useRef(null)

    useEffect(() => {
        if (itIsDark) {
            setImgSrc(OffTime)
        } else if (offline) {
            setImgSrc(OutOfOrder)
        } else {
            var image = "https://live.flytorrey.com/images/current.jpg?=" + Math.random()
            if (!offline && !itIsDark) {
                setDoNotReload(false)
            }
            if ((!visible && !doNotReload) || !isLoaded) {
                setIsLoaded(true)
                try {
                    fetch(image)
                        .then(response => response.blob())
                        .then(imageBlob => {
                            setImgSrc(URL.createObjectURL(imageBlob))
                        });
                } catch (error) {
                    console.log("failed to fetch image")
                }

            }
            if (offline || itIsDark) {
                setDoNotReload(true)
            }
        }
        console.log("width: " + imgRef.current.width)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itIsDark, offline, imageWasUpdated, visible])

    const loadLarge = () => {
        var image = "https://live.flytorrey.com/images/current_big.jpg?=" + Math.random()
        try {
            fetch(image)
                .then(response => response.blob())
                .then(imageBlob => {
                    setImgSrcLarge(URL.createObjectURL(imageBlob))
                    setVisible(true)
                });
        } catch (error) {
            console.log("failed to fetch image")
        }
    }

    return (
        <>
            <img ref={imgRef} onClick={() => { loadLarge() }} src={imgSrc} className="img-fluid" alt="" />
            <Viewer
                visible={visible}
                onClose={() => { setVisible(false); }}
                images={[{ src: imgSrcLarge, alt: '' }]}
            />
        </>
    )
}
