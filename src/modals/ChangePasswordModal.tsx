import React, { useState } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import Modal from 'react-modal';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useModal, ModalType } from './Modals';
import { useAuth } from '@/contexts/AuthContext';

// Validation schema for password change.
const validationSchema = yup.object().shape({
    password: yup
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .required('Password is required'),
    passwordConfirm: yup
        .string()
        .oneOf([yup.ref('password'), null] as any[], 'Passwords do not match')
        .required('Please confirm your password'),
});


export default function ChangePasswordModal() {
    const { closeModal } = useModal();
    const { pb } = useAuth();
    const [error, setError] = useState<string>('');

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(validationSchema)
    });

    async function onSubmit(data: any) {
        setError('');
        if (pb.authStore?.record) {
            try {
                // Update the currently logged in user's password.
                // Make sure pb.authStore.model.id exists and the user is authenticated.

                await pb.collection('users').update(pb.authStore.record.id, {
                    password: data.password,
                    passwordConfirm: data.passwordConfirm,
                });
                reset();
                closeModal();
            } catch (err: any) {
                console.error("Error changing password:", err);
                setError('Failed to change password.');
            }
        }
    }

    return (
        <Modal
            onRequestClose={() => closeModal()}
            className="modals"
            isOpen={true}
        >
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Change Password</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit(onSubmit)}>
                        <Form.Group id="password">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control type="password" {...register('password')} />
                            {errors.password && <p>{errors.password.message as string}</p>}
                        </Form.Group>
                        <Form.Group id="password-confirm" className="mt-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control type="password" {...register('passwordConfirm')} />
                            {errors.passwordConfirm && <p>{errors.passwordConfirm.message as string}</p>}
                        </Form.Group>
                        <Button variant="primary" className="w-100 mt-4" type="submit">
                            Change Password
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </Modal>
    );
}
