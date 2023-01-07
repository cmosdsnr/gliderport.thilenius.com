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
    //width: "960px", height: "540px",
    //width: "1920px", height: "1080px",
    //width: "3840px", height: "2160px",
    return (

        <div id="videoWrapper" style={{
            width: "960px", height: "540px", margin: "auto", marginTop: "30px"
        }} />

    )
}
