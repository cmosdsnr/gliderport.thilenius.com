import React, { useRef, useEffect, useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";

export const Key = ({ width, codes }) => {
    const canvasRef = useRef(null);

    useEffect(() => {

        const drawKey = (ctx) => {
            var widthA, widthB;
            var cntA,
                cntB = 0;
            var w;

            if (width < 1400) {
                cntA = parseInt(codes.length / 2);
                cntB = codes.length - cntA;
                widthA = width / cntA;
                widthB = width / cntB;
            } else {
                cntA = codes.length;
                widthA = width / codes.length;
            }
            for (var i = 0; i < cntA; i++) {
                ctx.beginPath();
                ctx.fillStyle = codes[i].color;
                ctx.rect(i * widthA, 0, (i + 1) * widthA, 30);
                ctx.fill();
                ctx.closePath();

                ctx.beginPath();
                ctx.fillStyle = "#000000";
                if (i === 7) {
                    ctx.fillStyle = "#FFFFFF";
                }

                w = widthA / 2 - ctx.measureText(codes[i].code).width / 2;
                ctx.fillText(codes[i].code, w + i * widthA, 15);
                ctx.closePath();
            }
            for (i = 0; i < cntB; i++) {
                ctx.beginPath();
                ctx.fillStyle = codes[i + cntA].color;
                ctx.rect(i * widthB, 30, (i + 1) * widthB, 60);
                ctx.fill();
                ctx.closePath();

                ctx.beginPath();
                ctx.fillStyle = "#000000";
                if (i === 7) {
                    ctx.fillStyle = "#FFFFFF";
                }

                w = widthB / 2 - ctx.measureText(codes[i + cntA].code).width / 2;
                ctx.fillText(codes[i + cntA].code, w + i * widthB, 45);
                ctx.closePath();
            }
        }

        const resizeAndDraw = () => {
            ctx.canvas.width = width;
            ctx.canvas.height = width < 1400 ? 60 : 30;
            drawKey(ctx);
        };


        const canvas = canvasRef.current;

        if (!canvas | !width) {
            return;
        }

        const ctx = canvas.getContext("2d");

        resizeAndDraw();
    }, [codes, width, canvasRef]);

    return <canvas ref={canvasRef} />;
};

export const LineCanvas = ({ width, forecast, codes, codeDef, formatDate }) => {
    const canvasRef = useRef(null);

    useEffect(() => {

        const drawLineTick = (ctx, pcnt, text) => {
            //var tickLength = 5;
            var x = pcnt * width;
            ctx.moveTo(x, 30);
            ctx.lineTo(x, 35);
            ctx.stroke();
            ctx.fillText(text, x - ctx.measureText(text).width / 2, 45);
        };

        const drawLine = (ctx) => {
            var s;
            var start;
            var startTimeStamp;
            var stop;
            //var stopTimeStamp;
            var i;
            var endPct
            //line format
            s = forecast[0].x;
            s = s - (s % 3600);
            s = new Date(s * 1000);
            start = s.getHours();
            startTimeStamp = s.getTime() / 1000;
            stop = 24 - start;
            //stopTimeStamp = startTimeStamp + 3600 * (stop - start);
            var tickCnt = stop - start;
            var pctPerTime = 0.9 / (3600 * (stop - start));
            //   c.width = width;
            //   c.height = 50;
            ctx.font = "10px Arial";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(0, 0, width, 50);
            ctx.stroke();
            var startPct = 0.05;
            var tickSpacePct = 0.9 / tickCnt;
            for (i = 0; i <= tickCnt; i++) {
                drawLineTick(ctx, startPct + i * tickSpacePct, start + i);
            }
            for (i = -1; i < forecast.length; i++) {
                if (i === -1) {
                    startPct = 0.0;
                } else {
                    startPct = endPct;
                }
                if (i < forecast.length - 1) {
                    endPct = 0.05 + pctPerTime * (forecast[i + 1].x - startTimeStamp);
                } else {
                    endPct = 1.0;
                }
                ctx.beginPath();
                if (i === -1 || i === forecast.length - 1) {
                    ctx.strokeStyle = codes[codeDef.IT_IS_DARK].color;
                    ctx.fillStyle = codes[codeDef.IT_IS_DARK].color;
                } else {
                    ctx.strokeStyle = codes[forecast[i].y].color;
                    ctx.fillStyle = codes[forecast[i].y].color;
                }
                ctx.rect(
                    startPct * width,
                    0,
                    (endPct - startPct) * width,
                    30
                );
                ctx.stroke();
                ctx.fill();
            }
        };

        const resizeAndDraw = () => {
            ctx.canvas.width = width;
            ctx.canvas.height = 60;
            if (forecast) {
                drawLine(ctx);
            }
        };

        const canvas = canvasRef.current;
        if (!canvas | !width) {
            return;
        }
        const ctx = canvas.getContext("2d");
        resizeAndDraw();
    }, [codes, codeDef, forecast, formatDate, width]);

    return <canvas ref={canvasRef} />;
};

export const Canvas = ({ forecast, width, codes, formatDate }) => {
    const canvasRef = useRef(null);

    useEffect(() => {

        const drawClockTick = (ctx) => {
        };


        const drawData = (ctx, forecast, codes, formatDate, radius) => {
            var s;
            var start;
            var startTimeStamp;
            var stop;

            var tickCnt, tickSpaceRad, radPerTime, startAngle, endAngle
            // var stopTimeStamp;
            var i;

            var n = 0;
            while (forecast[n].y === 0) {
                n++; //find first non-dark time
            }
            var m = n;
            while (forecast[m].y !== 0) {
                m++; //find last non-dark time
            }
            m++; // go one past that
            s = forecast[n].x;
            s = s - (s % 3600);
            s = new Date(s * 1000);
            start = s.getHours();
            startTimeStamp = s.getTime() / 1000;
            s = forecast[m].x;
            s = s - (s % 3600);
            s = new Date(s * 1000);
            stop = s.getHours();
            //stopTimeStamp = s.getTime() / 1000;
            tickCnt = stop - start;
            tickSpaceRad = (Math.PI * (5 / 3)) / tickCnt;
            radPerTime = tickSpaceRad / 3600;

            var mcenter = { x: radius + 30, y: radius + 30 };
            ctx.font = "10px Arial";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(mcenter.x, mcenter.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
            startAngle = Math.PI * (2 / 3);
            for (i = 0; i <= tickCnt; i++) {
                drawClockTick(
                    ctx,
                    mcenter,
                    radius,
                    startAngle + i * tickSpaceRad,
                    start + i
                );
            }
            for (i = n; i <= m; i++) {
                // if (i === n) {
                //     startAngle = Math.PI * (2 / 3);
                // } else {
                startAngle =
                    Math.PI * (2 / 3) + radPerTime * (forecast[i].x - startTimeStamp);
                // }
                if (i === m - 1) {
                    endAngle = Math.PI * (1 / 3);
                } else {
                    endAngle =
                        Math.PI * (2 / 3) +
                        radPerTime * (forecast[i + 1].x - startTimeStamp);
                }
                if (i === m) {
                    startAngle = Math.PI * (1 / 3);
                    endAngle =
                        Math.PI * (2 / 3) +
                        radPerTime * (forecast[n].x - startTimeStamp);
                }
                ctx.beginPath();
                ctx.strokeStyle = codes[forecast[i].y].color;
                ctx.fillStyle = codes[forecast[i].y].color;
                ctx.moveTo(mcenter.x, mcenter.y);
                const x = mcenter.x + radius * Math.cos(startAngle);
                const y = mcenter.y + radius * Math.sin(startAngle);
                ctx.lineTo(x, y);
                //endAngle = Math.PI*(1);
                ctx.arc(mcenter.x, mcenter.y, radius, startAngle, endAngle);
                ctx.lineTo(mcenter.x, mcenter.y);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            }
            ctx.strokeStyle = "#FFFFFF";
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.arc(mcenter.x, mcenter.y, radius * 0.6, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
            ctx.strokeStyle = "#000000";
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            var text = formatDate(s); // sugarjs: s.format("{Weekday} {d} {Month}"); //$filter("date")(s, "EEEE");
            var w = ctx.measureText(text).width;
            ctx.fillText(text, mcenter.x - w / 2, mcenter.y - 0);
            var month = s.getMonth() + 1;
            text = month + "/" + s.getDate();
            w = ctx.measureText(text).width;
            ctx.fillText(text, mcenter.x - w / 2, mcenter.y + 15);
            ctx.stroke();
            ctx.closePath();
        };
        const resizeAndDraw = (ctx, radius, forecast, width, codes, formatDate) => {
            ctx.canvas.width = width;
            ctx.canvas.height = 2 * radius + 60;
            if (forecast) {
                drawData({ ctx, forecast, codes, formatDate })
            }
        };

        const canvas = canvasRef.current;
        if (!canvas | !width) {
            return;
        }
        const ctx = canvas.getContext("2d");
        const radius = 30
        resizeAndDraw(ctx, radius, forecast, width, codes, formatDate);
    }, [codes, forecast, formatDate, width]);

    return <canvas ref={canvasRef} />;
};

// *********************************************
export default function Forecast({ loc, codes, codeDef, formatDate }) {
    const containerRef = useRef(null);
    const containerKeyRef = useRef(null);

    const [day1, setDay1] = useState(null);
    const [day2, setDay2] = useState(null);
    const [width, setWidth] = useState(null);
    const [keyWidth, setKeyWidth] = useState(null);
    const [radius, setRadius] = useState(null);
    const [clockFormat, setClockFormat] = useState(true);
    let toggleText = "Toggle to Line Format";

    useEffect(() => {
        fetch(loc + "OpenWeather/forcast.json")
            .then(function (res) {
                return res.json();
            })
            .then(function (days) {
                let d = [];
                for (var day in days) {
                    let f = { dir: [], spd: [], tmp: [], prs: [], hum: [], code: [] };
                    for (var i in days[day]) {
                        let hour = days[day][i];
                        f.dir.push({ x: hour.u, y: hour.d });
                        f.spd.push({ x: hour.u, y: hour.s });
                        f.tmp.push({ x: hour.u, y: hour.t });
                        f.prs.push({ x: hour.u, y: hour.p });
                        f.hum.push({ x: hour.u, y: hour.h });
                        f.code.push({ x: hour.u, y: hour.c });
                    }

                    d[day] = f;
                }
                setDay1(d[0].code);
                setDay2(d[1].code);
            });

        const container = containerRef.current;
        const containerKey = containerKeyRef.current;
        if (!container) {
            return;
        }
        const resizeAndDraw = () => {
            const maxWidth = 300;
            const widthADjust = 30;
            var cw = container.clientWidth - widthADjust; // when plots become viable, size shrinks by 17.. scrolbar appears
            setWidth(cw);
            setRadius(cw > maxWidth ? maxWidth / 2 - 30 : cw / 2 - 30);
            setKeyWidth(containerKey.clientWidth - widthADjust);
        };
        resizeAndDraw();
        window.addEventListener("resize", resizeAndDraw);

        return () => window.removeEventListener("resize", resizeAndDraw);
    }, [loc]);

    const toggleFormat = () => {
        if (clockFormat === 0) {
            toggleText = "Toggle to Clock Format";
        } else {
            toggleText = "Toggle to Line Format";
        }
        setClockFormat(!clockFormat);
    };

    return (
        <Container fluid>
            <Row style={{ textAlign: "center", paddingBottom: "20px" }}>
                <Col sm={3}>
                    <button
                        style={{ margin: "5px" }}
                        className="btn btn-primary btn-sm"
                        onClick={toggleFormat}
                    >
                        {toggleText}
                    </button>
                </Col>
                <Col sm={6}>
                    <h4>Forecast for the next two days</h4>
                </Col>
            </Row>
            <Row style={{ paddingBottom: "20px" }}>
                <Col ref={containerKeyRef}>
                    <Key width={keyWidth} codes={codes} />
                </Col>
            </Row>

            {!clockFormat ? (
                <>
                    <Row>
                        <Col ref={containerRef}>
                            <LineCanvas width={keyWidth} forecast={day1} codes={codes} codeDef={codeDef} />
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <LineCanvas width={keyWidth} forecast={day2} codes={codes} codeDef={codeDef} />
                        </Col>
                    </Row>
                </>
            ) : (
                <Row>
                    <Col
                        ref={containerRef}
                        xs={12}
                        md={6}
                        lg={{ span: 4, offset: 2 }}
                        xl={{ span: 3, offset: 3 }}
                    >
                        <Canvas radius={radius} width={width} forecast={day1} />
                    </Col>
                    <Col xs={12} md={6} lg={4} xl={3}>
                        <Canvas radius={radius} width={width} forecast={day2} />
                    </Col>
                </Row>
            )}
        </Container>
    );
};
