import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HLSPlayerProps {
    /** URL to the HLS playlist (m3u8) */
    src: string;
    /** Width of the video player */
    width?: number;
    /** Height of the video player */
    height?: number;
    /** Whether to show controls */
    controls?: boolean;
    /** Autoplay the video on load */
    autoPlay?: boolean;
    /** Mute audio for autoplay compliance */
    muted?: boolean;
}

const HLSPlayer: React.FC<HLSPlayerProps> = ({
    src,
    width = 800,
    height,
    controls = true,
    autoPlay = true,
    muted = true,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const startPlayback = () => {
            if (autoPlay) {
                video.play().catch(err => console.warn('Autoplay failed:', err));
            }
        };

        // Native HLS support (Safari)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            startPlayback();
        } else if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                startPlayback();
            });
            hls.on(Hls.Events.ERROR, (event, { type, details, fatal }) => {
                console.error('HLS error', event, details);
                if (fatal) {
                    hls.startLoad(); // try to recover
                }
            });
            return () => {
                hls.destroy();
            };
        } else {
            console.error('This browser does not support HLS playback');
        }
    }, [src, autoPlay]);

    return (
        <video
            ref={videoRef}
            controls={controls}
            autoPlay={autoPlay}
            muted={muted}
            playsInline
            style={{ width: `${width}px`, height: height ? `${height}px` : 'auto' }}
        >
            Your browser does not support HTML5 video.
        </video>
    );
};

export default HLSPlayer;
