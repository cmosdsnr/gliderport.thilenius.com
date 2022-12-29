import React, { useState, useEffect, useRef } from "react"
import { useData } from '../../contexts/DataContext'
import Viewer from 'react-viewer'

import OutOfOrder from "../../images/OutOfOrder.jpg"
import OffTime from "../../images/OffTime.jpg"

export default function UpdatingImage({ itIsDark, offline }) {

    const [isLoaded, setIsLoaded] = useState(false);
    const [doNotReload, setDoNotReload] = useState(false)
    const [visible, setVisible] = React.useState(false)
    const [imgSrc, setImgSrc] = useState()
    const [imgSrcLarge, setImgSrcLarge] = useState()
    const { image, bigImage, loadData } = useData()
    const imgRef = useRef(null)

    const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }

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
            <img ref={imgRef} onClick={() => { loadData("BigImage") }} src={imgSrc} className="img-fluid" alt="" />
            <Viewer
                visible={visible}
                onClose={() => { setVisible(false); }}
                images={[{ src: imgSrcLarge, alt: '' }]}
            />
        </>
    )
}
