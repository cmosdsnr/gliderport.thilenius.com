/**
 * ## ListEndpoints Component
 *
 * Fetches and displays a list of API endpoints grouped by HTTP method.
 * GET, POST, and other request types are shown in separate tables.
 * Data is retrieved from the `/api/listEndpoints` endpoint on mount.
 *
 * @component
 */
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Table } from 'react-bootstrap';

/**
 * Represents a single API endpoint.
 *
 * method - The HTTP method (e.g. "GET", "POST").
 * path   - The URL path of the endpoint.
 */
interface Endpoint {
    method: string;
    path: string;
}

/**
 * Displays the application's available API endpoints.
 *
 * - Retrieves endpoint data from `/api/listEndpoints`.
 * - Separates endpoints into GET, POST, and Other categories.
 * - Renders each category in a Bootstrap Card with Tables.
 *
 * @returns {React.JSX.Element}
 */
export function ListEndpoints(): React.ReactElement {
    // State to hold the fetched endpoints
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);

    /**
     * Fetches endpoints once on component mount.
     */
    useEffect(() => {
        const url = new URL('/api/listEndpoints', import.meta.env.VITE_SERVER_URL.toString());
        fetch(url.toString())
            .then(res => res.json())
            .then((data: Endpoint[]) => setEndpoints(data))
            .catch(err => console.error('Failed to fetch /api/listEndpoints:', err));
    }, []);

    // Group by HTTP method
    const getEndpoints = endpoints.filter(ep => ep.method === 'GET');
    const postEndpoints = endpoints.filter(ep => ep.method === 'POST');
    const otherEndpoints = endpoints.filter(
        ep => ep.method !== 'GET' && ep.method !== 'POST'
    );

    return (
        <Card>
            <Card.Header>
                <h5 className="mb-0 text-center">gliderport.thilenius.com Endpoints</h5>
            </Card.Header>
            <Card.Body>
                <Row>
                    <Col md={6}>
                        <h5 className="text-center">GET Requests</h5>
                        <Table striped bordered hover>
                            <tbody>
                                {getEndpoints.map((endpoint, idx) => (
                                    <tr key={`${endpoint.method}-${endpoint.path}-${idx}`}>  {/* stable key */}
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
                                {postEndpoints.map((endpoint, idx) => (
                                    <tr key={`${endpoint.method}-${endpoint.path}-${idx}`}>  {/* stable key */}
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
                                    {otherEndpoints.map((endpoint, idx) => (
                                        <tr key={`${endpoint.method}-${endpoint.path}-${idx}`}>  {/* stable key */}
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
export default ListEndpoints;