import React, { useRef } from 'react';
import RemoteFrame, { RemoteFrameHandle } from './RemoteFrame';

const Host = () => {
    const frameRef = useRef<RemoteFrameHandle>(null);

    return (
        <>
            <h1>Host</h1>
            <button onClick={() => frameRef.current?.post({ type: 'ping' })}>
                Ping remote
            </button>

            <RemoteFrame
                ref={frameRef}
                src="https://gpupdate.thilenius.com"
                expectedOrigin={["https://gpupdate.thilenius.com",
                    "/.*github.*/"]}
                onMessage={data => console.log('From remote:', data)}
                height={600}
            />
        </>
    );
};

export default Host;