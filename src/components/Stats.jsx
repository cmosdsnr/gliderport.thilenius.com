import React, { useState, useEffect, useRef } from "react"
import * as d3 from 'd3'
import { Row, Col, Card } from "react-bootstrap"
import { useData } from '../contexts/DataContext'
import { Vids } from './Globals.jsx'
import '../css/stats.css'
import Modal from "react-modal"

export default function Stats() {
    const [years, setYears] = useState([])
    const [yearFilter, setYearFilter] = useState("0")
    const [monthFilter, setMonthFilter] = useState(-1)
    const [filterValue, setFilterValue] = useState("2022")
    const [modalIsOpen, setModalIsOpen] = useState(false)
    const [selectedVideo, setSelectedVideo] = useState(null)
    const [changeText, setChangeText] = useState(null)
    const [changeId, setChangeId] = useState(null)
    const [player, setPlayer] = useState(null)

    const videoRef = useRef(null)
    const canvas = useRef(null)
    const { loadData, videos, hitStats, } = useData()

    let abbrMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // link up the visitor data
    useEffect(() => {
        loadData("Videos")
        loadData("Stats")
    }, [])

    useEffect(() => {
        let m = monthFilter > -1 ? ("-" + (monthFilter >= 9 ? "" : "0") + (monthFilter + 1).toString() + "-") : ""
        setFilterValue((yearFilter != "0" ? yearFilter : "") + m)
    }, [yearFilter, monthFilter])

    function afterOpenModal() {
        if (videoRef?.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
    }

    // var lineInc = 2,
    //     majMarkDegree = 10,
    //     degreeInc = 30,
    //     compassrose = document.getElementById("compassrose"),
    //     xmlns = "http://www.w3.org/2000/svg",
    //     xlink = "http://www.w3.org/1999/xlink";
    // if (lineInc > 0) {
    //     for (i = 0; i < 360; i += lineInc) {
    //         var newline = document.createElementNS(xmlns, 'use');
    //         if (i % majMarkDegree == 0) {
    //             newline.setAttributeNS(xlink, 'xlink:href', '#majline');
    //         } else {
    //             newline.setAttributeNS(xlink, 'xlink:href', '#roseline');
    //         }
    //         newline.setAttributeNS(null, 'transform', 'rotate(' + i + ' 250 250)');
    //         compassrose.appendChild(newline);
    //     }
    // }
    // var writeDegs = document.createElementNS(xmlns, 'text'),
    //     currentDeg = 0,
    //     writeOffset = 0;
    // for (i = 0; i < 99; i += (degreeInc / 360) * 100) {
    //     var degree = document.createElementNS(xmlns, 'textPath');
    //     degree.setAttributeNS(xlink, 'xlink:href', '#rosecircle');
    //     var length = Math.log(i) * Math.LOG10E + 1 | 0;
    //     if (length > 1) { writeOffset = 1; }
    //     degree.setAttributeNS(null, 'startOffset', (i - writeOffset) + "%");
    //     degree.textContent = 360 - currentDeg;
    //     if (degree.textContent == 360) degree.textContent = 0;
    //     writeDegs.appendChild(degree);
    //     currentDeg += degreeInc;
    // }
    // compassrose.appendChild(writeDegs);


    return (
        <>
            <Row>
                <Col
                    xs={12}
                    md={6}
                    style={{ paddingBottom: '30px' }}
                >
                    <Row>
                        {/* {showTable ? ( */}
                        <Col xs={12} className="greyBackground">
                            <h4>Site Statistics:</h4>
                            <center>
                                <table style={{ marginTop: '15px' }}>
                                    <tbody>
                                        <tr>
                                            <th></th>
                                            <th>all</th>
                                            <th>unique IP's</th>
                                        </tr>
                                        <tr>
                                            <th>Visits on {hitStats?.day?.day}</th>
                                            <th>{hitStats?.day?.total}</th>
                                            <th>{hitStats?.day?.unique}</th>
                                        </tr>
                                        <tr>
                                            <th>Visits last week (Fri-Fri):</th>
                                            <th>{hitStats?.week?.total}</th>
                                            <th>{hitStats?.week?.unique}</th>
                                        </tr>
                                        <tr>
                                            <th>Visits last 30 days:</th>
                                            <th>{hitStats?.month?.total}</th>
                                            <th>{hitStats?.month?.unique}</th>
                                        </tr>
                                        <tr>
                                            <th>Total visits:</th>
                                            <th>{hitStats?.total?.count}</th>
                                            <th>{hitStats?.total?.unique}</th>
                                        </tr>
                                        <tr>
                                            <th>Last reset:</th>
                                            <th>{hitStats?.lastReset}</th>
                                        </tr>
                                    </tbody>
                                </table>
                            </center>
                        </Col>
                    </Row>
                    <Row><Col xs={12} ><StatPlot data={hitStats?.weeks} /></Col></Row>

                    <Row className="blueBorder">
                        <Col xs={12}>
                            <center>
                                <h4>Past Videos</h4>
                            </center>
                        </Col>
                        <Col xs={12}>
                            years:
                            {videos.videoYears.map((v, i) => {
                                return <button
                                    style={{
                                        marginLeft: "10px",
                                        border: "Solid 1px black",
                                        borderRadius: "3px",
                                        backgroundColor: v === yearFilter ? "yellow" : "lightblue",
                                    }}
                                    key={i}
                                    onClick={() => {
                                        if (v === yearFilter) setYearFilter("0")
                                        else setYearFilter(v)
                                    }}>{v}</button>
                            })}
                        </Col>
                        <Col xs={2} style={{ marginTop: "10px" }}>
                            month:
                        </Col>
                        <Col xs={10} style={{ marginTop: "10px" }}>
                            {[...Array(6).keys()].map((v, i) => {
                                return <button
                                    style={{
                                        marginLeft: "10px",
                                        border: "Solid 1px black",
                                        borderRadius: "3px",
                                        backgroundColor: i === monthFilter ? "yellow" : "lightblue",
                                    }}
                                    key={i}
                                    onClick={() => {
                                        if (i === monthFilter) setMonthFilter(-1)
                                        else setMonthFilter(i)
                                    }}>{abbrMonths[i]}</button>
                            })}
                        </Col>
                        <Col xs={{ offset: 2, span: 10 }} style={{ marginTop: "10px" }}>
                            {[...Array(6).keys()].map((v, i) => {
                                return <button
                                    style={{
                                        marginLeft: "10px",
                                        border: "Solid 1px black",
                                        borderRadius: "3px",
                                        backgroundColor: i + 6 === monthFilter ? "yellow" : "lightblue",
                                    }}
                                    key={i + 6}
                                    onClick={() => {
                                        if (i + 6 === monthFilter) setMonthFilter(-1)
                                        else setMonthFilter(i + 6)
                                    }} >{abbrMonths[i + 6]}</button>
                            })}
                        </Col>

                        <Col xs={12} style={{ height: '200px', overflow: 'auto', padding: '2%', marginTop: "20px", border: "3px solid orange" }} >
                            <Row className="small">
                                {videos.videos.filter(video => video.includes(filterValue)).map((v, i) => {
                                    return (
                                        <Col
                                            key={i}
                                            xs={3}
                                            className="videos"
                                            onClick={e => setSelectedVideo(e.target.textContent)}
                                        >
                                            {v}
                                        </Col>
                                    )
                                })}
                            </Row>
                        </Col>
                        <Col xs={12}>
                            <center>
                                <h5 style={{ marginTop: '20px' }}>
                                    <button className="btn btn-primary"
                                        onClick={e => setModalIsOpen(true)}>
                                        Play {selectedVideo}
                                    </button>
                                </h5>
                            </center>
                        </Col>
                    </Row>

                    <Row className="blueBorder">
                        <h4>Some useful links:</h4>
                        <ul style={{ fontSize: '23px' }}>
                            <li><a href="https://www.windy.com/32.892/-117.240?100m,32.883,-117.240,14,m:ezYacTK">Wind Predictions (location = Torrey Pines)</a></li>
                            <li><a href="http://findu.com/cgi-bin/wx.cgi?call=W9IF-4&last=4">Analog gliderport system Weather</a>
                            </li>
                            <li><a href="https://www.tidesandcurrents.noaa.gov/stationhome.html?id=9410230">NOAA Scripps Pier
                                Weather</a></li>
                            <li><a href="https://www.flytorrey.com/">Torrey Pines Gliderport Site</a></li>
                        </ul>
                    </Row>
                </Col>

                <Col xs={12} md={6} className="leftBorder">
                    <Row>
                        <center>
                            <h2>Changes & Updates</h2>
                        </center>
                        <Col xs={2}>
                            {changes.map((v, i) => {
                                return (<h5 key={i}
                                    style={{ backgroundColor: changeId === i ? "lightblue" : "white" }}
                                    onMouseEnter={() => { setChangeId(i); setChangeText(v.html) }}>{v.date}</h5>)
                            })
                            }
                        </Col>
                        <Col xs={10}>{changeText}</Col>
                    </Row>
                    {/* <center>
                        <h2>Changes & Updates</h2>
                    </center>

                    <Accordion>
                        {changes.map((v, i) => {
                            return (
                                <AccordionItem key={i} eventKey={i} className="Bordered">
                                    <div className="card-header">
                                        <h5 className="mb-0">{v.date}</h5>
                                    </div>
                                    <div className="card-body">{v.html}</div>
                                </AccordionItem>)
                        })}
                    </Accordion> */}
                </Col>
            </Row>

            <Modal
                isOpen={modalIsOpen}
                onRequestClose={() => setModalIsOpen(false)}
                onAfterOpen={afterOpenModal}
                style={
                    {
                        overlay: {
                            backgroundColor: 'rgba(0, 0, 0, 0.4)'
                        }
                    }
                }
            >
                <Card>
                    <Card.Body>
                        <video ref={videoRef} controls id="video1" preload="none">
                            <source src={import.meta.env.VITE_UPDATE_SERVER_URL + '/' + selectedVideo + ".mp4"} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                        <div id="demo">Start</div>
                        <div className="compass">
                            <svg viewBox="0 0 500 500" transform="rotate(3)">
                                <g id="compassrose" transform="scale(1,0.4), rotate(95,250,250)">
                                    <g id="movieArrow" className="arrow" transform="rotate(0,250,250)">
                                        <line id="movieArrowLine" x1="250" y1="250" x2="250" y2="440" />
                                        <polygon points="250,440 245,420 255,420" style={{ fill: 'black' }} />
                                    </g>
                                </g>
                                <defs>
                                    <symbol>
                                        <line x1="40" y1="250" x2="50" y2="250" id="roseline" />
                                        <line x1="40" y1="250" x2="60" y2="250" id="majline" />
                                        <path d="M10,250a240,240 0 1,0 480,0a240,240 0 1,0 -480,0" id="rosecircle" />
                                    </symbol>
                                </defs>
                            </svg>
                        </div>
                    </Card.Body>
                </Card>

                {/* <button onClick={() => setModalIsOpen(false)}>Close</button> */}
            </Modal>
        </>
    )
}



const StatPlot = props => {
    const { data, ...rest } = props
    // const { data, ...rest } = props
    const chartRef = useRef(null)

    const [plotData, setPlotData] = useState([])
    const [width, setWidth] = useState(0)
    const rowRef = useRef(null)

    const margin = { top: 10, right: 60, bottom: 60, left: 25 }

    useEffect(() => {
        const resizeAndDraw = () => {
            const container = rowRef.current
            if (!container) {
                console.log("no container")
                return
            }
            setWidth(container.clientWidth)
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])


    useEffect(() => {
        if (data) {
            const start = parseInt(new Date(data.start + "08:00:00").getTime() / 1000)
            //  data.last - data.data.length * 7 * 24 * 3600
            let d = []
            data.totals.forEach((v, i) => d.push([start + i * 7 * 24 * 3600, parseInt(v)]));
            setPlotData(d)
        }
    }, [data])


    useEffect(() => {
        // if there is no width or no data we should not be here
        if (plotData.length === 0 || width === 0) { return }

        const height = 0.6 * width

        // // Adds the svg canvas
        var svgContainer = d3.select(chartRef.current)
        svgContainer.selectAll("*").remove()
        var svg = svgContainer.append("svg")
            .attr("width", width - margin.left)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

        const numberOfWeeks = plotData.length
        const stepWeeks = parseInt(numberOfWeeks / (width / 40))
        let tickValues = []
        for (let i = 0; i < 1 + ((width - margin.left) / 40); i++) { tickValues.push(plotData[0][0] + i * stepWeeks * 7 * 24 * 3600) }

        // Set the ranges
        var x = d3.scaleLinear().range([0, width - margin.left - 51])
        var y = d3.scaleLinear().range([height, 0])

        // Scale the range of the data
        x.domain(d3.extent(plotData, function (d) { return d[0] }))
        y.domain([0, d3.max(plotData, function (d) { return d[1] })])

        // draw bottom X axis 
        svg.append("g")
            .attr('class', 'x axis-grid')
            .attr("transform", "translate(" + margin.left + "," + (height + 10) + ")")
            .call(
                d3
                    .axisBottom(x)
                    .tickSize(-height)
                    .tickValues(tickValues)
                    .tickFormat(function (d) {
                        let td = new Date()
                        td.setTime(1000 * d)
                        const m = td.getMonth() + 1
                        const a = td.getDate()
                        const y = td.getFullYear() - 2000
                        return m + "-" + a + "-" + y
                    })
            )
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", -2)
            .attr("dy", 5)
            .attr("transform", "rotate(-35)");

        // draw left axis 
        svg.append("g")
            .attr('class', 'y axis-grid')
            .attr("transform", "translate(" + margin.left + ",9)")
            .call(d3.axisLeft(y)
                .tickSize(-width + margin.right))

        //label left Y axis
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("y", ".75em")
            .attr("x", -190)
            .attr("y", -10)
            .attr("transform", "rotate(-90)")
            .text("Hits Per Week");


        // // Define the line
        var hitsLine = d3.line()
            .x(function (d) {
                if (d.length === 0) return 0
                const a = x(d[0])
                return a
            })
            .y(function (d) {
                if (d.length === 0) return 0
                const a = y(d[1])
                return a
            })

        svg.append("path")
            .attr("transform", "translate(" + margin.left + ",9)")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", hitsLine(plotData))


        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plotData, width]) // Redraw chart if data or size changes


    return (
        <Row>
            <Col xs={12} ref={rowRef} className="greyBackground" style={{ paddingTop: '15px' }}>
                <div ref={chartRef} {...rest} />
            </Col>
        </Row>
    )
}


function Accordion({ children }) {

    const [currentKey, setCurrentKey] = useState(-1)

    const childrenWithProps = React.Children.map(children, child => {

        if (React.isValidElement(child)) {
            return React.cloneElement(child, { currentKey, setCurrentKey });
        }
        return child;
    });

    return <div>{childrenWithProps}</div>
}
function AccordionItem({ children, eventKey, currentKey, setCurrentKey }) {

    return (
        <>
            <div onMouseEnter={() => setCurrentKey(eventKey)} onMouseLeave={() => setCurrentKey(-1)} >
                {children[0]}

                {currentKey === eventKey ? <>{children[1]}</> : null}
            </div>

        </>
    );
}


const changes = [
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
                <li>Still has issues/incompletes on logged in pages</li>
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
                <li>Images are transfered directly to the new hosting site</li>
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
                <li>The issue is kown & I need to repace a part at the gliderport. I will get to it</li>
                <li>Slowly shifting the data colection to the new server... there may be outages</li>
                <li>I reduced the native image size to make loading much faster. You should not notice any
                    degradation in the image</li>
                <li>The ESP is losing it network conection after a day or two. Not sure why yet.</li>
                <li>Angle has not been fine tuned yet.</li>
                <li>These are the last steps...</li>
            </ol>
    },
    {
        date: "1/15/20", html:
            <ol>
                <li>The New TPG Eletronic box has been installed</li>
                <li>The radio, serial-to-audio box, back-up power source are no longer connected</li>
                <li>I replaced the hub and ultimeter with the new 100 model</li>
                <li>Inserted in the data line is the ESP32 box, wiht display</li>
                <li>30 second interval data is sucessfully being transmitted to the database<br />
                    Note that no data is transmitted if the temp/dir/speed are unchanged since the last
                    reading</li>
                <li>The site only has options to see Scripps peir data or the ESP32</li>
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
                    errors. Power resets caused improper modes. Long story short, it’s all working again.
                </li>
                <li>Raspbery PI handeling images had a software meltdown, and needed to be reformated.</li>
                <li>The website is moving to a more robust server platform. This may cause some outages.
                </li>
                <li>I’ve added tabs to the webpage & moved things around.</li>
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