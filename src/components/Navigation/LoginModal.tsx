import React, { useRef, useState, useEffect } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { Link, useHistory } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Modal from "react-modal"

Modal.setAppElement('#root')

export const Login = ({ setShowLoginModal }: { setShowLoginModal: (show: boolean) => void }) => {
    setShowLoginModal(true)
    useHistory().push("/")
    return (<></>)
}
export const SignUp = ({ setShowSignUpModal }: { setShowSignUpModal: (show: boolean) => void }) => {
    setShowSignUpModal(true)
    useHistory().push("/")
    return (<></>)
}

export const Logout = () => {
    const { logout } = useAuth()
    const history = useHistory()
    async function handleLogout() {
        try {
            await logout()
            history.push('/Home')
        } catch {
        }
    }
    handleLogout()
    return (<></>)
}

interface LoginModalProps {
    modalIsOpen: boolean;
    setModalIsOpen: (isOpen: boolean) => void;
    openSignUpModal: () => void;
}

export default function LoginModal({ modalIsOpen, setModalIsOpen, openSignUpModal }: LoginModalProps) {
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const { login } = useAuth();
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const history = useHistory();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        if (emailRef.current && passwordRef.current) {
            e.preventDefault()
            try {
                setError('')
                setLoading(true)
                await login(emailRef.current.value, passwordRef.current.value)
                setModalIsOpen(false)
                history.push("/")
            } catch {
                setError('Failed to log in')
            }
            setLoading(false)
        }
    }

    const handleSignUp = () => {
        setModalIsOpen(false);
        openSignUpModal();
    }
    const handleCloseThis = () => {
        setModalIsOpen(false);
    }

    useEffect(() => {
        // setModalIsOpen(true)
        // console.log(modalIsOpen)
        return () => { }
    }, [])


    return (
        <div>
            {/* <div>test</div>
            <button onClick={() => setModalIsOpen(true)}>Open  Modal</button> */}

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
                        <h2 className="text-center mb-4">Login</h2>

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
                            <Button disabled={loading} className="w-100" type="submit" style={{ marginTop: '20px' }}>Login</Button>
                        </Form>
                        <div className="w-100 text-center mt-3">
                            <Link onClick={handleCloseThis} to="/forgot-password">Forgot Password?</Link>
                        </div>
                        <div className="w-100 text-center mt-2">
                            Need an Account? <div onClick={handleSignUp} style={{ color: '#0000EE', cursor: 'pointer' }}><u>Sign Up</u></div>
                        </div>
                    </Card.Body>
                </Card>

                {/* <button onClick={() => setModalIsOpen(false)}>Close</button> */}
            </Modal>
        </div>
    )
}
