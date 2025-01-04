import React, { useEffect } from 'react';

const KoFiWidget = () => {
    useEffect(() => {
        // Create a script element for the widget
        const script = document.createElement('script');
        script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
        script.async = true;
        script.onload = () => {
            if (window.kofiWidgetOverlay) {
                window.kofiWidgetOverlay.draw('gpwebsite', {
                    'type': 'floating-chat',
                    'floating-chat.donateButton.text': 'Tip Me',
                    'floating-chat.donateButton.background-color': '#00b9fe',
                    'floating-chat.donateButton.text-color': '#fff',
                });
            }
        };

        // Append the script to the document body
        document.body.appendChild(script);

        // Cleanup to remove the script when the component unmounts
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return null; // This component doesn't render any visible JSX
};

export default KoFiWidget;