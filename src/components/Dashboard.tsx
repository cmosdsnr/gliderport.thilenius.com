/**
 * @packageDocumentation
 * Dashboard page for the Gliderport application.
 * Displays user profile information and settings, allows editing, and provides logout functionality.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, Row, Col } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PhoneNumberInput } from './PhoneNumber';
import TextField from '@mui/material/TextField';
import { ToggleSlider } from 'react-toggle-slider';

/**
 * Custom hook to handle clicks outside a specified element.
 * When a click occurs outside the element, it sets the editing state to 0.
 *
 * @param ref - The reference to the element to monitor for outside clicks.
 * @param setEditing - Function to update the editing state.
 */
export function useOutsideAlerter(
    ref: React.RefObject<HTMLDivElement | null>,
    setEditing: React.Dispatch<React.SetStateAction<number>>
): void {
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setEditing(0);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, setEditing]);
}

/**
 * Dashboard component displays user profile information and settings.
 * Allows editing of user details, mobile number, and text alert settings.
 * Provides functionality to send a test SMS and log out.
 * 
 * @returns {React.ReactElement} The dashboard UI.
 */
export function Dashboard(): React.ReactElement {
    const [error, setError] = useState<string>("");
    const [editing, setEditing] = useState<number>(0);
    const editRef = useRef<HTMLDivElement | null>(null);
    useOutsideAlerter(editRef, setEditing);
    const { currentUser, logout, updateUser, updateUserSettings, resetPassword } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        setError('');
        try {
            await logout();
            navigate('/Login');
        } catch {
            setError('Failed to log out');
        }
    }

    const sendTestSms = () => {
        if (currentUser) {
            const url = new URL('/api/sendTestSms', import.meta.env.VITE_SERVER_URL.toString());
            url.searchParams.set('name', currentUser.firstName || '');
            url.searchParams.set('to', currentUser.settings.address || '');
            // const url = `${import.meta.env.VITE_SERVER_URL}/api/sendTestSms?name=${currentUser.firstName}&to=${currentUser.settings.address}`;
            console.log(url);
            fetch(url.toString());
            alert("Please check your phone for the test SMS");
        }
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
                                [10-digit-number]@yourCarrier.com. Try googling 'your carrier' email to sms gateway and see if
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
                                                <Col xs={3}>
                                                    <strong>Name: </strong>
                                                </Col>
                                                <Col xs={5} onClick={() => setEditing(1)}>
                                                    {currentUser.firstName + " " + currentUser.lastName}
                                                </Col>
                                                <Col xs={4} className="text-end">
                                                    <Button variant="primary" onClick={(e) => {
                                                        // Prevent triggering the row's click (if any)
                                                        e.stopPropagation();
                                                        // Call your change password handler
                                                        resetPassword(currentUser.email);

                                                    }}>
                                                        Change Password
                                                    </Button>
                                                </Col>
                                            </Row>


                                        }

                                        <Row className="profileBox">
                                            <Col xs={12}>
                                                <label>Mobile Number:
                                                    <PhoneNumberInput
                                                        style={{ marginLeft: "20px" }}
                                                    />
                                                </label>
                                            </Col>
                                            <Col xs={12}>
                                                {(currentUser.settings.address?.length ?? 0) > 0 ?
                                                    <>
                                                        <Row><Col xs={4} style={{ marginBottom: "5px" }}><strong>Provider:</strong></Col><Col xs={6}>{currentUser.settings.provider}</Col></Row>
                                                        <Row className="smsAddress">
                                                            <Col xs={4}><strong>SMS address:</strong></Col>
                                                            <Col xs={6}>{currentUser.settings.address}</Col>
                                                            <Col
                                                                xs={2}
                                                                onClick={() => sendTestSms()}
                                                                className="tryMe toolTip">try me!
                                                                <span
                                                                    className="toolTipText">
                                                                    You should receive a text from the gliderport if you press this button
                                                                </span>
                                                            </Col>
                                                        </Row>
                                                        {currentUser.settings.address && (
                                                            <>
                                                                <Row>Enable Text Alerts: <ToggleSlider active={currentUser.textMe} onToggle={state => updateUserSettings({}, state)} /></Row>
                                                            </>
                                                        )}
                                                        {currentUser.textMe ?
                                                            <>
                                                                <Row>
                                                                    <Col xs={{ span: 6, offset: 0 }} style={{ paddingTop: "20px" }}>
                                                                        <label>Trigger speed <span className="toolTip">(?)<span className="toolTipText">Minimum speed in mph</span></span>:
                                                                            <span className="vlu">{currentUser.settings.speed}</span><br />
                                                                            <input
                                                                                value={currentUser.settings.speed}
                                                                                type="range"
                                                                                min="5"
                                                                                max="20"
                                                                                onChange={(e) => updateUserSettings({ speed: parseInt(e.target.value) }, currentUser.textMe)}
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
                                                                                checked={currentUser.settings.duration === 0}
                                                                                onChange={(e) => updateUserSettings({ duration: parseInt(e.target.value) })}
                                                                            /> Instantaneous<br />
                                                                            <input
                                                                                type="radio"
                                                                                value="1"
                                                                                name="criteria"
                                                                                checked={currentUser.settings.duration === 1}
                                                                                onChange={(e) => updateUserSettings({ duration: parseInt(e.target.value) })}
                                                                            /> 5 min Average<br />
                                                                            <input
                                                                                type="radio"
                                                                                value="2"
                                                                                name="criteria"
                                                                                checked={currentUser.settings.duration === 2}
                                                                                onChange={(e) => updateUserSettings({ duration: parseInt(e.target.value) })}
                                                                            /> 15 Min Average<br />
                                                                        </div>
                                                                    </Col>
                                                                </Row>
                                                                <Row>
                                                                    <Col xs={{ span: 5, offset: 0 }} md={{ span: 4, offset: 2 }} style={{ paddingTop: "20px" }}>
                                                                        <label>Trigger Max angle <span className="toolTip">(?)<span className="toolTipText">maximum the wind can be off from
                                                                            270&deg; (west)</span></span>: <span className="vlu">&plusmn;{currentUser.settings.errorAngle}&deg;</span><br />
                                                                            <input
                                                                                value={currentUser.settings.errorAngle}
                                                                                type="range"
                                                                                min="5"
                                                                                max="40"
                                                                                onChange={(e) => updateUserSettings({ errorAngle: parseInt(e.target.value) })}
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
export default Dashboard;