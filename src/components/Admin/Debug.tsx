import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { useData } from 'contexts/DataContext';

const Debug: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const { cameraImages } = useData();
    const [currentIndex1, setCurrentIndex1] = useState(0);
    const [currentIndex2, setCurrentIndex2] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex1(prevIndex => (prevIndex + 1) % cameraImages.camera1.length);
            setCurrentIndex2(prevIndex => (prevIndex + 1) % cameraImages.camera2.length);
        }, 300);

        return () => clearInterval(interval);
    }, [cameraImages]);

    return (
        <Card>
            <Card.Header>
                <h5 className="text-center">Cycling Through Last 5 Small Images</h5>
            </Card.Header>
            <Card.Body>
                {loading ? (
                    <div className="text-center">
                        <Spinner animation="border" />
                    </div>
                ) : (
                    <Row>
                        <Col md={6} className="text-center">
                            <h5>Camera 1</h5>
                            {cameraImages.camera1.length > 0 ? (
                                <img
                                    src={`data:image/jpeg;base64,${cameraImages.camera1[currentIndex1]}`}
                                    alt={`Camera 1 - ${currentIndex1}`}
                                    style={{ width: "100%", maxHeight: "150px", marginBottom: "10px" }}
                                />
                            ) : (
                                <p>No images available</p>
                            )}
                        </Col>
                        <Col md={6} className="text-center">
                            <h5>Camera 2</h5>
                            {cameraImages.camera2.length > 0 ? (
                                <img
                                    src={`data:image/jpeg;base64,${cameraImages.camera2[currentIndex2]}`}
                                    alt={`Camera 2 - ${currentIndex2}`}
                                    style={{ width: "100%", maxHeight: "150px", marginBottom: "10px" }}
                                />
                            ) : (
                                <p>No images available</p>
                            )}
                        </Col>
                    </Row>
                )}
            </Card.Body>
        </Card>
    );
};

export default Debug;
