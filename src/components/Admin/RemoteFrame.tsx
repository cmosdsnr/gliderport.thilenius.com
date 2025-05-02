// RemoteFrame.tsx
import React, {
    useEffect,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
} from 'react';

export interface RemoteFrameHandle {
    /** Send a message to the remote page. */
    post: (payload: any) => void;
}

interface RemoteFrameProps {
    /** Absolute or relative URL of the page to embed. */
    src: string;
    /** Optional origin check for incoming messages.  E.g. "https://example.com". */
    expectedOrigin?: string | string[];
    /** Callback when the remote page sends data back. */
    onMessage?: (data: any) => void;
    /** Height in css units (defaults to 100%). */
    height?: string | number;
    /** Width in css units (defaults to 100%). */
    width?: string | number;
}

/**
 * A small wrapper around <iframe> that:
 *  1. Loads an external page.
 *  2. Sets up window.postMessage communication both ways.
 *  3. Gives the parent component an imperative handle (`post`) so it can talk
 *     to the frame without ref drilling.
 *
 * Usage:
 * ```tsx
 * const ref = useRef<RemoteFrameHandle>(null);
 *
 * <RemoteFrame
 *   ref={ref}
 *   src="https://example.com/widget"
 *   expectedOrigin="https://example.com"
 *   onMessage={data => console.log('👂', data)}
 * />
 *
 * // later…
 * ref.current?.post({ type: 'ping' });
 * ```
 */
const RemoteFrame = forwardRef<RemoteFrameHandle, RemoteFrameProps>(
    (
        { src, expectedOrigin, onMessage, height = '100%', width = '100%' },
        ref,
    ) => {
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const [ready, setReady] = useState(false);

        /* ------------------------------------------------------------
         *  Expose imperative handle
         * ---------------------------------------------------------- */
        useImperativeHandle(
            ref,
            () => ({
                post: payload => {
                    if (!ready || !iframeRef.current?.contentWindow) return;
                    iframeRef.current.contentWindow.postMessage(payload, '*');
                },
            }),
            [ready],
        );

        /* ------------------------------------------------------------
         *  Listen for load → mark frame ready
         * ---------------------------------------------------------- */
        const handleLoad = () => setReady(true);

        /* ------------------------------------------------------------
         *  Listen for postMessage events from remote
         * ---------------------------------------------------------- */
        useEffect(() => {
            const handler = (ev: MessageEvent) => {
                const ok =
                    !expectedOrigin ||                      // no filter → allow all
                    (typeof expectedOrigin === 'string' && ev.origin === expectedOrigin) ||
                    (Array.isArray(expectedOrigin) && expectedOrigin.includes(ev.origin)) ||
                    (expectedOrigin instanceof RegExp && expectedOrigin.test(ev.origin));

                if (ok) onMessage?.(ev.data);
            };

            window.addEventListener('message', handler);
            return () => window.removeEventListener('message', handler);
        }, [expectedOrigin, onMessage]);

        return (
            <iframe
                ref={iframeRef}
                src={src}
                style={{ border: 'none', height, width }}
                onLoad={handleLoad}
                title="remote-frame"
            />
        );
    },
);

export default RemoteFrame;
