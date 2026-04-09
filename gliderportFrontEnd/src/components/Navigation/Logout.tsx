/**
 * @packageDocumentation Logout
 *
 * Component that logs out the current user and redirects to the home page.
 * Utilizes the AuthContext to perform logout side-effects on mount.
 */
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Logout component triggers the user logout process when mounted
 * and immediately navigates back to the root path.
 *
 * @component
 * @returns {React.ReactElement} Redirect to home after logout.
 */
export function Logout(): React.ReactElement {
    const { logout } = useAuth();

    /**
     * Call the logout function on component mount.
     * Note: `logout` should be stable (memoized) to avoid requiring it as a dependency.
     */
    useEffect(() => {
        logout();
    }, []);

    // Redirect to home after logout
    return <Navigate to="/" />;
};

export default Logout;
