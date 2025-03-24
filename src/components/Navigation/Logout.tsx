import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from 'contexts/AuthContextPocketbase';

const Logout = () => {
    const { logout } = useAuth();
    useEffect(() => {
        logout();
    }, []);

    return (<Navigate to="/" />);
}

export default Logout;