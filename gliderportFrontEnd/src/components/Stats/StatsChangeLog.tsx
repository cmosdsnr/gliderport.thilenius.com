/**
 * @packageDocumentation
 * Changelog display for the Gliderport statistics page.
 * Renders a navigable list of dated site revisions; clicking a date
 * populates the adjacent panel with the corresponding change details.
 */
import React, { useState } from 'react'
import { Row, Col, Container, Card, ListGroup } from 'react-bootstrap'
import './stats.css'

/**
 * Represents a single entry in the site revision history.
 */
type Change = {
    /** Human-readable date string displayed in the left-hand navigation list, e.g. `"9/7/24"`. */
    date: string;
    /** JSX content shown in the detail panel when this entry is clicked. */
    html: React.ReactElement;
}

/**
 * Static list of site revision entries in reverse-chronological order.
 * Each entry corresponds to one {@link Change} rendered by {@link StatsChangeLogComponent}.
 */
const changes: Change[] = [
    {
        date: "9/7/24", html: <>
            <h4> minor revision</h4>
            <ol>
                <li>Added second camera</li>
                <li>Cleaned code with Cursor AI</li>
            </ol>
        </>
    },
    {
        date: "2/2/23", html: <>
            <h4> minor revision</h4>
            <ol>
                <li>Converted to typeScript</li>

            </ol>
        </>
    },
    {
        date: "1/7/23", html: <>
            <h4> semi-major revision</h4>
            <ol>
                <li>Site now uses 3 dokku servers</li>
                <ol>
                    <li>static site server</li>
                    <li> websocket data server</li>
                    <li> and nodejs update server</li>
                </ol>
                <li>Image data transmitted directly thru websocket server</li>
                <li>update server checks status of gliderport directly</li>
                <li>videos held on persistent storage and shared via update/websocket server</li>
            </ol>
        </>
    },
    {
        date: "8/8/22", html: <>
            <h4> Major revision</h4>
            <ol>
                <li>Site re-writer in React JS</li>
                <li>Site moved to live.flytorrey.com</li>
                <li>Site uses firebase authentication and login</li>
                <li>Still has issues on logged in pages</li>
                <li>Uses raspberry Pi 3 data collector at gliderport</li>
                <li>Raspberry Pi 3 is still connected to ESP module</li>
            </ol>
        </>
    },
    {
        date: "9/4/20", html:
            <ol>
                <li>Video on stat page works. You can pick a date and watch the video of the day.</li>
            </ol>
    },
    {
        date: "7/10/20", html:
            <ol>
                <li>Working on Video archive...</li>
                <li>Created 'Contact Me' page with some information</li>
            </ol>
    },
    {
        date: "5/31/20", html:
            <ol>
                <li>Text message alerts are functioning again</li>
                <li>24 hr Time Lapse is functioning again</li>
            </ol>
    },
    {
        date: "1/31/20", html:
            <ol>
                <li>Wind speed is now accurate. Direction is fairly accurate but may need adjustment</li>
                <li>Images are transferred directly to the new hosting site</li>
                <li>ESP32 seems to be solid now and uploading data reliably</li>
                <li>I keep an archive of all past days pictures, in case that's ever needed</li>
                <li>Site now also automatically emails me if pictures ever stop uploading for faster
                    reaction time</li>
            </ol>
    },
    {
        date: "1/20/20", html:
            <ol>
                <li>The wind velocity is off. (I believe by a factor of 2?)</li>
                <li>The issue is known & I need to replace a part at the gliderport. I will get to it</li>
                <li>Slowly shifting the data collection to the new server... there may be outages</li>
                <li>
                    I reduced the native image size to make loading much faster. You should not notice any
                    degradation in the image
                </li>
                <li>The ESP is losing it network connection after a day or two. Not sure why yet.</li>
                <li>Angle has not been fine tuned yet.</li>
                <li>These are the last steps...</li>
            </ol>
    },
    {
        date: "1/15/20", html:
            <ol>
                <li>The New TPG Electronic box has been installed</li>
                <li>The radio, serial-to-audio box, back-up power source are no longer connected</li>
                <li>I replaced the hub and ultimeter with the new 100 model</li>
                <li>Inserted in the data line is the ESP32 box, with display</li>
                <li>30 second interval data is successfully being transmitted to the database<br />
                    Note that no data is transmitted if the temp/dir/speed are unchanged since the last
                    reading</li>
                <li>The site only has options to see Scripps pier data or the ESP32</li>
                <li>Arrow and status are now ESP32 based</li>
                <li>As of right now everything seems to be working</li>
                <li><b>THE ANGLE MAY BE ASKEW (I HAD TO GUESS THE OFFSET) PLEASE GIVE ME FEEDBACK HOW MANY
                    DEGREES IT MAY BE OFF</b></li>
            </ol>
    },
    {
        date: "1/4/20", html:
            <ol>
                <li>The TPG electronics are still flaky. </li>
                <li>A new server has been acquired. Thank you all for your support!!</li>
                <li>There are 4 options for hardware. Trying to resolve the best one.</li>
                <li>Many pages are being edited right now.</li>
            </ol>
    },
    {
        date: "12/30/19", html:
            <ol>
                <li>The TPG electronics went down. Corrosion on the antenna caused packet transmission
                    errors. Power resets caused improper modes. Long story short, it's all working again.
                </li>
                <li>Raspberry PI handling images had a software meltdown, and needed to be reformated.</li>
                <li>The website is moving to a more robust server platform. This may cause some outages.
                </li>
                <li>I've added tabs to the webpage & moved things around.</li>
            </ol>
    },
    {
        date: "8/3/19", html:
            <>
                <p>Scripps Pier data is working again. New data has been in knots, but now is translated to mph
                </p>
                <p>There is a video button that rapidly goes through yesterday. I'm adding an arrow that will
                    eventually show the wind conditions as the video plays. This is still experimental</p>
                <p>Moved Change log to it's own page</p>
                <p>made buttons to access video or change log</p>
            </>
    },
    {
        date: "4/10/19", html:
            <>
                <p>Added some fail safe links</p>
                <p>Reverted the top graph to the analog data. Fixed a bug that caused data not to load if NOAA
                    is down. Netatmo system was unplugged since August, hence no data. It's being reinitialized.
                </p>
            </>
    },
    {
        date: "6/6/18", html:
            <>
                <p>Top portion (color, arrow, picture and thumb indicator auto refresh every minute or so,
                    although there may not be fresh data every minute.</p>
                <p>Temperature now displays properly</p>
                <p>Old broken data link had been purged</p>
                <p>The problem with the image persists. The camera is not uploading new images as it should, it
                    is not an issue with the web server. Still diagnosing...</p>
            </>
    },
    {
        date: "5/8/18", html:

            <p>Made it so that top banner stacks rather then disappears when a narrow screen is used like a
                cell phone. </p>
    },
    {
        date: "4/24/18", html:
            <>
                <p>The old system of weather readings use a short wave radio from the gliderport to the NOAA NWR
                    system. There is them an Internet data bridge where the data can be retrieved and presented
                    on this site. The "wind speed", "5 min average", and "15 min average" have used this data.
                    At the moment it is <b>NOT working</b>.</p>
                <p>Until I remove it or it gets repaired, "Wind Speed" is just a copy of "Netatmo", and 5 & 15
                    averages do not function. </p>
                <p>There is a new weather station at the glider port, using a solid state wind detector made by
                    Netatmo. It connects directly to the Internet as they now have good Internet there. It is at
                    the top of the pole where the new camera is if you look up at the gliderport. This system
                    has been working great but until today, my site has had issues presenting this data
                    correctly. This is now fixed and if you select Netatmo below the charts should be correct.
                </p>
                <p>The NOAA data is a similar weather station at the very end of scripps pier. It is working
                    properly as well. It's wind speeds will generally be slightly lower because it doesn't
                    experience the wind compression caused by the cliffs.</p>
                <p>I do not check this site all the time. If it stops functioning as advertised, please email me
                    so I can fix it!</p>
                <p>I will be doing more modifications and repairs to this site in the next few weeks, and will
                    post updates in this section</p>
            </>
    }
]

/**
 * Renders the Gliderport site changelog as a two-column layout.
 *
 * @remarks
 * The left column lists dated revision entries from the {@link changes} array.
 * Clicking a date highlights it and populates the right column with the
 * corresponding JSX detail block.  No API calls are made — all data is static.
 *
 * @returns The rendered changelog panel.
 *
 * @example
 * ```tsx
 * <StatsChangeLogComponent />
 * ```
 */
export function StatsChangeLogComponent(): React.ReactElement {
    /** JSX content currently displayed in the detail column. */
    const [changeText, setChangeText] = useState<React.ReactElement | null>(null)
    /** Index into {@link changes} for the currently clicked / active entry. */
    const [changeId, setChangeId] = useState<number>(-1)

    return (
        <Container className="py-4">
            <h2 className="text-center mb-4">Changes & Updates</h2>
            <Row className="g-3">
                <Col md={3}>
                    <Card className="shadow-sm">
                        <Card.Body className="p-0">
                            <ListGroup variant="flush">
                                {changes.map((v: Change, i) => (
                                    <ListGroup.Item
                                        key={i}
                                        action
                                        active={changeId === i}
                                        onClick={() => { setChangeId(i); setChangeText(v.html) }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {v.date}
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={9}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            {changeText ?? <p className="text-muted">Select a revision from the list.</p>}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default StatsChangeLogComponent;
