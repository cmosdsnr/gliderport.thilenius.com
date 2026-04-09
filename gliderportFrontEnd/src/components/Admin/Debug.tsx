/**
 * @packageDocumentation Debug
 *
 * Renders live camera streams and displays the most recent wind sensor record.
 * Subscribes to PocketBase wind collection for real-time updates.
 *
 * **Known issues:**
 * - Cleanup unsubscribes from `posts` instead of `wind` subscription, so the wind subscription may remain active.
 */
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { useCamera } from '@/contexts/CameraContext';
import { pb } from '@/contexts/pb';
import HLSPlayer from '../HlsPlayer';

/**
 * Debug component props: none.
 *
 * @returns React.ReactElement rendering camera streams and latest wind data.
 */
export function Debug(): React.ReactElement {
    // Access camera image URLs from shared data context
    const { cameraImages } = useCamera();

    // Current index for each camera feed (not used in this component)
    const [currentIndex1, setCurrentIndex1] = useState<number>(0);
    const [currentIndex2, setCurrentIndex2] = useState<number>(0);

    // Holds the latest wind record fetched from PocketBase
    const [latestRecord, setLatestRecord] = useState<any>(null);

    /**
     * Fetches the latest record from the wind collection on mount,
     * then subscribes to real-time creates to update `latestRecord`.
     */
    useEffect(() => {
        const fetchLatestRecord = async () => {

            try {
                const latest = await pb.collection('wind').getList(1, 1, {
                    sort: '-created'  // or sort: '-timestamp' if you have a custom field
                });
                setLatestRecord(latest.items[0]);
            } catch (error) {
                console.error('Error fetching latest record:', error);
            }
        };
        fetchLatestRecord();
        pb.collection('wind').subscribe('*', (e) => {

            if (e.action === 'create') {
                setLatestRecord(e.record);
            };

        });

        return () => {
            pb.collection('wind').unsubscribe();
        };

    }, []);

    return (
        <Row>
            <div>
                <h1>Camera Stream</h1>
                <HLSPlayer src={import.meta.env.VITE_SERVER_URL + "/stream/camera1/index.m3u8"}
                />
            </div>

            <div>
                <h1>Camera Stream</h1>
                <HLSPlayer src={import.meta.env.VITE_SERVER_URL + "/stream/camera2/index.m3u8"}
                />
            </div>
            <Col>
                <Card>
                    <Card.Header>Latest Wind Record</Card.Header>
                    <Card.Body>
                        <Row>
                            <Col>
                                {latestRecord ? (
                                    <div style={{ fontSize: '1.2em' }}>
                                        <p>Speed: {latestRecord.speed / 10} mph</p>
                                        <p>Direction: {latestRecord.direction}°</p>
                                        <p>Temperature: {latestRecord.temperature / 10}°F</p>
                                        <p>Humidity: {latestRecord.humidity}%</p>
                                        <p>Pressure: {latestRecord.pressure + 100325} mBar</p>
                                        <p>Created: {new Date(latestRecord.created).toLocaleString()}</p>
                                    </div>
                                ) : (
                                    <Spinner animation="border" variant="primary" />
                                )}
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default Debug;
