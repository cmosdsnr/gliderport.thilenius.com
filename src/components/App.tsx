import React, { useState } from 'react'
import { Container } from 'react-bootstrap'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'

import { AuthProvider } from '@/contexts/AuthContext'
import { DataProvider } from 'contexts/DataContext'

import Modals, { ModalProvider } from 'modals/Modals';

import Dashboard from 'components/Dashboard'
import PrivateRoute from 'components/Navigation/PrivateRoute'
import MessageBoard from 'components/Messages/MessageBoard'
import UpdateProfile from 'components/UpdateProfile'
import Forecast from 'components/Forecast'
import Equipment from 'components/Equipment'
import Video from 'components/Video'
import GpNavbar from 'components/Navigation/GpNavbar'
import Home from 'components/Home/Home'

import Stats from 'components/Stats/Stats'
import StatsImageComponent from 'components/Stats/StatsImage';
import StatsHitsComponent from 'components/Stats/StatsHits';
import StatsChangeLogComponent from 'components/Stats/StatsChangeLog';
import StatsUsefulLinksComponent from 'components/Stats/StatsUsefulLinks';

import Contribute from 'components/Contribute'
import Contact from 'components/Contact'
import Diagnostics from 'components/Diagnostics'

import ListEndpoints from 'components/Admin/ListEndpoints'
import InfoDisplay from 'components/Admin/Information'
import Debug from 'components/Admin/Debug'
import { MessageProvider, MessageLoggerComponent } from 'components/Admin/MessageLogger'

import Logout from 'components/Navigation/Logout'
import 'css/style.css'

document.title = import.meta.env.VITE_PAGE_NAME

const App: React.FC = () => {
    return (
        <AuthProvider>
            <MessageProvider>  {/* web socket message logger */}
                <DataProvider>
                    <Router>
                        <ModalProvider>
                            <Modals />
                            <GpNavbar />
                            <Container fluid>
                                <Routes>
                                    <Route path="/" element={<Navigate to="/home" replace />} />
                                    <Route path="/home" element={<Home />} />

                                    <Route path="/admin/listEndpoints" element={<PrivateRoute><ListEndpoints /></PrivateRoute>} />
                                    <Route path="/admin/Information" element={<PrivateRoute><InfoDisplay /></PrivateRoute>} />
                                    <Route path="/admin/Debug" element={<PrivateRoute><Debug /></PrivateRoute>} />
                                    <Route path="/admin/Messages" element={<PrivateRoute><MessageLoggerComponent /></PrivateRoute>} />

                                    <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
                                    <Route path="/stats/images" element={<PrivateRoute><StatsImageComponent /></PrivateRoute>} />
                                    <Route path="/stats/hits" element={<PrivateRoute><StatsHitsComponent /></PrivateRoute>} />
                                    <Route path="/stats/changes" element={<PrivateRoute><StatsChangeLogComponent /></PrivateRoute>} />
                                    <Route path="/stats/links" element={<PrivateRoute><StatsUsefulLinksComponent /></PrivateRoute>} />

                                    <Route path="/forecast" element={<PrivateRoute><Forecast /></PrivateRoute>} />
                                    <Route path="/equipment" element={<PrivateRoute><Equipment /></PrivateRoute>} />
                                    <Route path="/blog" element={<PrivateRoute><MessageBoard /></PrivateRoute>} />
                                    <Route path="/video" element={<PrivateRoute><Video /></PrivateRoute>} />
                                    <Route path="/contact" element={<Contact />} />
                                    <Route path="/contribute" element={<PrivateRoute><Contribute /></PrivateRoute>} />
                                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                                    <Route path="/diagnostics" element={<Diagnostics />} />
                                    <Route path="/update-profile" element={<PrivateRoute><UpdateProfile /></PrivateRoute>} />
                                    <Route path="/logout" element={<PrivateRoute><Logout /></PrivateRoute>} />
                                    {/* <Route path="/login" element={<PrivateRoute><Home /></PrivateRoute>} /> */}
                                </Routes>
                                {/* </div> */}
                            </Container>
                        </ModalProvider>
                    </Router>
                </DataProvider>
            </MessageProvider>
        </AuthProvider>
    )
}

export default App;
