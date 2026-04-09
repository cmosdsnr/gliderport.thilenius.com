import React, { useState, useEffect } from 'react'
import { Form, Button, Card } from 'react-bootstrap'
import Modal from 'react-modal'
import { useForm } from 'react-hook-form'
import useChangeEmail from 'hooks/useChangeEmail'
import { useModal } from './Modals'

/**
 * ChangeEmailModal component allows users to change their email address.
 * It provides a form for email input and handles email change logic.
 *
 * @component
 * @returns {React.ReactElement} Modal for changing email.
 */
export function ChangeEmailModal(): React.ReactElement {

    const { register, handleSubmit } = useForm()
    const { mutate: changeEmail, isLoading } = useChangeEmail()
    const { closeModal } = useModal();

    async function onChangeEmailSubmit(data: any) {
        closeModal()
        changeEmail(data.email)
    }

    return (
        <Modal
            onRequestClose={() => closeModal()}
            className={"modals"}
            isOpen={true}
        >
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Change Email Form</h2>

                    <Form onSubmit={handleSubmit(onChangeEmailSubmit)}>
                        <Form.Group id="email">
                            <Form.Label>New Email:</Form.Label>
                            <Form.Control type="email" {...register('email')} required />
                        </Form.Group>
                        <Button disabled={isLoading} className="w-100" type="submit" style={{ marginTop: '20px' }}>Change</Button>
                    </Form>
                </Card.Body>
            </Card>
        </Modal>

    )
}
export default ChangeEmailModal;