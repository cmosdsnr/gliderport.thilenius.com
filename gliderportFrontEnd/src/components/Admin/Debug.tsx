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
import { Container, Row, Col, Card, Spinner, Table } from 'react-bootstrap';
import { useCamera } from '@/contexts/CameraContext';
import { pb } from '@/contexts/pb';
import HLSPlayer from '../HlsPlayer';

/**
 * Debug component props: none.
 *
 * @returns React.ReactElement rendering camera streams and latest wind data.
 */
export function Debug(): React.ReactElement {
    /** Camera image URLs from the shared {@link CameraContext}. */
    const { cameraImages } = useCamera();

    /** Current image index for camera feed 1 (reserved for future pagination use). */
    const [currentIndex1, setCurrentIndex1] = useState<number>(0);

    /** Current image index for camera feed 2 (reserved for future pagination use). */
    const [currentIndex2, setCurrentIndex2] = useState<number>(0);

    /** The most recent wind record received from PocketBase. `null` while loading. */
    const [latestRecord, setLatestRecord] = useState<any>(null);

    /**
     * Fetches the latest record from the wind collection on mount,
     * then subscribes to real-time creates to update `latestRecord`.
     */
    useEffect(() => {
        const fetchLatestRecord = async () => {

            try {
                const latest = await pb.collection('wind').getList(1, 1, {
                    sort: '-created'
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
        <Container className="py-4">
            <Row className="g-3 mb-4">
                <Col xs={12} lg={6}>
                    <Card className="shadow-sm">
                        <Card.Header className="fw-semibold">Camera 1</Card.Header>
                        <Card.Body className="p-0">
                            <HLSPlayer src={import.meta.env.VITE_SERVER_URL + "/stream/camera1/index.m3u8"} />
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={12} lg={6}>
                    <Card className="shadow-sm">
                        <Card.Header className="fw-semibold">Camera 2</Card.Header>
                        <Card.Body className="p-0">
                            <HLSPlayer src={import.meta.env.VITE_SERVER_URL + "/stream/camera2/index.m3u8"} />
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-3">
                <Col xs={12} lg={6}>
                    <Card className="shadow-sm">
                        <Card.Header>Latest Wind Record</Card.Header>
                        <Card.Body>
                            {latestRecord ? (
                                <Table size="sm" borderless className="mb-0">
                                    <tbody>
                                        <tr>
                                            <td className="text-muted">Speed</td>
                                            <td className="fw-bold">{latestRecord.speed / 10} mph</td>
                                        </tr>
                                        <tr>
                                            <td className="text-muted">Direction</td>
                                            <td className="fw-bold">{latestRecord.direction}°</td>
                                        </tr>
                                        <tr>
                                            <td className="text-muted">Temperature</td>
                                            <td className="fw-bold">{latestRecord.temperature / 10}°F</td>
                                        </tr>
                                        <tr>
                                            <td className="text-muted">Humidity</td>
                                            <td className="fw-bold">{latestRecord.humidity}%</td>
                                        </tr>
                                        <tr>
                                            <td className="text-muted">Pressure</td>
                                            <td className="fw-bold">{latestRecord.pressure + 100325} mBar</td>
                                        </tr>
                                        <tr>
                                            <td className="text-muted">Created</td>
                                            <td className="fw-bold">{new Date(latestRecord.created).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            ) : (
                                <Spinner animation="border" variant="primary" />
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Debug;
