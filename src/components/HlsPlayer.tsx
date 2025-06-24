/**
 * @packageDocumentation
 * HLSPlayer component for playing HLS video streams in the Gliderport application.
 * Handles native HLS (Safari) and Hls.js for other browsers.
 * Includes auto-recovery on network/visibility changes.
 */
import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export interface HLSPlayerProps {
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

/**
 * HLSPlayer component for playing HLS video streams.
 * Handles native HLS (Safari) and Hls.js for other browsers.
 * Includes auto-recovery on network/visibility changes.
 * 
 * @param props - The props for the HLSPlayer component.
 * @returns {React.ReactElement} The rendered video player.
 */
export function HLSPlayer({
    src,
    width = 800,
    height,
    controls = true,
    autoPlay = true,
    muted = true,
}: HLSPlayerProps): React.ReactElement {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Helper: start playback if autoPlay is true
        const startPlayback = () => {
            if (autoPlay) {
                video.play().catch((err) => console.warn('Autoplay failed:', err));
            }
        };

        // 1) If Safari natively supports HLS
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            startPlayback();
        } else if (Hls.isSupported()) {
            // 2) Else, use Hls.js
            const hls = new Hls({
                // You can tune this if needed:
                // manifestReloadInterval: 5000, // milliseconds between playlist reloads
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                startPlayback();
            });

            // If Hls.js emits an error like network unavailable, try to recover
            hls.on(Hls.Events.ERROR, (eventName, data) => {
                console.error('Hls.js error:', data);
                window.location.reload(); // ⬅️ Full page reload

                // If it's a network disruption or manifest load error, try restart
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    console.log('Network error detected, attempting to recover...');
                    hls.startLoad(); // start loading again immediately
                }
            });
        } else {
            console.error('This browser does not support HLS playback');
        }

        // 3) Listen for visibilitychange to detect “wake from sleep”
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Page just became visible again
                if (hlsRef.current) {
                    console.log('Page is visible—calling hls.startLoad() to resume playback');
                    hlsRef.current.startLoad();
                } else {
                    // For native Safari HLS, re‐set the src to force reload:
                    video.src = src;
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 4) Listen for “online” event (when network connectivity returns)
        const handleOnline = () => {
            console.log('Network is back online—resuming HLS load');
            if (hlsRef.current) {
                hlsRef.current.startLoad();
            } else {
                video.src = src;
            }
        };
        window.addEventListener('online', handleOnline);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
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
}

export default HLSPlayer;