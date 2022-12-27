import React, { useState, useCallback, useEffect } from 'react';
import { Row, Col, Button } from "react-bootstrap"
import useWebSocket, { ReadyState } from 'react-use-websocket';

export default function WebSocket() {
    //Public API that will echo messages sent to it back to the client
    const [socketUrl, setSocketUrl] = useState('ws://live.flytorrey.com:8080');
    const [messageHistory, setMessageHistory] = useState([]);
    const [init, setInit] = useState(true)
    const [imgSrc, setImgSrc] = useState("")
    const [uuid, setUuid] = useState(null)
    const [data, setData] = useState({
        online_status: '-',
        online_status_touched: '-',
        sunrise_raw: '-',
        sunset_raw: '-',
        sunrise_timestamp: '-',
        sunset_timestamp: '-',
        sunrise_text: '-',
        sunset_text: '-',
        last_record: '-',
        todays_codes: '-',
        direction: '-',
        pressure: '-',
        speed: '-',
        temperature: '-',
        humidity: '-',
    });

    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

    useEffect(() => {
        if (lastMessage !== null) {
            // setMessageHistory((prev) => prev.concat(lastMessage));
            let msg = JSON.parse(lastMessage.data);
            if ((msg.opcode === 'broadcastUpdate') || (msg.opcode === 'initialData')) {
                msg = JSON.parse(msg.message)
                if (msg.image) {
                    setImgSrc(msg.image)
                    delete (msg.image)
                }
                // make timestamp readable
                if (msg.last_record) {
                    const dt = new Date(1000 * msg.last_record)
                    msg.last_record = dt.toLocaleDateString() + " " + dt.toLocaleTimeString() + "  (" + msg.last_record + ")"
                }
                if (msg.sunrise_timestamp) {
                    const dt = new Date(1000 * msg.sunrise_timestamp)
                    msg.sunrise_timestamp = dt.toLocaleDateString() + " " + dt.toLocaleTimeString() + "  (" + msg.sunrise_timestamp + ")"
                }
                if (msg.sunset_timestamp) {
                    const dt = new Date(1000 * msg.sunset_timestamp)
                    msg.sunset_timestamp = dt.toLocaleDateString() + " " + dt.toLocaleTimeString() + "  (" + msg.sunset_timestamp + ")"
                }
                if (msg.online_status) msg.online_status = msg.online_status === 1 ? 'ONLINE' : 'OFFLINE'
                //fix some numbers
                if (msg.speed) msg.speed /= 10;
                if (msg.temperature) msg.temperature /= 10;
                if (msg.pressure) msg.pressure += 101325;
                setData({ ...data, ...msg });
            }
            else if (msg.opcode === 'ready') {
                setUuid(msg.uuid)
            }
            else {
                setMessageHistory([...messageHistory, msg])
            }


        }
    }, [lastMessage]);


    useEffect(() => {
        if (uuid != null && init) {
            setInit(false)
            fetch('http://live.flytorrey.com/php/phpWebSocketServer/phpClient/fetchAll.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uuid: uuid })
            })
                .then((response) => response.json())
                .then((data) => console.log(data))
        }
    });

    const handleClickChangeSocketUrl = useCallback(
        () => setSocketUrl('ws://live.flytorrey.com:8080'),
        []
    );

    const handleClickSendMessage = useCallback(() => sendMessage('Hello'), []);

    const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting',
        [ReadyState.OPEN]: 'Open',
        [ReadyState.CLOSING]: 'Closing',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState];

    return (
        <>
            <Row>
                <Col xs={{ offset: 3, span: 6 }} >
                    <span style={{ fontSize: "25px", margin: "5px", color: "blue" }} >The WebSocket is currently {connectionStatus}</span>
                    {/* {lastMessage ? <span>Last message: {lastMessage.data}</span> : null} */}

                </Col>
            </Row>
            <Row>
                <Col xs={{ offset: 4, span: 3 }} >
                    <Button
                        className="btn btn-success"
                        onClick={handleClickChangeSocketUrl}
                        style={{ margin: "5px" }}
                    >
                        Click Me to change Socket Url
                    </Button>
                </Col>
            </Row>
            <Row>
                <Col xs={{ offset: 4, span: 3 }} >
                    <Button
                        className="btn btn-success"
                        onClick={handleClickSendMessage}
                        disabled={readyState !== ReadyState.OPEN}
                        style={{ margin: "5px" }}
                    >
                        Click Me to send 'Hello'
                    </Button>
                </Col>
            </Row>

            <Row>
                <Col xs={{ offset: 3, span: 6 }} >
                    <table >
                        <tbody>
                            {Object.keys(data).map((key, i) => (
                                <tr style={{ fontSize: "15px" }} key={i}>
                                    <td style={{ width: '300px' }}>{key}</td>
                                    <td >{data[key]}</td>
                                </tr>))
                            }
                        </tbody>
                    </table>
                </Col>
            </Row>
            <Row>
                <Col xs={{ offset: 3, span: 6 }} >
                    <table >
                        <tbody>
                            {messageHistory.map((v, i) => (
                                <tr style={{ fontSize: "11px" }} key={i}>
                                    <td >{v.message}</td>
                                </tr>))
                            }
                        </tbody>
                    </table>
                </Col>
            </Row>
            <Row>
                <Col xs={{ offset: 1, span: 6 }} >
                    <img src={imgSrc} alt='' />
                </Col>
            </Row>
        </>
    );
};