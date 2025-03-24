import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table } from 'react-bootstrap';

interface Endpoint {
    method: string;
    path: string;
}

export default function ListEndpoints() {
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

    useEffect(() => {
        fetch(import.meta.env.VITE_UPDATE_SERVER_URL + "/listEndpoints")
            .then((res) => res.json())
            .then((data) => setEndpoints(data));
    }, []);

    const getEndpoints = endpoints.filter((endpoint) => endpoint.method === "GET");
    const postEndpoints = endpoints.filter((endpoint) => endpoint.method === "POST");
    const otherEndpoints = endpoints.filter(
        (endpoint) => endpoint.method !== "GET" && endpoint.method !== "POST"
    );

    return (
        <Card>
            <Card.Header>
                <h5 className="mb-0 text-center">gpupdate.thilenius.com Endpoints</h5>
            </Card.Header>
            <Card.Body>
                <Row>
                    <Col md={6}>
                        <h5 className="text-center">GET Requests</h5>
                        <Table striped bordered hover>
                            <tbody>
                                {getEndpoints.map((endpoint, index) => (
                                    <tr key={index}>
                                        <td>{endpoint.path}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Col>
                    <Col md={6}>
                        <h5 className="text-center">POST Requests</h5>
                        <Table striped bordered hover>
                            <tbody>
                                {postEndpoints.map((endpoint, index) => (
                                    <tr key={index}>
                                        <td>{endpoint.path}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Col>
                </Row>
                {otherEndpoints.length > 0 && (
                    <Row className="mt-4">
                        <Col>
                            <h5 className="text-center">Other Requests</h5>
                            <Table striped bordered hover>
                                <tbody>
                                    {otherEndpoints.map((endpoint, index) => (
                                        <tr key={index}>
                                            <td>{endpoint.method}</td>
                                            <td>{endpoint.path}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Col>
                    </Row>
                )}
            </Card.Body>
        </Card>
    );
}