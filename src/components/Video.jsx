import React, { useState, useEffect } from 'react'
import JSMpeg from 'jsmpeg-player'

export default function Video() {
    useEffect(() => {
        let videoUrl = 'wss://gliderportvideo.thilenius.org'
        // let videoUrl = 'ws://localhost:8081'
        let videoWrapper = document.getElementById("videoWrapper");
        let player = new JSMpeg.VideoElement(videoWrapper, videoUrl)
        return () => {
            player.destroy()
        }

    }, [])
    return (

        <div id="videoWrapper" style={{
            width: "800px", height: "450px", margin: "auto", marginTop: "30px"
        }} />

    )
}
