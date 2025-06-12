/**
 * Main application component.
 *
 * Sets up authentication, data, and modal context providers,
 * configures client-side routing, and renders global navigation
 * and page components inside a responsive container.
 *
 * @packageDocumentation App
 */
import React, { useState } from 'react'
import { Container } from 'react-bootstrap'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'

import { AuthProvider } from '@/contexts/AuthContext'
import { DataProvider } from '@/contexts/DataContext'

import Modals, { ModalProvider } from 'modals/Modals'

import Dashboard from 'components/Dashboard'
import PrivateRoute from 'components/Navigation/PrivateRoute'
import MessageBoard from 'components/Messages/MessageBoard'
import UpdateProfile from 'components/UpdateProfile'
import Forecast from 'components/Forecast'
import Equipment from 'components/Equipment'
import GpNavbar from 'components/Navigation/GpNavbar'
import Home from 'components/Home/Home'

import Stats from 'components/Stats/Stats'
import StatsImageComponent from 'components/Stats/StatsImage'
import StatsHitsComponent from 'components/Stats/StatsHits'
import StatsChangeLogComponent from 'components/Stats/StatsChangeLog'
import StatsUsefulLinksComponent from 'components/Stats/StatsUsefulLinks'

import Contribute from 'components/Contribute'
import Contact from 'components/Contact'
import Diagnostics from 'components/Diagnostics'

import ListEndpoints from 'components/Admin/ListEndpoints'
import Host from 'components/Admin/Host'
import InfoDisplay from 'components/Admin/Information'
import Debug from 'components/Admin/Debug'
import { MessageProvider, MessageLogger } from 'components/Admin/MessageLogger'

import Logout from 'components/Navigation/Logout'
import { pageName } from 'components/paths'
import 'css/style.css'

// Set the document title from environment variable
// VITE_PAGE_NAME should be defined in .env
document.title = pageName || 'Gliderport';

/**
 * Top-level React component for the application.
 *
 * @returns {JSX.Element} The application root.
 */
export function App(): React.ReactElement {
    // const App: React.FC = (): React.ReactElement => {
    return (
        <AuthProvider>
            <MessageProvider>
                {/* WebSocket message logger context */}
                <DataProvider>
                    <Router>
                        <ModalProvider>
                            {/* Global modal container */}
                            <Modals />
                            {/* Main navigation bar */}
                            <GpNavbar />
                            <Container fluid>
                                <Routes>
                                    {/* Redirect root to /home */}
                                    <Route path="/" element={<Navigate to="/home" replace />} />
                                    <Route path="/home" element={<Home />} />

                                    {/* Admin Routes */}
                                    <Route path="/admin/listEndpoints" element={<PrivateRoute><ListEndpoints /></PrivateRoute>} />
                                    <Route path="/admin/host" element={<PrivateRoute><Host /></PrivateRoute>} />
                                    <Route path="/admin/information" element={<PrivateRoute><InfoDisplay /></PrivateRoute>} />
                                    <Route path="/admin/debug" element={<Debug />} />
                                    <Route path="/admin/messages" element={<PrivateRoute><MessageLogger /></PrivateRoute>} />

                                    {/* Statistics Routes */}
                                    <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
                                    <Route path="/stats/images" element={<PrivateRoute><StatsImageComponent /></PrivateRoute>} />
                                    <Route path="/stats/hits" element={<PrivateRoute><StatsHitsComponent /></PrivateRoute>} />
                                    <Route path="/stats/changes" element={<PrivateRoute><StatsChangeLogComponent /></PrivateRoute>} />
                                    <Route path="/stats/links" element={<PrivateRoute><StatsUsefulLinksComponent /></PrivateRoute>} />

                                    {/* Public and Private Pages */}
                                    <Route path="/forecast" element={<Forecast />} />
                                    <Route path="/equipment" element={<PrivateRoute><Equipment /></PrivateRoute>} />
                                    <Route path="/blog" element={<PrivateRoute><MessageBoard /></PrivateRoute>} />
                                    <Route path="/contact" element={<Contact />} />
                                    <Route path="/contribute" element={<PrivateRoute><Contribute /></PrivateRoute>} />
                                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                                    <Route path="/diagnostics" element={<Diagnostics />} />
                                    <Route path="/update-profile" element={<PrivateRoute><UpdateProfile /></PrivateRoute>} />
                                    <Route path="/logout" element={<PrivateRoute><Logout /></PrivateRoute>} />
                                </Routes>
                            </Container>
                        </ModalProvider>
                    </Router>
                </DataProvider>
            </MessageProvider>
        </AuthProvider>
    )
}
export default App
