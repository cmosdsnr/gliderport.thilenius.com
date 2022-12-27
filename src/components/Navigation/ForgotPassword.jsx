import React, { useRef, useState } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { useAuth } from '../../contexts/AuthContext'

export default function ForgotPassword({ showSignUpModal, setShowSignUpModal, showLoginModal, setShowLoginModal }) {
    const emailRef = useRef()
    const { resetPassword } = useAuth()
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    const openLoginModal = () => { setShowLoginModal(true) }
    const openSignUpModal = () => { setShowSignUpModal(true) }

    async function handleSubmit(e) {
        e.preventDefault()
        try {
            setMessage('')
            setError('')
            setLoading(true)
            await resetPassword(emailRef.current.value)
            setMessage('Check your inbox for password reset')
        } catch {
            setError('Failed to reset password')
        }
        setLoading(false)
    }

    return (
        <div>
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Password Reset</h2>
                    {message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" ref={emailRef} required />
                        </Form.Group>
                        <Button disabled={loading} className="w-100" type="submit" style={{ marginTop: '20px' }}>Reset Password</Button>
                    </Form>
                    <div
                        className="w-100 text-center mt-3"
                        onClick={openLoginModal}
                        style={{ color: '#0000EE', cursor: 'pointer' }}
                    >
                        <u>Login</u>
                    </div>
                </Card.Body>
            </Card>
            <div className="w-100 text-center mt-2">
                Need an Account? <span onClick={openSignUpModal} style={{ color: '#0000EE', cursor: 'pointer' }}><u>Sign Up</u></span>
            </div>
        </div>
    )
}
