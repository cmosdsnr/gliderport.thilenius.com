import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

interface Props {
    show: boolean;
    onHide: () => void;
}

export function AndroidBetaModal({ show, onHide }: Props): React.ReactElement {
    const subject = encodeURIComponent('Gliderport Android Beta — Gmail Address');
    const body = encodeURIComponent(
        'Hi Stephen,\n\nI\'d like to test the Gliderport Android app.\n'
    );
    const gmailHref = `https://mail.google.com/mail/?view=cm&to=Stephen%40Thilenius.com&su=${subject}&body=${body}`;

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Test the Android App</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    The app is currently in beta testing via Google Play. To get access, Google
                    requires your <strong>Gmail address</strong> so I can add you as a tester.
                </p>
                <p>
                    Please send me your Gmail address by <strong>text or email</strong>:
                </p>
                <ul>
                    <li>Text / call: <strong>(530) 613-5388</strong></li>
                    <li>Email: <strong>Stephen@Thilenius.com</strong></li>
                </ul>
                <p className="mb-0 text-muted" style={{ fontSize: '0.85rem' }}>
                    Once I add you, you'll receive a Play Store invite link to install the app.
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
                <Button variant="primary" href={gmailHref} target="_blank" rel="noopener noreferrer">
                    Email Me Your Gmail Address
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
