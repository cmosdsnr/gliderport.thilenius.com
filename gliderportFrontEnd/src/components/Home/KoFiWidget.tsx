/**
 * 
 * @packageDocumentation
 *   React component that injects the Ko-fi “floating-chat” widget script into the page.
 *   On mount, it loads the external overlay-widget.js script and calls `kofiWidgetOverlay.draw`
 *   to render a floating donation button. Cleans up by removing the script on unmount.
 */

import React, { useEffect } from 'react';

// Extend the Window interface to include the Ko-fi overlay API
declare global {
    interface Window {
        kofiWidgetOverlay: any;
    }
}

/**
 * KoFiWidget
 *
 * Dynamically loads the Ko-fi overlay widget script and initializes it with
 * custom button text and colors. Does not render any React-visible JSX.
 *
 * Usage: include <KoFiWidget /> once at the root of your app (e.g. in <App />)
 * so that the floating “Support me” button appears on all pages.
 *
 * @returns {React.ReactElement} Returns null (no visible JSX).
 */
export function KoFiWidget(): React.ReactElement {
    useEffect(() => {
        // Create and configure the script element
        const script = document.createElement('script');
        script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
        script.async = true;

        // Once the script loads, draw the widget if the API is available
        script.onload = () => {
            if (window.kofiWidgetOverlay) {
                window.kofiWidgetOverlay.draw('gpwebsite', {
                    type: 'floating-chat',
                    'floating-chat.donateButton.text': 'Support me',
                    'floating-chat.donateButton.background-color': '#00b9fe',
                    'floating-chat.donateButton.text-color': '#fff',
                });
            }
        };

        // Append to body to start loading
        document.body.appendChild(script);

        // Cleanup: remove the script element on unmount
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return <></>;
}

export default KoFiWidget;
