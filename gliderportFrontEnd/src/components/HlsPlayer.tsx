/**
 * @packageDocumentation
 * HLSPlayer component for playing HLS video streams in the Gliderport application.
 * Handles native HLS (Safari) and Hls.js for other browsers.
 * Includes auto-recovery on network/visibility changes.
 */
import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

/**
 * Props for the {@link HLSPlayer} component.
 *
 * @remarks
 * Browsers that natively support HLS (Safari) will use the `<video src>` attribute
 * directly. All other browsers use Hls.js. Both paths respect the same set of props.
 */
export interface HLSPlayerProps {
    /** URL to the HLS playlist (.m3u8). Changing this prop destroys and recreates the Hls.js instance. */
    src: string;
    /** Pixel width of the `<video>` element. Defaults to `800`. */
    width?: number;
    /** Pixel height of the `<video>` element. When omitted, height is `"auto"`. */
    height?: number;
    /** Whether to render native video controls. Defaults to `true`. */
    controls?: boolean;
    /** Whether the player starts playing as soon as the manifest is parsed. Defaults to `true`. */
    autoPlay?: boolean;
    /** Mutes audio — required by most browsers to honour `autoPlay`. Defaults to `true`. */
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

        /**
         * Attempts to play the video when `autoPlay` is enabled.
         * Silently swallows browser-policy autoplay rejections.
         */
        const startPlayback = () => {
            if (autoPlay) {
                video.play().catch((err) => console.warn('Autoplay failed:', err));
            }
        };

        // Branch 1: Safari — native HLS support via <video src>.
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            startPlayback();
        } else if (Hls.isSupported()) {
            // Branch 2: All other browsers — use Hls.js.
            const hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                startPlayback();
            });

            /**
             * Recovery strategy on Hls.js error:
             * - Schedules a full page reload after 5 s (last-resort).
             * - For network errors, immediately calls `hls.startLoad()` to retry
             *   segment fetching without waiting for the reload.
             */
            hls.on(Hls.Events.ERROR, (eventName, data) => {
                console.error('Hls.js error:', data);
                setTimeout(() => window.location.reload(), 5000);

                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    console.log('Network error detected, attempting to recover...');
                    hls.startLoad();
                }
            });
        } else {
            console.error('This browser does not support HLS playback');
        }

        /**
         * Resumes HLS loading when the page becomes visible again (e.g. after
         * the device wakes from sleep or the user switches back to the tab).
         */
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (hlsRef.current) {
                    console.log('Page is visible—calling hls.startLoad() to resume playback');
                    hlsRef.current.startLoad();
                } else {
                    video.src = src;
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        /**
         * Resumes HLS loading when the browser reports that network connectivity
         * has been restored (the `window` `”online”` event).
         */
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
            style={{ width: '100%', maxWidth: `${width}px`, height: height ? `${height}px` : 'auto' }}
        >
            Your browser does not support HTML5 video.
        </video>
    );
}

export default HLSPlayer;