import React, { useState, useEffect, useRef } from 'react'
import { Row, Col, Button } from 'react-bootstrap'

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import { useData } from 'contexts/DataContext'
import History from '../History/History'
import CurrentTable from './CurrentTable'
import Today from './Today'
import WindDial from './WindDial'
import Status from '../Status'
import Charts from '../Charts/Charts'
import UpdatingImage from './UpdatingImage'
import KoFiWidget from './KoFiWidget';
import { StatusCollectionProvider, useStatusCollection } from '@/contexts/StatusCollection'
import 'css/home.css';

const Message = () => {
    const { siteMessages } = useStatusCollection()

    useEffect(() => {
        console.log(siteMessages);
    }, [siteMessages]);

    return (
        <Row>
            <Col xs={12} className="message-row">
                {siteMessages && siteMessages[0] != null ? siteMessages[0] : "was null"}
                {siteMessages && siteMessages[1] != null ? <><br /> {siteMessages[1]}</> : null}
            </Col>
        </Row>

    )
}


// *********************************************
const Home = () => {
    const picRef = useRef(null)
    const { passedSeconds, offline, loadData } = useData()

    //display the bootstrap grid size, for development
    const showGridSize: boolean = false

    return (
        <>
            <StatusCollectionProvider>
                <Row>
                    <center>
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
                            >
                                <WindDial
                                    picRef={picRef}
                                    passedSeconds={passedSeconds}
                                />
                            </Col>
                            <Col
                                xs={12}
                                lg={{ span: 7, offset: 0 }}
                                className="homePanel"
                                ref={picRef}
                            >
                                {/* style={{ border: "1px solid black" }} */}
                                <Row>
                                    <Col xs={12} className="container" >
                                        <UpdatingImage />
                                    </Col>
                                </Row>
                            </Col>

                        </Row>
                        {/* <Row>
                    <Col
                        xs={12}
                        style={{ backgroundColor: "lightpink" }}
                    >
                        Hardware failures at the gliderport .... I am working on it. ETA: 6/23</Col>
                </Row> */}
                        <Message />

                        {offline ? <Row>
                            <Col xs={12} className="offline-row">
                                Gliderport is offline</Col></Row> : null}
                        <Row style={{ paddingTop: "30px", backgroundColor: "rgb(255,255,200)" }}>
                            <Col
                                xs={6}
                                lg={{ span: 3, offset: 0 }}
                                className="homePanel"
                            >
                                <Today />
                            </Col>
                            <Col
                                xs={6}
                                className="d-lg-none homePanel"
                            >
                                -
                            </Col>
                            <Col
                                xs={12}
                                lg={{ span: 5, offset: 0 }}
                                className="homePanel"
                            >
                                <CurrentTable fontSize="min(15px, 1.5vw)" />
                            </Col >
                            <Col
                                className="d-xs-none d-lg-block homePanel"
                                lg={{ span: 3, offset: 1 }}
                            >
                                <center>
                                    <p>
                                        {/* Courtesy of Torrey Pines, Rich Parry and Stephen Thilenius, Safe Flying!<br />
                                Comments and suggestions welcome: <a href="/Contact">Contact me</a>
                                <br /> */}
                                        If you enjoy this site, find it useful, and would like me to continue supporting it, please consider leaving me a donation!<br /><br />
                                        <a href='https://ko-fi.com/O5O818HM4U' target='_blank'><img height='36' style={{ border: "0px", height: "36px" }} src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' alt='Buy Me a Coffee at ko-fi.com' /></a>

                                        <KoFiWidget />
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

                            <TabPanel><Charts /></TabPanel>
                            <TabPanel><History /></TabPanel>
                            <TabPanel><Status /></TabPanel>
                        </Tabs>
                    </Row>
                </Row>
            </StatusCollectionProvider>
        </>)
}

export default Home;