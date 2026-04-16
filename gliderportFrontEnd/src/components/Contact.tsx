/**
 * @packageDocumentation
 * Contact page for the Gliderport application.
 * Displays contact information and a description of the site.
 */
import React, { useState } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import { AndroidBetaModal } from './AndroidBetaModal';
import 'css/contact.css';

/**
 * Contact component displays contact information and a description of the site.
 * @returns {React.ReactElement} The rendered contact page.
 */
export function Contact(): React.ReactElement {
    const [showBeta, setShowBeta] = useState(false);

    return (
        <Container className="py-4">
            <AndroidBetaModal show={showBeta} onHide={() => setShowBeta(false)} />
            <Card className="shadow-sm mx-auto" style={{ maxWidth: '800px' }}>
                <Card.Body>
                    <p>
                        Hi! My name is <a href="http://www.thilenius.com">Stephen Thilenius</a>.
                        I am a pilot that loves to fly at Torrey Pines. Many years ago, another
                        pilot, Rich Perry set up a weather station at the gliderport to
                        avoid many hours of Para-waiting and
                        Para-returning-home-empty-handed! This site is the evolution from
                        those beginnings.
                    </p>
                    <p>
                        To be clear, I am not directly associated with the Torrey Pines
                        gliderport, nor am I a weather man nor do I predict the wind. I
                        simply collect and present the wind data and gliderport images.
                        I implement and maintain the hardware and collected data.
                    </p>
                    <p>
                        <strong>I CAN NOT help you with:</strong>
                    </p>
                    <ul className="contact-list">
                        <li>Where the wind will be in the future</li>
                        <li>When is a good time to fly</li>
                        <li>
                            What the folks at the gliderport are doing or whether they are
                            open
                        </li>
                        <li>
                            <a href="https://www.flytorrey.com/" className="contact-link">
                                {" "}
                                Torrey Pines Gliderport Site{" "}
                            </a>
                            for help with those issues
                        </li>
                    </ul>
                    <p>
                        <strong>I CAN help you with:</strong>
                    </p>
                    <ul>
                        <li>Errors in data</li>
                        <li>Data not updating or appearing</li>
                        <li>Images not updating</li>
                        <li>Web pages not behaving properly</li>
                        <li>
                            Any suggestions are very welcome! (data formats, page layouts,
                            new features)
                        </li>
                    </ul>
                    <p>Thanks for your support, and enjoy!</p>

                    <Row className="text-center mt-3 pt-3 border-top">
                        <Col xs={12} sm={6}>
                            Email me at:{" "}
                            <a href="mailto:Stephen@Thilenius.com">Stephen@Thilenius.com</a>
                        </Col>
                        <Col xs={12} sm={6}>
                            Call or Text me: (530) 613-5388
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="shadow-sm mx-auto mt-4" style={{ maxWidth: '800px' }}>
                <Card.Header className="fw-semibold fs-5">Useful Links</Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item>
                        {/* TODO: replace href with your Play Store listing URL */}
                        <a href="https://play.google.com/store/apps" target="_blank" rel="noopener noreferrer">
                            <img
                                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                                alt="Get it on Google Play"
                                height={48}
                                style={{ marginLeft: '-8px', verticalAlign: 'middle' }}
                            />
                        </a>
                        {' '}Android app — live wind, camera feed, text alert settings
                        <div>
                            <a
                                href="#"
                                style={{ fontSize: '0.8rem' }}
                                onClick={(e) => { e.preventDefault(); setShowBeta(true); }}
                            >
                                Temporary Android install link
                            </a>
                        </div>
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <a href="https://www.windy.com/32.892/-117.240?100m,32.883,-117.240,14,m:ezYacTK" target="_blank" rel="noopener noreferrer">
                            Wind Predictions (location = Torrey Pines)
                        </a>
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <a href="http://findu.com/cgi-bin/wx.cgi?call=W9IF-4&last=4" target="_blank" rel="noopener noreferrer">
                            Analog gliderport system Weather
                        </a>
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <a href="https://www.tidesandcurrents.noaa.gov/stationhome.html?id=9410230" target="_blank" rel="noopener noreferrer">
                            NOAA Scripps Pier Weather
                        </a>
                    </ListGroup.Item>
                </ListGroup>
            </Card>
        </Container>
    );
};

export default Contact;
