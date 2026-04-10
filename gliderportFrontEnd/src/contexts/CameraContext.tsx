/**
 * @packageDocumentation
 * CameraContext — owns the rolling 5-frame camera image buffers for both cameras.
 * Fetches the initial images via REST on mount, then updates the buffer with each
 * new image pushed by the WebSocket server via the `newImage` command.
 * Manages blob URL lifecycle (revokes dropped frames to prevent memory leaks).
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';
import { API } from '@/api';
import { formatter, b64toBlob } from 'components/Globals';

export interface CameraImage {
    url: string;
    date: number;
    dateString: string;
}

export interface CameraImages {
    camera1: CameraImage[];
    camera2: CameraImage[];
}

interface CameraContextInterface {
    cameraImages: CameraImages;
}

const CameraContext = createContext<CameraContextInterface>({} as CameraContextInterface);

export function useCamera(): CameraContextInterface {
    return useContext(CameraContext);
}

const decodeImage = (d: { image: string; date: number }): CameraImage => {
    const blob = b64toBlob(d.image, 'image/jpeg');
    return {
        url: blob ? URL.createObjectURL(blob) : '',
        date: d.date,
        dateString: formatter.format(new Date(d.date)),
    };
};

export function CameraProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const [cameraImages, setCameraImages] = useState<CameraImages>({ camera1: [], camera2: [] });
    const { lastMessage } = useWebSocket();

    // Initial image fetch on mount
    useEffect(() => {
        fetch(API.getLastFiveSmallImages())
            .then(res => res.json())
            .then(data => {
                setCameraImages({
                    camera1: data.camera1.map(decodeImage),
                    camera2: data.camera2.map(decodeImage),
                });
            })
            .catch(err => console.error('Error fetching camera images:', err));
    }, []);

    // Append new frames pushed by the server
    useEffect(() => {
        if (!lastMessage || lastMessage.command !== 'newImage') return;
        const { camera, image, date } = lastMessage.imageInfo!;

        setCameraImages(prev => {
            const blob = b64toBlob(image, 'image/jpeg');
            const url = blob ? URL.createObjectURL(blob) : '';
            const newEntry: CameraImage = { url, date, dateString: formatter.format(new Date(date)) };

            const cam1 = [...prev.camera1];
            const cam2 = [...prev.camera2];
            const target = camera === 1 ? cam1 : cam2;

            if (target.length === 5) {
                const dropped = target.shift();
                if (dropped?.url) URL.revokeObjectURL(dropped.url);
            }
            target.push(newEntry);

            return { camera1: cam1, camera2: cam2 };
        });
    }, [lastMessage]);

    return (
        <CameraContext.Provider value={{ cameraImages }}>
            {children}
        </CameraContext.Provider>
    );
}
