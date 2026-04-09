import React, { useState, useEffect } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import Modal from 'react-modal'
// import useLogin from 'hooks/useLogin'
import OnClickLink from './OnClickLink'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useModal, ModalType } from './Modals'
import './modals.css'
import mySvg from 'images/314px-Google__G__Logo.svg_-294x300.png'

/** 
 * LoginModal component provides a login form for users to authenticate.
 * It includes fields for email and password, handles login logic,              
 * and integrates Google login functionality.
 * It also provides links for password reset and sign-up.
 * @component
 * @returns {React.ReactElement} Modal for user login.
 **/
function LoginModal(): React.ReactElement {
    const [isError, setIsError] = useState(false);
    // const { mutate: login, isLoading, isSuccess, isError, reset: loginReset } = useLogin()
    const { register, handleSubmit, formState: { errors } } = useForm()
    const navigate = useNavigate();
    const { googleLogin, login, pb } = useAuth();
    const { openModal, closeModal } = useModal();

    const onLogin = async (data: any) => {
        setIsError(false);
        try {
            await login(data.email, data.password);
        } catch (error) {
            console.log("error: ", error);
            setIsError(true);
            return;
        }
        console.log("onLogin: isLoggedIn:", pb.authStore.isValid, "verified:", pb.authStore.model?.verified);
        if (pb.authStore.isValid) {
            closeModal();
            if (pb.authStore.model?.verified)
                navigate("/dashboard");
            else
                navigate("/verify");

        } else {
            setIsError(true);
        }
    }

    const handleGoogleLogin = async () => {
        setIsError(false);
        await googleLogin();
        console.log("handleGoogleLogin: isLoggedIn:", pb.authStore.isValid, "verified:", pb.authStore.model?.verified);
        if (pb.authStore.isValid) {
            closeModal();
            if (pb.authStore.model?.verified)
                navigate("/dashboard");
            else
                navigate("/verify");

        } else {
            setIsError(true);
        }
    }

    return (
        <Modal
            onRequestClose={() => closeModal()}
            style={{ overlay: { backgroundColor: 'rgba(255, 255, 255, 0.5)' } }}
            className={"modals"}
            isOpen={true}
        >
            <Card style={{ backgroundColor: 'lightblue' }}>
                <Card.Body>
                    <h2 className="text-center mb-4">Login</h2>
                    <div style={{ backgroundColor: 'pink', padding: '10px', marginBottom: '10px' }}>
                        <p>IF YOU HAD A LOGIN HERE, YOUR PASSWORD HAS BEEN RESET TO TempPassword123! </p>
                        <p>Please login and reset you password</p>
                    </div>
                    {isError && <Alert variant="danger">Invalid Email or Password</Alert>}
                    <Form onSubmit={handleSubmit(onLogin)}>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                className={errors.email && 'warn'}
                                type="email"
                                {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
                                required
                            />
                            {errors.email && <p className='error'>Must be a valid Email address</p>}
                        </Form.Group>
                        <Form.Group id="password">
                            <Form.Label>password</Form.Label>
                            <Form.Control
                                className={errors.password && 'warn'}
                                type="password"
                                {...register('password', { required: true, pattern: /^.{8,}$/i })}
                                required
                            />
                            {errors.password && <p className='error'>Password must be 8 or more characters</p>}
                        </Form.Group>
                        <Button className="w-100" type="submit" style={{ marginTop: '20px' }}>Login</Button>
                    </Form>
                    <div className="w-100 text-center mt-3">
                        <OnClickLink fn={() => openModal(ModalType.ResetPassword)}>Forgot Password?</OnClickLink>
                    </div>
                    <div className="w-100 text-center mt-2">
                        Need an Account? <OnClickLink fn={() => openModal(ModalType.SignUp)}>Sign Up</OnClickLink>
                    </div>
                    <div style={{ marginTop: '20px' }} className="w-100 text-center mt-2"><b>OR</b></div>
                    <Button className="w-100" onClick={async () => handleGoogleLogin()}><img src={mySvg} style={{ width: "30px", marginRight: "20px" }} alt="Google Logo" /> Sign in with Google</Button>

                </Card.Body>
            </Card>
        </Modal>
    )
}

export default LoginModal;