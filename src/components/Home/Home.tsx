/**
 * 
 * @packageDocumentation
 *   Main landing page for the Gliderport site. Displays current conditions,
 *   wind dial, live image/video feed, site messages, sunrise/sunset info,
 *   a history forecast view, and additional charts/status panels in tabs.
 *   Utilizes React Bootstrap grid, React Tabs for navigation, and several
 *   custom context hooks for data and status.
 */

import React, { useRef, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import { useWebSocket } from '@/contexts/WebSocketContext';
import { useSocialData } from '@/contexts/SocialDataContext';
import History from '../History/History';
import CurrentTable from './CurrentTable';
import Today from './Today';
import WindDial from './WindDial';
import Status from '../Status';
import Charts from '../Charts/Charts';
import UpdatingVideo from './UpdatingVideo';
import KoFiWidget from './KoFiWidget';
import { useStatusCollection } from '@/contexts/StatusCollection';
import 'css/home.css';
import { useWindow } from 'hooks/useWindow';
import { text } from 'd3';


/*   
* Message
   *
* @packageDocumentation
   * Displays up to two site - wide messages fetched from status collection.
* Logs messages to the console whenever they change.
*
* @component
   * @returns { JSX.Element }
*/
const Message: React.FC = () => {
    const { siteMessages } = useStatusCollection();

    useEffect(() => {
        console.log('Site messages updated:', siteMessages);
    }, [siteMessages]);

    return (
        <Row>
            <Col xs={12} className="message-row">
                {siteMessages?.[0] ?? 'No message'}
                {siteMessages?.[1] != null && (
                    <>
                        <br /> {siteMessages[1]}
                    </>
                )}
            </Col>
        </Row>
    );
};

/**
 * Home
 *
 * Renders the main page layout:
 *  - WindDial and live video feed
 *  - CurrentTable showing most recent readings
 *  - Sunrise/sunset and Today panel
 *  - Donation call-to-action and Ko-fi widget
 *  - Tabs for Charts, History & Forecast, and Status
 *
 * @returns {React.ReactElement}
 */
export function Home(): React.ReactElement {
    // Reference for sizing the WindDial container
    const picRef = useRef<HTMLDivElement>(null);
    const width = useWindow();

    // Data context: seconds since last reading, offline status, and loader
    const { passedSeconds } = useWebSocket();
    const { offline, loadData } = useSocialData();

    // Development toggle to display current grid size
    const showGridSize: boolean = false;

    return (
        <>
            {/* Grid size debug */}
            {showGridSize && (
                <Row style={{ textAlign: 'center' }}>
                    <Col xs={12} className="d-sm-none">Extra Small ({width}px)</Col>
                    <Col sm={12} className="d-none d-sm-block d-md-none">Small ({width}px)</Col>
                    <Col md={12} className="d-none d-md-block d-lg-none">Medium ({width}px)</Col>
                    <Col md={12} className="d-none d-lg-block d-xl-none">Large ({width}px)</Col>
                    <Col md={12} className="d-none d-xl-block">Extra Large ({width}px)</Col>
                </Row>
            )}

            {/* Wind dial and live feed */}
            <Row style={{ paddingTop: '20px', backgroundColor: 'rgb(200,220,255)' }}>
                <Col xs={12} lg={{ span: 5 }} xl={{ span: 4 }}>
                    <WindDial picRef={picRef} passedSeconds={passedSeconds} />
                </Col>
                <Col xs={12} lg={{ span: 7 }} className="homePanel" ref={picRef}>
                    <Row>
                        <Col xs={12} className="container">
                            <UpdatingVideo />
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* Site messages */}
            <Message />

            {/* Offline banner */}
            {offline && (
                <Row>
                    <Col xs={12} className="offline-row">
                        Gliderport is offline
                    </Col>
                </Row>
            )}

            {/* Today, CurrentTable, and donate section */}
            <Row style={{ paddingTop: '30px', backgroundColor: 'rgb(255,255,200)' }}>
                <Col xs={6} lg={{ span: 3 }} className="homePanel">
                    <Today />
                </Col>
                <Col xs={6} className="d-lg-none homePanel">–</Col>
                <Col xs={12} lg={{ span: 5 }} className="homePanel">
                    <CurrentTable fontSize="min(15px, 1.5vw)" />
                </Col>
                <Col lg={{ span: 3, offset: 1 }} className="d-none d-lg-block homePanel">
                    <center>
                        <p>
                            If you enjoy this site … please consider leaving a donation!<br /><br />
                            <a href="https://ko-fi.com/O5O818HM4U" target="_blank" rel="noopener noreferrer">
                                <img
                                    src="https://storage.ko-fi.com/cdn/kofi2.png?v=6"
                                    alt="Buy Me a Coffee at ko-fi.com"
                                    height={36}
                                    style={{ border: 0 }}
                                />
                            </a>
                            <KoFiWidget />
                        </p>
                    </center>
                </Col>
            </Row>

            {/* Tabs for Charts, History & Forecast, Status */}
            <Row style={{ backgroundColor: 'rgb(240,255,255)' }}>
                <Tabs defaultIndex={0} selectedTabClassName="selected-tab">
                    <TabList>
                        <Tab>Charts</Tab>
                        <Tab>History & Forecast</Tab>
                        <Tab>Gliderport Status</Tab>
                    </TabList>
                    <TabPanel><Charts /></TabPanel>
                    <TabPanel><History /></TabPanel>
                    <TabPanel><Status /></TabPanel>
                </Tabs>
            </Row>
        </>
    );
};

export default Home;
