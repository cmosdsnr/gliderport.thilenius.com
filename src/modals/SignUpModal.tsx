import React, { useState, useEffect } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import Modal from 'react-modal'
import useLogin from 'hooks/useLogin'
import useSignUp from 'hooks/useSignUp'
import OnClickLink from './OnClickLink'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom'
import { useModal, ModalType } from './Modals'

import { useAuth } from '@/contexts/AuthContext'
import * as yup from 'yup'
import { R } from 'framer-motion/dist/types.d-B50aGbjN'

/**
 * SignUpModal component renders a modal dialog for user registration.
 * Handles form validation, sign up, login, and verification logic.
 *
 * @component
 * @returns {React.ReactElement} The rendered modal for signing up.
 */
export function SignUpModal(): React.ReactElement {

    const { mutate: signUp, isLoading, isSuccess, isError, reset: signUpReset } = useSignUp()
    const { mutate: login, isSuccess: loginSuccess } = useLogin();
    const { sendVerification, pb } = useAuth();
    const navigate = useNavigate();
    const { openModal, closeModal } = useModal();

    const validationSchema = yup.object().shape({
        name: yup.string().matches(/[A-z]* [A-z]*/, "Enter first and last name").required(),
        email: yup.string().email().required(),
        password: yup.string().min(8)
            .required('Password is required'),
        passwordConfirm: yup.string()
            .required('Confirm Password is required')
            .oneOf([yup.ref('password'), null] as any[], 'Passwords does not match'),
    });

    const { register,
        handleSubmit,
        reset,
        formState: { errors } } = useForm({
            resolver: yupResolver(validationSchema)
        })

    useEffect(() => {
        if (isError) console.log("signUp error")
    }, [isError])


    useEffect(() => {
        console.log("signUp modal")
    }, [])


    /**
     * Handles the sign up form submission.
     * @param data - The form data containing name, email, password, and password confirmation.
     */
    async function onSignUpSubmit(data: any) {
        await signUp(data);
        if (isSuccess) {
            sendVerification(data.email)
            reset()
            await login(data.email, data.password);
            if (pb.authStore.isValid) {
                closeModal();
                if (pb.authStore!.model!.verified)
                    navigate("/dashboard");
                else
                    navigate("/verify");
            }

        }
    }

    return (
        <Modal
            onRequestClose={() => closeModal()}
            className={"modals"}
            isOpen={true}
        >
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Sign Up</h2>

                    {isError && <Alert variant="danger">Failed to create account</Alert>}
                    {/* {signUp.isSuccess && <Alert variant="success">New account created</Alert>}
                        {signUp.isError && <Alert variant="danger">{signUp.error}</Alert>} */}
                    <Form className="FormErrors" onSubmit={handleSubmit(onSignUpSubmit)}>
                        <Form.Group id="name">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control type="text" {...register('name')} />
                            {errors.name && <p>{errors.name.message as string}</p>}
                        </Form.Group>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" {...register('email')} />
                            {errors.email && <p>{errors.email.message as string}</p>}
                        </Form.Group>
                        <Form.Group id="password">
                            <Form.Label>password</Form.Label>
                            <Form.Control type="password" {...register('password')} />
                            {errors.password && <p>{errors.password.message as string}</p>}
                        </Form.Group>
                        <Form.Group id="password-confirm">
                            <Form.Label>password-confirm</Form.Label>
                            <Form.Control type="password" {...register('passwordConfirm')} />
                            {errors.passwordConfirm && <p>{errors.passwordConfirm.message as string}</p>}
                        </Form.Group>
                        <Button disabled={isLoading} className="w-100" type="submit" style={{ marginTop: '20px' }}>Sign Up</Button>
                    </Form>
                </Card.Body>

                <div className="w-100 text-center mt-3">
                    Already have an account? <OnClickLink fn={() => openModal(ModalType.Login)}>Login</OnClickLink>
                </div>
            </Card>
        </Modal>
    )
}
export default SignUpModal;