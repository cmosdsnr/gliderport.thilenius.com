/**
 * @packageDocumentation
 * Equipment page for the Gliderport application.
 * Displays information and manuals for various equipment and systems at the gliderport.
 */
import React, { useState } from 'react'
import { Row, Col } from 'react-bootstrap'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'

import hub from 'images/Equipment/Camera/Hub.jpg'

import Ultimeter2000 from 'images/Equipment/Pi/Ultimeter2000.jpg'
import UM2000ConnectionBox from 'images/Equipment/Pi/UM2000ConnectionBox.jpg'
import RaspberryPi3 from 'images/Equipment/Pi/RaspberryPi3.jpg'
import RaspberryAndESP32 from 'images/Equipment/Pi/RaspberryAndESP32.jpg'
import ESP32Box from 'images/Equipment/Pi/ESP32Box.jpg'

/**
 * Props for the MyPill navigation component.
 */
interface MyPillProps {
    no: number;
    name: string;
    handleClick: (arg: { no: number }) => void;
    page: number;
}

/**
 * Navigation pill component for equipment pages.
 * @param props - MyPillProps
 * @returns {React.ReactElement}
 */
function MyPill({ no, name, handleClick, page }: MyPillProps): React.ReactElement {
    return (
        <center>
            <Nav.Item onClick={() => { handleClick({ no }) }} className={page === no ? "eqNav active" : "eqNav"}>{name}</Nav.Item>
        </center>
    )
}

/**
 * Manuals section for the Equipment page.
 * @returns {React.ReactElement}
 */
function Manuals(): React.ReactElement {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}>
            <ul>
                <h2 style={{ marginTop: "50px" }}> Useful Manuals </h2>
                <li>
                    <a href="/documents/ULTIMETER100Manual.pdf">
                        <h5>ULTIMETER 100 Manual</h5>
                    </a>
                </li>
                <li>
                    <a href="/documents/E861AB_Series_Spec_Sheet_R1.pdf">
                        <h5>Camera E861AB Manual</h5>
                    </a>
                </li>
                <li>
                    <a href="/documents/E861AB_QSG_EN_R2_web.pdf">
                        <h5>Camera E861AB specs</h5>
                    </a>
                </li>
                <li>
                    <a href="/documents/Anemometer GM816.pdf">
                        <h5>Anemometer GM816</h5>
                    </a>
                </li>
                <li style={{ paddingBottom: "20px" }}>
                    <a href="/documents/2278-Yaesu VX-170 Operating Manual.pdf">
                        <h5>Radio, Yaesu VX-170 Operating Manual</h5>
                    </a>
                </li>

                <li>
                    <a href="/documents/ULTIMETER2000Manual.pdf">
                        <h5>ULTIMETER 2000 Manual (old system)</h5>
                    </a>
                </li>
                <li>
                    <a href="/documents/LNB8111_Series_Specs_R4.pdf">
                        <h5>LNB8111 (Old Camera) Specs</h5>
                    </a>
                </li>
                <li>
                    <a href="/documents/LNB8111_QSG_EN_R3_web.pdf">
                        <h5>LNB8111 (Old Camera) Manual</h5>
                    </a>
                </li>
            </ul>
        </Col>
    )
}

/**
 * Camera section for the Equipment page.
 * @returns {React.ReactElement}
 */
function Camera(): React.ReactElement {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}>
            <div>
                <h1>Gliderport Camera Setup</h1>
                <p>The gliderports 2 cameras are a 4K Ultra HD Resolution 8MP Outdoor Metal IP Camera, model E841CAB by Lorex</p>
                <p>The cameras are on a 5ft pole on the roof</p>
                <p>The camera is powered over the ethernet cable, called PoE</p>
                <p>A waterproof box is mounted under the solar panels on the roof which receives power and ethernet.
                    There is a PoE switch inside, and two powered ethernet wires route out to the cameras </p>
            </div>


            <div className="pic picRotate">
                <img alt='' src={hub} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div className="pic picRotate">
                <img alt='' src={Ultimeter2000} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div className="pic picRotate">
                <img alt='' src={UM2000ConnectionBox} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div className="pic picRotate">
                <img alt='' src={RaspberryPi3} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div className="pic picRotate">
                <img alt='' src={RaspberryAndESP32} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div className="pic picRotate">
                <img alt='' src={ESP32Box} className="img-fluid" style={{ height: "100%" }} />
            </div>
        </Col>

    )
}

/**
 * Radio section for the Equipment page.
 * @returns {React.ReactElement}
 */
function Radio(): React.ReactElement {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}>
            <h1>Radio Setup</h1>
            <p>The previous radio set up was designed and installed by Rich Perry. It uses the serial output of the
                weather station and transmits that data over the a radio to a receiver in one of the QUALCOMM buildings,
                which then puts it in a database.</p>
            <p>The website regularly probed that database and copies any new data into its own database.</p>
            <p>It uses a Ultimeter 2000 pictured below:</p>
            <img alt='' src={Ultimeter2000} width="100%" />
            <p></p>
            <p></p>
            <a href="/documents/ULTIMETER2000Manual.pdf">Ultimeter 2000 Manual</a>
            <p></p>
            <p></p>
            <p>There is more to come on this</p>
        </Col>
    )
}

/**
 * Netatmo section for the Equipment page.
 * @returns {React.ReactElement}
 */
function Netatmo(): React.ReactElement {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}><h1>Netatmo Setup</h1></Col>
    )
}

/**
 * Surfline section for the Equipment page.
 * @returns {React.ReactElement}
 */
function Surfline(): React.ReactElement {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}>
            <h1>Surfline</h1>
            <p>There is a new high-quality expensive wind system and high resolution video system installed by
                surfline.com. We are supposed to have access to the data, and I am working on gaining this access. This
                should prove the most reliable source of data.</p>
            <p>More to come on this.</p>
        </Col>
    )
}

/**
 * Internet section for the Equipment page.
 * @returns {React.ReactElement}
 */
function Internet(): React.ReactElement {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}><h1>Gliderport Software</h1></Col>
    )
}

/**
 * Esp32 section for the Equipment page.
 * @returns {React.ReactElement}
 */
function Esp32(): React.ReactElement {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}>
            <h1>ESP32 setup</h1>
            <p>Since the glider port now has Internet, it is unnecessary to deal with all the problems of radio
                transmission and the problems that come with. The box I have designed listens in on the data from
                anemometer and directional indicator and transmits it directly to a database on the website.</p>
            <p>Note that powers required for Internet and therefore this method will not continue to function during a
                power outage the way that the radio system does.</p>
            <p>There will be more to come</p>
        </Col>
    )
}

/**
 * Raspberry section for the Equipment page.
 * @returns {React.ReactElement}
 */
function Raspberry(): React.ReactElement {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}>Raspberry</Col>
    )
}

/**
 * Main Equipment component for the Equipment page.
 * @returns {React.ReactElement} The Equipment page JSX.
 */
export function Equipment(): React.ReactElement {
    const [page, setPage] = useState<number>(0)

    return (<Row>
        <Col xs={12} md={3}>
            <Navbar
                expand="md"
                id="cvNavContainer"
                className='navbar-light'
            >
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav defaultActiveKey="/cv" className="flex-column" style={{ width: "100%" }}>
                        <MyPill no={0} page={page} handleClick={() => { setPage(0) }} name="Manuals" />
                        <MyPill no={1} page={page} handleClick={() => { setPage(1) }} name="Camera" />
                        <MyPill no={2} page={page} handleClick={() => { setPage(2) }} name="Radio" />
                        <MyPill no={3} page={page} handleClick={() => { setPage(3) }} name="Netatmo" />
                        <MyPill no={4} page={page} handleClick={() => { setPage(4) }} name="Surfline" />
                        <MyPill no={5} page={page} handleClick={() => { setPage(5) }} name="Internet" />
                        <MyPill no={6} page={page} handleClick={() => { setPage(6) }} name="Esp32" />
                        <MyPill no={7} page={page} handleClick={() => { setPage(7) }} name="Raspberry" />
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </Col>

        <Col xs={12} md={{ span: 8, offset: 1 }}>
            {page === 0 ? <Manuals /> :
                page === 1 ? <Camera /> :
                    page === 2 ? <Radio /> :
                        page === 3 ? <Netatmo /> :
                            page === 4 ? <Surfline /> :
                                page === 5 ? <Internet /> :
                                    page === 6 ? <Esp32 /> : <Raspberry />

            }
        </Col>
    </Row>
    )
}

export default Equipment;