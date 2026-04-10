import React, {
    useEffect,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
} from 'react';

/**
 * Handle exposed by RemoteFrame to allow parent components to send messages.
 */
export interface RemoteFrameHandle {
    /**
     * Post a message payload to the embedded iframe.
     * @param payload Arbitrary data to send via postMessage
     */
    post: (payload: any) => void;
}

/**
 * Props for the RemoteFrame component.
 */
export interface RemoteFrameProps {
    /** URL or path of the page to embed in the iframe. */
    src: string;
    /**
     * Expected origin(s) of messages from the iframe. If provided, only messages
     * from matching origin(s) will be forwarded.
     */
    expectedOrigin?: string | string[] | RegExp;
    /**
     * Callback invoked when a validated message is received from the iframe.
     * @param data The data payload posted by the remote page
     */
    onMessage?: (data: any) => void;
    /** CSS height (e.g. '100%', '600px') for the iframe. Defaults to '100%'. */
    height?: string | number;
    /** CSS width (e.g. '100%', '800px') for the iframe. Defaults to '100%'. */
    width?: string | number;
}

/**
 * RemoteFrame wraps an iframe and enables two-way postMessage communication.
 *
 * Features:
 * - Exposes an imperative `post` method via ref to send messages to the iframe.
 * - Validates incoming messages against expectedOrigin.
 * - Calls onMessage when a valid message arrives.
 *
 * @example
 * ```tsx
 * const ref = useRef<RemoteFrameHandle>(null);
 * <RemoteFrame
 *   ref={ref}
 *   src="https://example.com"
 *   expectedOrigin="https://example.com"
 *   onMessage={data => console.log(data)}
 * />
 * // later:
 * ref.current?.post({ type: 'ping' });
 * ```
 * @param props - The props for the RemoteFrame component.
 * @param ref - Ref to expose the post method.
 * @returns {React.ReactElement} The rendered iframe.
 */
export function RemoteFrameComponent(
    { src, expectedOrigin, onMessage, height = '100%', width = '100%' }: RemoteFrameProps,
    ref: React.Ref<RemoteFrameHandle>
): React.ReactElement {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [ready, setReady] = useState(false);

    /** Expose the {@link RemoteFrameHandle.post} method to parent components via ref. */
    useImperativeHandle(
        ref,
        () => ({
            /**
             * Send a payload to the iframe via postMessage.
             * No-op if the iframe isn't loaded yet.
             */
            post: (payload: any) => {
                if (!ready) return;
                const win = iframeRef.current?.contentWindow;
                if (win) {
                    win.postMessage(payload, '*');
                }
            },
        }),
        [ready]
    );

    /** Sets `ready` to `true` once the iframe's `load` event fires, enabling `post`. */
    const handleLoad = () => setReady(true);

    /**
     * Listen for messages from the iframe and forward valid ones via onMessage.
     */
    useEffect(() => {
        const handler = (ev: MessageEvent) => {
            let valid = false;
            if (!expectedOrigin) {
                valid = true;
            } else if (typeof expectedOrigin === 'string') {
                valid = ev.origin === expectedOrigin;
            } else if (expectedOrigin instanceof RegExp) {
                valid = expectedOrigin.test(ev.origin);
            } else if (Array.isArray(expectedOrigin)) {
                valid = expectedOrigin.includes(ev.origin);
            }
            if (valid) {
                onMessage?.(ev.data);
            }
        };
        window.addEventListener('message', handler);
        return () => {
            window.removeEventListener('message', handler);
        };
    }, [expectedOrigin, onMessage]);

    return (
        <iframe
            ref={iframeRef}
            src={src}
            title="remote-frame"
            style={{ border: 'none', height, width }}
            onLoad={handleLoad}
        />
    );
}

/**
 * `RemoteFrame` is the ref-forwarding wrapper around {@link RemoteFrameComponent}.
 * Use this export when you need to call {@link RemoteFrameHandle.post} imperatively.
 *
 * @example
 * ```tsx
 * const ref = useRef<RemoteFrameHandle>(null);
 * <RemoteFrame ref={ref} src="/embed" onMessage={handleMsg} />
 * ref.current?.post({ type: 'ping' });
 * ```
 */
const RemoteFrame = forwardRef<RemoteFrameHandle, RemoteFrameProps>(RemoteFrameComponent);

export default RemoteFrame;
