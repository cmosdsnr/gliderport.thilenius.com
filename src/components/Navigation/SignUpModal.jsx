import React, { useRef, useState } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import Modal from "react-modal"
import { useAuth } from '../../contexts/AuthContext'
import { useHistory } from 'react-router-dom'

export default function SignUpModal({ modalIsOpen, setModalIsOpen, setShowLoginModal }) {
    const emailRef = useRef()
    const passwordRef = useRef()
    const passwordConfirmRef = useRef()
    const { signup } = useAuth()
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const history = useHistory()


    const openLoginModal = () => {
        setShowLoginModal(true)
        setModalIsOpen(false)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        console.log(passwordRef.current.value)
        if (passwordConfirmRef.current.value !== passwordRef.current.value) {
            return setError('Passwords do not match')
        }
        try {
            setError('')
            setLoading(true)
            await signup(emailRef.current.value, passwordRef.current.value)
            history.push("/")
            setModalIsOpen(false)
        } catch {
            setError('Failed to create an Account')
        }
        setLoading(false)
    }

    return (
        <div>
            <Modal
                className='login-modal'
                isOpen={modalIsOpen}
                onRequestClose={() => setModalIsOpen(false)}
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
                        <h2 className="text-center mb-4">Sign Up</h2>

                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group id="email">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" ref={emailRef} required />
                            </Form.Group>
                            <Form.Group id="password">
                                <Form.Label>password</Form.Label>
                                <Form.Control type="password" ref={passwordRef} required />
                            </Form.Group>
                            <Form.Group id="password-confirm">
                                <Form.Label>password-confirm</Form.Label>
                                <Form.Control type="password" ref={passwordConfirmRef} required />
                            </Form.Group>
                            <Button disabled={loading} className="w-100" type="submit" style={{ marginTop: '20px' }}>Sign Up</Button>
                        </Form>
                    </Card.Body>

                    <div
                        className="w-100 text-center mt-3"
                        onClick={openLoginModal}
                        style={{ color: '#0000EE', cursor: 'pointer' }}
                    >
                        Already have an account? <u>Login</u>
                    </div>
                </Card>

            </Modal>
        </div>
    )
}
