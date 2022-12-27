import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";


export default function Contact() {

    return (
        <Container fluid>
            <div className="selectionBox">
                <Row>
                    <Col
                        xs={12}
                        lg={{ span: 8, offset: 2 }}
                        xl={{ span: 6, offset: 3 }}
                    >
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
                            <b>I CAN NOT help you with:</b>
                        </p>
                        <ul>
                            <li>Where the wind will be in the future</li>
                            <li>When is a good time to fly</li>
                            <li>
                                What the folks at the gliderport are doing or whether they are
                                open
                            </li>
                            <li>
                                Please go to
                                <a href="https://www.flytorrey.com/">
                                    {" "}
                                    Torrey Pines Gliderport Site{" "}
                                </a>
                                for help with those issues
                            </li>
                        </ul>
                        <p>
                            <b>I CAN help you with:</b>
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
                    </Col>

                    <Col xs={{ span: 5, offset: 1 }} lg={{ span: 3, offset: 3 }}>
                        Email me at: <br />
                        <a href="mailto:Stephen@Thilenius.com">Stephen@Thilenius.com</a>
                    </Col>
                    <Col xs={{ span: 5, offset: 1 }} lg={{ span: 3, offset: 3 }}>
                        Call or Text me:
                        <br />
                        (530) 613-5388
                    </Col>
                </Row>
            </div>
        </Container>
    )
}

