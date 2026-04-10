import React, { useState, useEffect } from 'react'
import { Form, Button, Card } from 'react-bootstrap'
import Modal from 'react-modal'
import OnClickLink from './OnClickLink'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'
import { useModal, ModalType } from './Modals'

/**
 * ForgotPasswordModal component allows users to reset their password.
 * It provides a form for email input and handles password reset logic.
 * It also includes links for login and sign-up.
 *
 * @component
 * @returns {React.ReactElement} Modal for password reset.
 */
export function ForgotPasswordModal() {
    const { register, handleSubmit } = useForm()
    const { resetPassword } = useAuth();
    const { openModal, closeModal } = useModal();

    /**
     * Handles password-reset form submission. Closes the modal and triggers a
     * reset email via the auth context. Intended for users who are not
     * currently logged in.
     *
     * @param data - Form values provided by react-hook-form, containing the
     *   `email` field to send the reset link to.
     */
    async function onResetPasswordSubmit(data: any) {
        closeModal()
        resetPassword(data.email)
        closeModal() // trigger redraw
    }

    return (
        <Modal
            onRequestClose={() => closeModal()}
            className={"modals"}
            isOpen={true}
        >
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Password Reset</h2>
                    <Form onSubmit={handleSubmit(onResetPasswordSubmit)}>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" {...register('email')} required />
                        </Form.Group>
                        <Button disabled={false} className="w-100" type="submit" style={{ marginTop: '20px' }}>Reset Password</Button>
                    </Form>
                    <OnClickLink fn={() => openModal(ModalType.Login)}>Login</OnClickLink>
                </Card.Body>
            </Card>
            <div className="w-100 text-center mt-2">
                Need an Account? <OnClickLink fn={() => openModal(ModalType.SignUp)}>Sign Up</OnClickLink>
            </div>
        </Modal>
    )
}
export default ForgotPasswordModal;