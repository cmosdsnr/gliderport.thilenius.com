import React from 'react';
import { Route, Navigate, RouteProps } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModal, ModalType } from 'modals/Modals';

export default function PrivateRoute({ children }: any) {
    const { currentUser } = useAuth();
    const { openModal } = useModal();

    if (typeof currentUser === 'undefined') {
        return <h1>Loading.....</h1>;
    }

    if (!currentUser) {
        openModal(ModalType.Login);
        return <Navigate to="/home" replace />;
    }

    return <>{children}</>;
}
