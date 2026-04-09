/**
 * @packageDocumentation
 * UpdateProfile page for the Gliderport application.
 * Allows the user to update their email and/or password.
 */
import React, { useRef, useState } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { useAuth } from '@/contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'

/**
 * UpdateProfile component allows the user to update their email and/or password.
 * @returns {React.ReactElement} The rendered update profile form.
 */
export function UpdateProfile(): React.ReactElement {
    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const passwordConfirmRef = useRef<HTMLInputElement>(null)
    const { currentUser, changeEmail, changePassword } = useAuth()
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (passwordConfirmRef.current && passwordRef.current && passwordConfirmRef.current.value !== passwordRef.current.value) {
            return setError('Passwords do not match')
        }

        const promises = []
        if (emailRef.current && emailRef.current.value !== currentUser?.email) {
            promises.push(changeEmail(emailRef.current.value))
        }
        if (passwordRef.current?.value) {
            promises.push(changePassword(passwordRef.current.value))
        }
        Promise.all(promises).then(() => {
            navigate('/')
        }).catch(() => {
            setError('Failed to update account')
        }).finally(() => {
            setLoading(false)
        })

    }

    return (
        <div>
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Update Profile</h2>

                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" ref={emailRef} required defaultValue={currentUser?.email!} />
                        </Form.Group>
                        <Form.Group id="password">
                            <Form.Label>password</Form.Label>
                            <Form.Control type="password" ref={passwordRef} placeholder='leave blank to keep the same' />
                        </Form.Group>
                        <Form.Group id="password-confirm">
                            <Form.Label>password-confirm</Form.Label>
                            <Form.Control type="password" ref={passwordConfirmRef} placeholder='leave blank to keep the same' />
                        </Form.Group>
                        <Button disabled={loading} className="w-100" type="submit" style={{ marginTop: '20px' }}>Update</Button>
                    </Form>
                </Card.Body>
            </Card>
            <div className="w-100 text-center mt-2">
                <Link to='/'>Cancel</Link>
            </div>
        </div>
    )
}

export default UpdateProfile;
