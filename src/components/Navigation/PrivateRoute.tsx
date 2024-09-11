import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PrivateRouteProps extends Omit<RouteProps, 'component'> {
    component: React.ComponentType<any>;
}

export default function PrivateRoute({ component: Component, ...rest }: PrivateRouteProps) {
    const { currentUser } = useAuth();

    return (
        <Route
            {...rest}
            render={(props) =>
                typeof currentUser === 'undefined' ? (
                    <h1>Loading.....</h1>
                ) : currentUser ? (
                    <Component {...props} />
                ) : (
                    <Redirect to="/login" />
                )
            }
        />
    );
}

