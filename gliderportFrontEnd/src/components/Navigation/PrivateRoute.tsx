/**
 * @packageDocumentation PrivateRoute
 *
 * A route wrapper component that ensures only authenticated users can access
 * its child routes. Redirects unauthenticated users to the home page and
 * triggers a login modal when needed.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModal, ModalType } from 'modals/Modals';

/**
 * Props for PrivateRoute component.
 *
 * children - The protected component(s) to render.
 */
export interface PrivateRouteProps {
    children: React.ReactElement | React.ReactElement[];
}

/**
 * PrivateRoute component to guard routes requiring authentication.
 *
 * - If `currentUser` is undefined, it displays a loading message.
 * - If `currentUser` is null, it opens the login modal and redirects to `/home`.
 * - Otherwise, it renders its child components.
 *
 * @param props - Props containing the child element(s).
 * @returns {React.ReactElement} A React element based on authentication state.
 */
export function PrivateRoute({ children }: PrivateRouteProps): React.ReactElement {
    const { currentUser } = useAuth();
    const { openModal } = useModal();

    if (typeof currentUser === 'undefined') {
        // Authentication state is still loading
        return <h1>Loading...</h1>;
    }

    if (!currentUser) {
        // User is not authenticated: prompt login and redirect
        openModal(ModalType.Login);
        return <Navigate to="/home" replace />;
    }

    // User is authenticated: render protected content
    return <>{children}</>;
}

export default PrivateRoute;
