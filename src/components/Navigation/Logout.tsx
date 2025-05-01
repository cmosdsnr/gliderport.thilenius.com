import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext';

const Logout = () => {
    const { logout } = useAuth();
    useEffect(() => {
        logout();
    }, []);

    return (<Navigate to="/" />);
}

export default Logout;