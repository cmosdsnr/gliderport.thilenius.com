import React, { useState, useEffect, useRef } from 'react'
import { Card, Button, Alert, Row, Col } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { Link, useHistory } from 'react-router-dom'
import { PhoneNumberInput } from './PhoneNumber'
import TextField from '@mui/material/TextField'
import { ToggleSlider } from "react-toggle-slider";


/**
 * Hook that alerts clicks outside of the passed ref
 */
function useOutsideAlerter(ref, setEditing) {
    useEffect(() => {
        /**
         * Alert if clicked on outside of element
         */
        function handleClickOutside(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                setEditing(0);
            }
        }
        // Bind the event listener
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);
}


export default function Dashboard() {
    const [error, setError] = useState("")
    const [editing, setEditing] = useState(0)
    const editRef = useRef()

    useOutsideAlerter(editRef, setEditing);
    const { currentUser, logout, updateUser } = useAuth()
    const history = useHistory()

    async function handleLogout() {
        setError('')
        try {
            await logout()
            history.pushState('/Login')

        } catch {
            setError('Failed to log out')
        }
    }

    const sendTestSms = () => {
        const url = import.meta.env.VITE_UPDATE_SERVER_URL + '/sendTestSms?name=' + currentUser.firstName + '&to=' + currentUser.text.address
        console.log(url)
        fetch(url)
        alert("Please check your phone for the test SMS")
    }

    const updateUserText = (obj) => {
        let t = { ...currentUser.text, ...obj }
        if (!t.speed) t.speed = 10
        if (!t.direction) t.direction = 10
        if (!t.enabled) t.enabled = false
        if (!t.duration) t.duration = 0
        updateUser('text', t)
    }

    return (

        <Row>
            <Col xs={3}>
                <div className='w-100 mx-auto pt-4'>
                    <Card>
                        <h2 className="text-center mb-4" style={{ marginTop: "50px" }}>Instructions</h2>
                        <Card.Body>
                            <p>
                                Enabling Text Alerts will send you <b>a single text</b> on any given day
                                that the wind meets or exceeds your criteria of speed and direction between
                                8 AM and 7 PM. Only 1 text per day will ever be sent out when and only when
                                these conditions are first met.
                            </p>
                            <p>
                                Servers can't text, they can only email. Text messages work using a email to
                                sms gateway and is carrier specific. For example if my phone carrier is AT&T
                                the server can Email a wind alert text message to 5559991234@att.net and the
                                email shows up as a text
                            </p>
                            <p>
                                My site can often identify your carrier from your number using <a href="http://www.fonefinder.net/">fonfinder.net</a>,
                                but sometimes it can't identify it from your phone number. If you would still like to proceed send me an
                                email <a href="mailto:stephen@thilenius.com">stephen@thilenius.com</a> with your <b>number and carrier</b>,
                                and what would be even more helpful is if you also know the gateway for your carrier. Something like
                                [10-digit-number]@yourcarrier.com. Try googling 'your carrier' email to sms gateway and see if
                                you can find it, and I will add it to the list. </p>
                        </Card.Body>
                    </Card>
                </div>
            </Col>
            <Col xs={7} >
                <div className='w-100 mx-auto pt-4' style={{ maxWidth: "600px" }} >
                    <Card>
                        <Card.Body>
                            <h2 className="text-center mb-4">Profile</h2>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <div style={{ textAlign: 'center' }}>(Click to edit)</div>
                            {currentUser ?
                                <>
                                    <div ref={editRef} >
                                        {editing === 1 ?
                                            <Row className="profileBox">
                                                <Col xs={12} style={{ marginBottom: "15px" }}>
                                                    <TextField
                                                        label="First Name"
                                                        variant="standard"
                                                        value={currentUser.firstName}
                                                        onChange={(e) => {
                                                            updateUser('firstName', e.target.value)
                                                        }}
                                                    />
                                                </Col>
                                                <Col xs={12} >

                                                    <TextField
                                                        label="Last Name"
                                                        variant="standard"
                                                        value={currentUser.lastName}
                                                        onChange={(e) => {
                                                            updateUser('lastName', e.target.value)
                                                        }}
                                                    />
                                                </Col>
                                            </Row>
                                            :
                                            <Row className="profileBox" onClick={() => setEditing(1)}>
                                                <Col xs={3}><strong>Name: </strong></Col>
                                                <Col xs={8}>{currentUser.firstName + " " + currentUser.lastName}</Col>
                                            </Row>
                                        }

                                        <Row className="profileBox">
                                            <Col xs={12}>
                                                <label>Mobile Number:
                                                    <PhoneNumberInput
                                                        style={{ marginLeft: "20px" }}
                                                        updateUserText={updateUserText}
                                                    />
                                                </label>
                                            </Col>
                                            <Col xs={12}>
                                                {currentUser.text.address?.length > 0 ?
                                                    <>
                                                        <Row><Col xs={4} style={{ marginBottom: "5px" }}><strong>Provider:</strong></Col><Col xs={6}>{currentUser.text.provider}</Col></Row>
                                                        <Row className="smsAddress">
                                                            <Col xs={4}><strong>SMS address:</strong></Col>
                                                            <Col xs={6}>{currentUser.text.address}</Col>
                                                            <Col
                                                                xs={2}
                                                                onClick={() => sendTestSms()}
                                                                className="tryMe tltip">try me!
                                                                <span
                                                                    className="tltiptext">
                                                                    You should receive a text from the gliderport if you press this button
                                                                </span>
                                                            </Col>
                                                        </Row>
                                                        {currentUser.text?.address?.length > 0 ?
                                                            <>
                                                                <Row>Enable Text Alerts: <ToggleSlider active={currentUser.text.enabled} onToggle={state => updateUserText({ enabled: state })} /></Row>
                                                            </> : null}

                                                        {currentUser.text.enabled ?
                                                            <>
                                                                <Row>
                                                                    <Col xs={{ span: 6, offset: 0 }} style={{ paddingTop: "20px" }}>
                                                                        <label>Trigger speed <span className="tltip">(?)<span className="tltiptext">Minimum speed in mph</span></span>:
                                                                            <span className="vlu">{currentUser.text.speed}</span><br />
                                                                            <input
                                                                                value={currentUser.text.speed}
                                                                                type="range"
                                                                                min="5"
                                                                                max="20"
                                                                                onChange={(e) => updateUserText({ speed: parseInt(e.target.value) })}
                                                                            />
                                                                        </label>
                                                                    </Col>
                                                                    <Col xs={6} >
                                                                        <b> Use:</b><br />
                                                                        <div >
                                                                            <input
                                                                                type="radio"
                                                                                value="0"
                                                                                name="criteria"
                                                                                checked={currentUser.text.duration === 0}
                                                                                onChange={(e) => updateUserText({ duration: parseInt(e.target.value) })}
                                                                            /> Instantaneous<br />
                                                                            <input
                                                                                type="radio"
                                                                                value="1"
                                                                                name="criteria"
                                                                                checked={currentUser.text.duration === 1}
                                                                                onChange={(e) => updateUserText({ duration: parseInt(e.target.value) })}
                                                                            /> 5 min Average<br />
                                                                            <input
                                                                                type="radio"
                                                                                value="2"
                                                                                name="criteria"
                                                                                checked={currentUser.text.duration === 2}
                                                                                onChange={(e) => updateUserText({ duration: parseInt(e.target.value) })}
                                                                            /> 15 Min Average<br />
                                                                        </div>
                                                                    </Col>
                                                                </Row>
                                                                <Row>
                                                                    <Col xs={{ span: 5, offset: 0 }} md={{ span: 4, offset: 2 }} style={{ paddingTop: "20px" }}>
                                                                        <label>Trigger Max angle <span className="tltip">(?)<span className="tltiptext">maximum the wind can be off from
                                                                            270&deg; (west)</span></span>: <span className="vlu">&plusmn;{currentUser.text.errorAngle}&deg;</span><br />
                                                                            <input
                                                                                value={currentUser.text.errorAngle}
                                                                                type="range"
                                                                                min="5"
                                                                                max="40"
                                                                                onChange={(e) => updateUserText({ errorAngle: parseInt(e.target.value) })}
                                                                            />
                                                                        </label>
                                                                    </Col>
                                                                </Row>
                                                            </> : null}
                                                    </> : null}
                                            </Col>
                                        </Row>
                                    </div>
                                    <Row className="profileBox"><Col xs={12}>
                                        <Row><Col xs={4}><strong>Email:</strong></Col><Col xs={6}>{currentUser.email}</Col></Row>
                                        <Row><Col xs={4}><strong>Role:</strong></Col><Col xs={6}>{currentUser.role}</Col></Row>
                                        {currentUser.role == 'Administrator' ?
                                            <Row><Col xs={4}><strong>Version:</strong></Col><Col xs={6}>{import.meta.env.VITE_SITE_VERSION}</Col></Row> : null}
                                    </Col></Row>

                                </> : null}
                        </Card.Body>
                    </Card>
                    <div className="w-100 text-center mt-2">
                        <Button variant="link" onClick={handleLogout}>Log Out</Button>
                    </div>
                </div>
            </Col>
            <Col xs={2}></Col>
        </Row>
    )
}
