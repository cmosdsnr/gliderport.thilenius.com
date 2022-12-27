import React, { useState } from 'react'
import { Row, Col } from "react-bootstrap"
import Nav from "react-bootstrap/Nav"
import Navbar from "react-bootstrap/Navbar"

import hub from "../images/Equipment/Camera/Hub.jpg?as=jpg&width=400"
import shelf1 from "../images/Equipment/Camera/shelf1.jpg?as=jpg&width=400"
import shelf2 from "../images/Equipment/Camera/shelf2.jpg?as=jpg&width=400"
import adapter from "../images/Equipment/Camera/POEadapter.jpg?as=jpg&width=400"

import Ultimeter2000 from "../images/Equipment/Pi/Ultimeter2000.jpg?as=jpg&width=400"
import UM2000ConnectionBox from "../images/Equipment/Pi/UM2000ConnectionBox.jpg?as=jpg&width=400"
import RaspberryPi3 from "../images/Equipment/Pi/RaspberryPi3.jpg?as=jpg&width=400"
import RaspberryAndESP32 from "../images/Equipment/Pi/RaspberryAndESP32.jpg?as=jpg&width=400"
import ESP32Box from "../images/Equipment/Pi/ESP32Box.jpg?as=jpg&width=400"

const MyPill = (props) => {
    const { no, name, handleClick, page } = props
    return (
        <center>
            <Nav.Item onClick={() => { handleClick({ no }) }} className={page === no ? "eqNav active" : "eqNav"}>{name}</Nav.Item>
        </center>
    )
}

export default function Equipment() {

    const [page, setPage] = useState(0)

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

const Manuals = (props) => {
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
                    <a href="/documents/Anamometer GM816.pdf">
                        <h5>Anamometer GM816</h5>
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


const Camera = (props) => {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}>
            <div>
                <h1>Gliderport Camera Setup</h1>
                <p>The gliderport camera is a 4K Ultra HD Resolution 8MP Outdoor Metal IP Camera, model LNB8111BW</p>
                <p>The camera sits atop the highest pole at the gliderport. The pole can be lowered by removing the top of
                    the two ground level bolts holding the pole in place. After the top bolt is removed, the pole can swing
                    down.</p>
                <p>The camera is powered over the ethernet cable, called PoE</p>
                <p>The camera cable routes down and into the kitchen, where it plugs into a PoE power adapter plugged into
                    the outlet. This device adds power to the ethernet cable:</p>
            </div>
            <div className="pic picRotate">
                <img alt='' src={adapter} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div>
                <p>The other cable in the PoE Power adapter goes to the switch (white box with lights sitting at the front
                    of the shelf). The left power led should be on as well as 2 of the numbered lights. It doesn't matter
                    which two, it's the two ports in back that the cables are plugged into:</p>
            </div>
            <div className="pic picRotate">
                <img alt='' src={hub} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div className="pic picRotate">
                <img alt='' src={shelf1} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div className="pic picRotate">
                <img alt='' src={shelf2} className="img-fluid" style={{ height: "100%" }} />
            </div>
            <div>
                <p>The other cable in the PoE Power adapter goes to the switch (white box with lights sitting at the front
                    of the shelf):</p>
                <p>The Hub has a second cable that routes along the ceiling to the office and plugs into a switch there</p>
                <p>The camera's internal IP is 192.168.88.48 </p>
                <p>The camera's (i.e. the gliderports) external IP is 104.36.31.118 however this is not always working. Port
                    80 was forwarded with some effort and assistance to the local IP.</p>
                <p>Camera username and password are known by me & staff</p>
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


const Radio = (props) => {
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

const Netatmo = (props) => {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}><h1>Netatmo Setup</h1></Col>
    )
}

const Surfline = (props) => {
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
const Internet = (props) => {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}><h1>Gliderport Software</h1></Col>
    )
}

const Esp32 = (props) => {
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

const Raspberry = (props) => {
    return (
        <Col xs={12} md={9} lg={{ span: 8, offset: 1 }}>Raspberry</Col>
    )
}