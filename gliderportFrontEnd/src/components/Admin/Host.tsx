/**
 * @packageDocumentation Host
 *
 * Host component embeds a remote iframe and provides a ping button
 * to post messages to the embedded frame via postMessage.
 */
import React, { useRef } from 'react';
import RemoteFrame, { RemoteFrameHandle } from './RemoteFrame';

/**
 * Host component renders a button to ping a remote iframe
 * and the RemoteFrame itself.
 *
 * @returns React.ReactElement containing the ping control and iframe.
 */
export function Host(): React.ReactElement {
    // Ref to interact with RemoteFrame methods
    const frameRef = useRef<RemoteFrameHandle>(null);

    /**
     * Sends a ping message to the remote frame via its `post` method.
     */
    const handlePing = (): void => {
        frameRef.current?.post({ type: 'ping' });
    };

    return (
        <>
            <h1>Host</h1>
            <button onClick={handlePing}>Ping remote</button>

            <RemoteFrame
                ref={frameRef}
                src={import.meta.env.VITE_SERVER_URL}
                expectedOrigin={[
                    import.meta.env.VITE_SERVER_URL,
                    '/.*github.*/'
                ]}
                onMessage={(data): void => console.log('From remote:', data)}
                height={600}
            />
        </>
    );
};

export default Host;
