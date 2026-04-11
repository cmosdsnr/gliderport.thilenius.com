/**
 * @packageDocumentation
 * Dashboard page for the Gliderport application.
 *
 * Displays a three-card summary (Profile, Current Conditions, Text Alerts)
 * and opens an Alerts Settings modal for configuring SMS notifications.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, Row, Col, Modal, Badge, Container } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PhoneNumberInput } from './PhoneNumber';
import TextField from '@mui/material/TextField';
import { ToggleSlider } from 'react-toggle-slider';
import { API } from '@/api';
import { useSensorData } from '@/contexts/SensorDataContext';

/** Convert degrees to a compass direction label. */
function degreesToCompass(deg: number): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Custom hook to detect clicks outside a referenced element.
 * Resets `editing` to 0 when a click lands outside.
 *
 * @param ref - Element to watch.
 * @param setEditing - State setter to call on outside click.
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
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [ref, setEditing]);
}

/**
 * Dashboard component — profile summary, live conditions, and alert status.
 *
 * @returns The dashboard UI.
 */
export function Dashboard(): React.ReactElement {
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(0);
    const [showAlerts, setShowAlerts] = useState(false);
    const editRef = useRef<HTMLDivElement | null>(null);
    useOutsideAlerter(editRef, setEditing);

    const { currentUser, logout, updateUser, updateUserSettings, resetPassword } = useAuth();
    const { readings } = useSensorData();
    const navigate = useNavigate();

    const latest = readings[readings.length - 1];

    // Determine whether current conditions meet the user's alert threshold
    const alertSpeed = currentUser?.settings.speed ?? 10;
    const alertAngle = currentUser?.settings.errorAngle ?? 20;
    const windDiff = Math.abs(((latest?.direction ?? 270) - 270 + 360) % 360);
    const normalizedDiff = windDiff > 180 ? 360 - windDiff : windDiff;
    const conditionsMet = (latest?.speed ?? 0) >= alertSpeed && normalizedDiff <= alertAngle;

    async function handleLogout() {
        setError('');
        try {
            await logout();
            navigate('/Login');
        } catch {
            setError('Failed to log out');
        }
    }

    function sendTestSms() {
        if (currentUser) {
            fetch(API.sendTestSms(currentUser.firstName || '', currentUser.settings.address || ''));
            alert('Please check your phone for the test SMS');
        }
    }

    return (
        <Container className="py-4">
            {error && <Alert variant="danger">{error}</Alert>}

            {/* ── Summary cards ── */}
            <Row className="g-3 mb-4">

                {/* Profile */}
                <Col md={4}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-primary text-white fw-semibold">Profile</Card.Header>
                        <Card.Body>
                            {currentUser && (
                                <div ref={editRef}>
                                    {editing === 1 ? (
                                        <div className="d-flex flex-column gap-3">
                                            <TextField
                                                label="First Name"
                                                variant="standard"
                                                size="small"
                                                value={currentUser.firstName}
                                                onChange={e => updateUser('firstName', e.target.value)}
                                            />
                                            <TextField
                                                label="Last Name"
                                                variant="standard"
                                                size="small"
                                                value={currentUser.lastName}
                                                onChange={e => updateUser('lastName', e.target.value)}
                                            />
                                            <small className="text-muted">Click outside to save</small>
                                        </div>
                                    ) : (
                                        <dl className="mb-0">
                                            <dt>Name</dt>
                                            <dd>
                                                <span
                                                    className="text-primary"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setEditing(1)}
                                                    title="Click to edit"
                                                >
                                                    {currentUser.firstName} {currentUser.lastName}
                                                </span>{' '}
                                                <small className="text-muted">(click to edit)</small>
                                            </dd>
                                            <dt>Email</dt>
                                            <dd>{currentUser.email}</dd>
                                            <dt>Role</dt>
                                            <dd>
                                                <Badge bg={currentUser.role === 'Administrator' ? 'danger' : 'secondary'}>
                                                    {currentUser.role}
                                                </Badge>
                                                {' '}
                                                {currentUser.verified
                                                    ? <Badge bg="success">Verified</Badge>
                                                    : <Badge bg="warning" text="dark">Unverified</Badge>
                                                }
                                            </dd>
                                            {currentUser.role === 'Administrator' && (
                                                <>
                                                    <dt>Version</dt>
                                                    <dd>{import.meta.env.VITE_SITE_VERSION}</dd>
                                                </>
                                            )}
                                        </dl>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                        <Card.Footer className="d-flex gap-2">
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => currentUser && resetPassword(currentUser.email)}
                            >
                                Change Password
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={handleLogout}>
                                Log Out
                            </Button>
                        </Card.Footer>
                    </Card>
                </Col>

                {/* Current Conditions */}
                <Col md={4}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="fw-semibold" style={{ backgroundColor: '#17a2b8', color: 'white' }}>
                            Current Conditions
                        </Card.Header>
                        <Card.Body>
                            {latest ? (
                                <dl className="mb-0">
                                    <dt>Wind Speed</dt>
                                    <dd>
                                        <span className="fs-4 fw-bold">{latest.speed.toFixed(1)}</span>
                                        <small className="text-muted ms-1">mph</small>
                                    </dd>
                                    <dt>Direction</dt>
                                    <dd>{latest.direction}° — {degreesToCompass(latest.direction)}</dd>
                                    <dt>Temperature</dt>
                                    <dd>{latest.temperature.toFixed(1)} °C</dd>
                                    <dt>Humidity</dt>
                                    <dd>{latest.humidity}%</dd>
                                    <dt>Pressure</dt>
                                    <dd>{latest.pressure.toFixed(1)} mBar</dd>
                                </dl>
                            ) : (
                                <p className="text-muted">Loading sensor data…</p>
                            )}
                        </Card.Body>
                        {currentUser?.textMe && (
                            <Card.Footer>
                                <Badge bg={conditionsMet ? 'success' : 'secondary'}>
                                    {conditionsMet ? '✓ Flying conditions met' : 'Below your threshold'}
                                </Badge>
                            </Card.Footer>
                        )}
                    </Card>
                </Col>

                {/* Text Alerts */}
                <Col md={4}>
                    <Card className="h-100 shadow-sm">
                        <Card.Header className="fw-semibold" style={{ backgroundColor: '#ffc107', color: '#212529' }}>
                            Text Alerts
                        </Card.Header>
                        <Card.Body>
                            {currentUser && (
                                <>
                                    <div className="mb-3">
                                        <Badge bg={currentUser.textMe ? 'success' : 'secondary'} className="fs-6">
                                            {currentUser.textMe ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </div>
                                    {currentUser.settings.address ? (
                                        <dl className="mb-0">
                                            <dt>Phone</dt>
                                            <dd>{currentUser.settings.phone || '—'}</dd>
                                            <dt>Carrier</dt>
                                            <dd>{currentUser.settings.provider || '—'}</dd>
                                            <dt>Trigger Speed</dt>
                                            <dd>≥ {currentUser.settings.speed} mph</dd>
                                            <dt>Direction Tolerance</dt>
                                            <dd>±{currentUser.settings.errorAngle}° from west</dd>
                                        </dl>
                                    ) : (
                                        <p className="text-muted small">
                                            No phone number configured yet. Click Configure to set one up.
                                        </p>
                                    )}
                                </>
                            )}
                        </Card.Body>
                        <Card.Footer>
                            <Button
                                size="sm"
                                variant="outline-warning"
                                onClick={() => setShowAlerts(true)}
                            >
                                Configure Alerts
                            </Button>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>

            {/* ── Alerts Settings Modal ── */}
            <Modal show={showAlerts} onHide={() => setShowAlerts(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Text Alert Settings</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {currentUser && (
                        <Row>
                            <Col md={5} className="border-end pe-4">
                                <h6 className="fw-semibold">How It Works</h6>
                                <p className="small text-muted">
                                    You'll receive <strong>one text per day</strong> when wind first meets your
                                    speed and direction criteria between 8 AM and 7 PM.
                                </p>
                                <p className="small text-muted">
                                    Servers send email, not SMS — each carrier has an email-to-SMS gateway.
                                    For example AT&T users receive texts sent to{' '}
                                    <code>5559991234@att.net</code>.
                                </p>
                                <p className="small text-muted">
                                    Can't find your gateway? Email{' '}
                                    <a href="mailto:stephen@thilenius.com">stephen@thilenius.com</a> your
                                    number and carrier name.
                                </p>
                            </Col>
                            <Col md={7} className="ps-4">
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Mobile Number</label>
                                    <PhoneNumberInput />
                                </div>

                                {currentUser.settings.address && (
                                    <>
                                        <Row className="mb-2 align-items-center">
                                            <Col xs={4}><strong>Provider:</strong></Col>
                                            <Col>{currentUser.settings.provider}</Col>
                                        </Row>
                                        <Row className="mb-3 align-items-center">
                                            <Col xs={4}><strong>SMS address:</strong></Col>
                                            <Col className="text-break">{currentUser.settings.address}</Col>
                                            <Col xs="auto">
                                                <Button size="sm" variant="outline-info" onClick={sendTestSms}>
                                                    Test SMS
                                                </Button>
                                            </Col>
                                        </Row>

                                        <div className="mb-3 d-flex align-items-center gap-3">
                                            <span className="fw-semibold">Enable Alerts:</span>
                                            <ToggleSlider
                                                active={currentUser.textMe}
                                                onToggle={state => updateUserSettings({}, state)}
                                            />
                                        </div>

                                        {currentUser.textMe && (
                                            <>
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Trigger Speed:{' '}
                                                        <strong className="text-primary">{currentUser.settings.speed} mph</strong>
                                                    </label>
                                                    <input
                                                        type="range"
                                                        className="form-range"
                                                        value={currentUser.settings.speed}
                                                        min="5"
                                                        max="20"
                                                        onChange={e => updateUserSettings(
                                                            { speed: parseInt(e.target.value) },
                                                            currentUser.textMe
                                                        )}
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label fw-semibold">Averaging Window</label>
                                                    {(['Instantaneous', '5 min Average', '15 min Average'] as const).map((label, val) => (
                                                        <div className="form-check" key={val}>
                                                            <input
                                                                className="form-check-input"
                                                                type="radio"
                                                                name="criteria"
                                                                value={val}
                                                                checked={currentUser.settings.duration === val}
                                                                onChange={e => updateUserSettings({ duration: parseInt(e.target.value) })}
                                                            />
                                                            <label className="form-check-label">{label}</label>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Max Direction Offset:{' '}
                                                        <strong className="text-primary">±{currentUser.settings.errorAngle}°</strong>{' '}
                                                        from west
                                                    </label>
                                                    <input
                                                        type="range"
                                                        className="form-range"
                                                        value={currentUser.settings.errorAngle}
                                                        min="5"
                                                        max="40"
                                                        onChange={e => updateUserSettings({ errorAngle: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAlerts(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}

export default Dashboard;
