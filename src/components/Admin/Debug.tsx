import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { useData } from 'contexts/DataContext';
import { pb } from '@/contexts/pb'
import HLSPlayer from '../HlsPlayer';


const Debug: React.FC = () => {
    const { cameraImages } = useData();
    const [currentIndex1, setCurrentIndex1] = useState(0);
    const [currentIndex2, setCurrentIndex2] = useState(0);

    // get latest record from wind collection
    const [latestRecord, setLatestRecord] = useState<any>(null);

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
            pb.collection('posts').unsubscribe();
        };

    }, []);

    return (
        <Row>
            <div>
                <h1>Camera Stream</h1>
                <HLSPlayer src="http://gpupdate.thilenius.com/images/stream/camera1/index.m3u8"
                />
            </div>

            <div>
                <h1>Camera Stream</h1>
                <HLSPlayer src="http://gpupdate.thilenius.com/images/stream/camera2/index.m3u8"
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
