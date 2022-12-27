import React from 'react'
import { Route, Redirect } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function PrivateRoute({ component: Component, ...rest }) {
    const { currentUser } = useAuth()
    return (
        <div>
            <Route
                {...rest}
                render={props => {
                    return typeof currentUser === 'undefined' ? (
                        <h1>Loading.....</h1>
                    ) : currentUser ? (
                        <Component {...props} />
                    ) : (
                        <Redirect to="/login" />
                    )
                }}
            >
            </Route>
        </div>
    )
}

