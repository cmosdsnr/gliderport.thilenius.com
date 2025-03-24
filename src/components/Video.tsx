import React, { useState, useEffect } from 'react'
import JSMpeg from 'jsmpeg-player'
import { useData } from 'contexts/DataContext'

export default function Video() {
    const [tooMany, setTooMany] = useState(false)
    const { videoWidth, videoHeight, numberConnections, offline } = useData()

    useEffect(() => {
        // let videoUrl = import.meta.env.VITE_VIDEO_SERVER_URL
        let videoUrl = import.meta.env.VITE_VIDEO_SERVER_URL
        let videoWrapper = document.getElementById("videoWrapper");
        setTooMany(numberConnections >= 10)
        let player = numberConnections < 10 ? new JSMpeg.VideoElement(videoWrapper, videoUrl) : null
        return () => {
            player?.destroy()
        }

    }, [])

    //width: "960px", height: "540px",
    //width: "1920px", height: "1080px",
    //width: "3840px", height: "2160px",
    return (
        <>
            {offline ? <h3>Not available when the Gliderport is offline</h3> :
                <>
                    <center><h5>size: {videoWidth}x{videoHeight} number of players: {numberConnections} of 10</h5></center>
                    {tooMany ? <h3>Too many connections. Please try again later</h3> :
                        <div id="videoWrapper" style={{
                            width: "960px", height: "540px", margin: "auto", marginTop: "30px"
                        }} />
                    }
                </>}
        </>

    )
}
