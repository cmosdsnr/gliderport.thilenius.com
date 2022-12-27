import React, { useState, useEffect, useRef } from "react"
import { Row, Col } from "react-bootstrap"
import _ from "lodash"
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import { useData } from '../../contexts/DataContext'
import History from "../History/History"
import CurrentTable from "./CurrentTable"
import Today from "./Today"
import WindDial from "./WindDial"
import Status from "../Status"
import Plots from "../Plots"
import UpdatingImage from "./UpdatingImage"
import { phpLoc } from "../Globals"

// *********************************************
export const Home = () => {


    const [loading, setLoading] = useState(true)
    const wdRef = useRef(null)
    const picRef = useRef(null)

    const {
        chart,
        passedSeconds,
        itIsDark,
        offline,
        lastImage,
    } = useData()




    //display the bootstrap grid size, for development
    const showGridSize = false



    // Reload the page after we detect sleep wake up
    // var lastTime = (new Date()).getTime();
    // useInterval(() => {
    //     var currentTime = (new Date()).getTime();
    //     if (currentTime > (lastTime + 30000 + 5000)) {  // ignore small delays
    //         // Probably just woke up!
    //         console.log("reload page after sleep")
    //         window.location.reload(false);
    //     }
    //     lastTime = currentTime;
    // }, 30000)


    const style = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    }

    return (
        <>
            <Row style={{}}>
                <center>
                    {/* <h2>Home</h2> */}
                    {showGridSize ?
                        <Row>
                            <Col xs={12} className="d-sm-none">Extra Small</Col>
                            <Col sm={12} className="d-none d-sm-block d-md-none">Small</Col>
                            <Col md={12} className="d-none d-md-block d-lg-none">Medium</Col>
                            <Col md={12} className="d-none d-lg-block d-xl-none">Large</Col>
                            <Col md={12} className="d-none d-xl-block">Extra Large</Col>
                        </Row>
                        : null
                    }
                    <Row style={{ paddingTop: '20px', backgroundColor: "rgb(200,220,255)" }}>
                        <Col
                            xs={12}
                            lg={{ span: 5, offset: 0 }}
                            xl={{ span: 4, offset: 0 }}
                            ref={wdRef}
                        >
                            <WindDial
                                picRef={picRef}
                                passedSeconds={passedSeconds}
                                data={chart} />
                        </Col>
                        <Col
                            xs={12}
                            lg={{ span: 7, offset: 0 }}
                            style={style}
                            ref={picRef}
                        >
                            {/* style={{ border: "1px solid black" }} */}
                            <Row>
                                <Col xs={12} className="container" >
                                    <UpdatingImage itIsDark={itIsDark} offline={offline} imageWasUpdated={lastImage} />
                                    {offline ?
                                        <svg height="35" width="350" transform="translate(0,0) rotate(-35 -0 -0)" className="top-left">
                                            <text x="0" y="30" fill="red" >Internet offline</text>
                                            Sorry, your browser does not support inline SVG.
                                        </svg>
                                        : null
                                    }
                                    {itIsDark ? <span className="bottom-left">{timeToSunrise}</span> : null}
                                    {/* <p className="ooo">Some Equipment was removed<br />Waiting for staff to return it...</p> */}
                                    {/* <p className="ooo" >Temporarily Out of Order</p> */}
                                    <p>Live Image every 45 Seconds, click to expand and zoom</p>
                                </Col>
                            </Row>
                        </Col>

                    </Row>
                    {offline ? <Row>
                        <Col
                            xs={12}
                            style={{ backgroundColor: "lightpink" }}
                        >
                            Gliderport is offline</Col></Row> : null}
                    <Row style={{ paddingTop: "30px", backgroundColor: "rgb(255,255,200)" }}>
                        <Col
                            xs={6}
                            lg={{ span: 3, offset: 0 }}
                            style={style}
                        >
                            <Today />
                        </Col>
                        <Col
                            xs={6}
                            className="d-lg-none"
                            style={style}
                        >
                            -
                        </Col>
                        <Col
                            xs={12}
                            lg={{ span: 5, offset: 0 }}
                            style={style}
                        >
                            <CurrentTable fontSize="min(15px, 1.5vw)" />
                        </Col>
                        <Col
                            className="d-xs-none d-lg-block"
                            lg={{ span: 4, offset: 0 }}
                            style={style}
                        >
                            <center>
                                <p>
                                    <a style={{ fontSize: "20px" }} href="https://www.youtube.com/user/cmosdsnr2/videos" rel="noreferrer" target="_blank">
                                        1080p Video on my YouTube channel (disconnects frequently)
                                    </a><br />

                                    Courtesy of Torrey Pines, Rich Parry and Stephen Thilenius, Safe Flying!<br />
                                    Comments and suggestions welcome: <a href="/Contact">Contact me</a>
                                </p>
                            </center>
                        </Col>
                    </Row>

                </center>
                <Row style={{ backgroundColor: "rgb(240,255,255)" }}>
                    <Tabs defaultIndex={0} selectedTabClassName="react-tabs__tab--selected selected-tab">
                        <TabList>
                            <Tab className="react-tabs__tab tab">Charts</Tab>
                            <Tab className="react-tabs__tab tab">History & Forecast</Tab>
                            <Tab className="react-tabs__tab tab">Gliderport Status</Tab>
                        </TabList>

                        <TabPanel><Plots /></TabPanel>
                        <TabPanel><History /></TabPanel>
                        <TabPanel><Status /></TabPanel>
                    </Tabs>
                </Row>
            </Row>

        </>
    )
}

