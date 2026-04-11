/**
 * @packageDocumentation
 * Contribute page for the Gliderport application.
 * Displays a message about contributions and lists donors who have supported the project.
 * Fetches donor data from the server on mount and displays it.
 */
import React, { useEffect } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import { API } from '@/api';

type Donor = string[];

/**
 * Contribute component displays a message about contributions
 * and lists donors who have supported the project.
 *
 * It fetches donor data from the server on mount and displays it.
 *
 * @returns {React.ReactElement} The rendered component.
 */
export function Contribute(): React.ReactElement {
    const [donors, setDonors] = React.useState<Donor>([]);

    useEffect(() => {
        fetch(API.getDonors()).then((res) => res.json())
            .then((data) => setDonors(data));
    }, []);

    return (
        <Container className="py-4" style={{ maxWidth: '800px' }}>
            <Card className="shadow-sm mb-4">
                <Card.Body>
                    <p>
                        I have been very pleased to see this site grow in use over the
                        years, and have enjoyed programming and changing it. I very much
                        appreciate any feedback, ideas for improvement, and especially if
                        people let me know when the camera stops working or other issues
                        occur. I don't necessarily look at my own site every day so don't
                        always notice when things break.
                    </p>

                    <p>
                        If you'd like to make a donation to keep this site up and running,
                        please feel free! (who doesn't like support?!){" "}
                        <a href="https://paypal.me/TuitionPlayment" target="_blank" rel="noreferrer">
                            Paypal
                        </a>{" "}or{" "}<a href="https://venmo.com/Stephen-Thilenius" target="_blank" rel="noreferrer">Venmo</a> me @Stephen-Thilenius
                    </p>

                    <p>
                        When you see these folks at the gliderport thank them for their
                        support!! (Also in case you don't want your name on this list let me
                        know){" "}
                    </p>
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Header className="fw-semibold">Supporters</Card.Header>
                <Card.Body>
                    <Row>
                        {donors.map((donor, i) => (
                            <Col key={i} sm={6} md={4} lg={3}>
                                {donor}
                            </Col>
                        ))}
                    </Row>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default Contribute;
