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
import { useSensorData } from '@/contexts/SensorDataContext';
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
    const { dataLoaded, noData } = useSensorData();

    useEffect(() => {
        console.log('Site messages updated:', siteMessages);
    }, [siteMessages]);

    const hasContent = siteMessages?.[0] != null || siteMessages?.[1] != null || (dataLoaded && noData);
    if (!hasContent) return null;

    return (
        <Row>
            <Col xs={12} className="message-row">
                {siteMessages?.[0]}
                {siteMessages?.[1] != null && (
                    <>
                        <br /> {siteMessages[1]}
                    </>
                )}
                {dataLoaded && noData && (
                    <div style={{ color: '#f44336', fontWeight: 600, marginTop: 4 }}>
                        ⚠ No sensor data received — the data collection system may be offline.
                    </div>
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
    const showGridSize: boolean = true;

    return (
        <>
            {/* Fixed bottom grid-size banner */}
            {showGridSize && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
                    backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff',
                    fontSize: 11, textAlign: 'center', padding: '2px 0',
                    pointerEvents: 'none',
                }}>
                    <span className="d-sm-none">XS {width}px</span>
                    <span className="d-none d-sm-block d-md-none">SM {width}px</span>
                    <span className="d-none d-md-block d-lg-none">MD {width}px</span>
                    <span className="d-none d-lg-block d-xl-none">LG {width}px</span>
                    <span className="d-none d-xl-block">XL {width}px</span>
                </div>
            )}

            {/* Wind dial and live feed */}
            <Row className="home-wind-row">
                <Col xs={12} lg={{ span: 5 }} xl={{ span: 4 }}>
                    <WindDial picRef={picRef} passedSeconds={passedSeconds} />
                </Col>
                <Col xs={12} lg={{ span: 7 }} className="homePanel home-video-col" ref={picRef}>
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
            <Row className="home-data-row">
                <Col xs={12} lg={{ span: 3 }} className="homePanel">
                    <Today />
                </Col>
                <Col xs={12} lg={{ span: 5 }} className="homePanel">
                    <CurrentTable />
                </Col>
                <Col xs={12} lg={{ span: 3, offset: 1 }} className="homePanel">
                    <div className="text-center">
                        <div className="my-2">
                            If you enjoy this site … please consider leaving a donation!
                        </div>
                        <a href="https://ko-fi.com/O5O818HM4U" target="_blank" rel="noopener noreferrer">
                            <img
                                src="https://storage.ko-fi.com/cdn/kofi2.png?v=6"
                                alt="Buy Me a Coffee at ko-fi.com"
                                height={36}
                                style={{ border: 0 }}
                            />
                        </a>
                        <KoFiWidget />
                        <div className="mt-3">
                            <div className="mb-1" style={{ fontSize: '0.85rem' }}>
                                Get the Android app!
                            </div>
                            {/* TODO: replace href with your Play Store listing URL */}
                            <a href="https://play.google.com/store/apps" target="_blank" rel="noopener noreferrer">
                                <img
                                    src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                                    alt="Get it on Google Play"
                                    height={48}
                                    style={{ marginLeft: '-8px' }}
                                />
                            </a>
                            <div>
                                <a
                                    href="https://expo.dev/accounts/cmosdsnr/projects/gliderport-app/builds/c0babe7d-2cac-434e-b0d2-e2f32f64401c"
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    Temporary Android install link
                                </a>
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Tabs for Charts, History & Forecast, Status */}
            <Row className="home-tabs-row">
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
