/**
 * @packageDocumentation
 *
 * Main navigation bar for the Gliderport application.
 *
 * Exports {@link GpNavbar} as the primary component together with the
 * helper {@link MyFontAwesomeIcon} sub-component and the {@link Page}
 * configuration interface.
 *
 * Navigation structure:
 * - **Public links** — Home, Forecast, Contact (always visible).
 * - **Stats dropdown** — Images, Hits, Changes, Links (signed-in users only).
 * - **Account dropdown** — Dashboard, Equipment, Contribute, Blog, Logout
 *   (signed-in users only).
 * - **Admin dropdown** — Endpoints, Server Info, Messages, Debug,
 *   DB Archive, and TypeDoc links for all three server projects
 *   (visible only to users whose role is `"Administrator"`).
 * - **Login / Sign-up** — Opens the respective modal when no user
 *   session is active.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faDonate,
    faInfoCircle,
    faPhone,
    faWind,
    faSignInAlt,
    faUserPlus,
    faUser,
    faUserShield,
    faTachometerAlt,
    faWrench,
    faNewspaper,
    faSignOutAlt,
    faImage,
    faChartBar,
    faHistory,
    faNetworkWired,
    faServer,
    faEnvelope,
    faBook,
    faBug,
    faDatabase,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/AuthContext';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { useModal, ModalType } from 'modals/Modals';

import paraglider from 'images/paraglider.png';
import banner from 'images/banner.jpg';
import { useWindow } from 'hooks/useWindow';
import { API } from '@/api';

/**
 * Conditionally renders a FontAwesome icon based on window width.
 * Icons are shown if width > 950px or < 768px.
 *
 * @param icon - Icon definition to render.
 * @param inverse - Optional inverse color flag.
 * @returns JSX element or null.
 */
export const MyFontAwesomeIcon: React.FC<{ icon: IconDefinition; inverse?: boolean }> = ({ icon, inverse = false }) => {
    const width = useWindow();
    const showIcons = width > 950 || width < 768;
    return <>{showIcons && <FontAwesomeIcon icon={icon} inverse={inverse} />}</>;
};

/**
 * Configuration for navigation pages.
 */
export interface Page {
    icon: IconDefinition;
    name: string;
    /** Show when user is logged in */
    loggedIn?: boolean;
    /** Show when user is logged out */
    loggedOut?: boolean;
    /** Show only for admin role */
    admin?: boolean;
}

/**
 * Main application navigation bar.
 *
 * Renders a Bootstrap `Navbar` containing the paraglider brand logo, a
 * responsive hamburger toggler (collapses at lg), and the full set of
 * navigation links. Authentication state (from {@link useAuth}) determines
 * which items are shown.
 *
 * The navbar background image animates by shifting its `background-position`
 * on a 100 ms interval, cycling through a 500 px offset range.
 *
 * @returns The rendered Bootstrap Navbar element.
 */
export function GpNavbar(): React.ReactElement {
    const [bannerStyle, setBannerStyle] = useState<string>('-500px 500px');
    const [bannerTimer, setBannerTimer] = useState<number>(0);
    const { openModal } = useModal();
    const { currentUser } = useAuth();

    /**
     * Animates the navbar banner background by shifting its `background-position`
     * on a 100 ms interval, cycling from `-500px 500px` back to `0px 0px`.
     * Clears the interval when the component unmounts.
     */
    useEffect(() => {
        if (!bannerTimer) {
            let pos = 500;
            const timer = window.setInterval(() => {
                pos = pos > 0 ? pos - 1 : 500;
                setBannerStyle(`-${pos}px ${pos}px`);
            }, 100);
            setBannerTimer(timer);
        }
        return () => {
            if (bannerTimer) clearInterval(bannerTimer);
        };
    }, [bannerTimer]);

    return (
        <Navbar
            expand="lg"
            id="myContainer"
            style={{ backgroundPosition: bannerStyle, backgroundImage: `url(${banner})` }}
        >
            <Navbar.Brand as={Link} to="/">
                <img alt="Paraglider logo" src={paraglider} width={40} />
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="mr-auto">
                    {/* Public links — always visible */}
                    <Nav.Link as={Link} to="/home">
                        <FontAwesomeIcon icon={faHome} /> Home
                    </Nav.Link>
                    <Nav.Link as={Link} to="/forecast">
                        <FontAwesomeIcon icon={faWind} /> Forecast
                    </Nav.Link>
                    <Nav.Link as={Link} to="/contact">
                        <FontAwesomeIcon icon={faPhone} /> Contact
                    </Nav.Link>

                    {/* Signed-in links */}
                    {currentUser && (
                        <>
                            <NavDropdown
                                title={<><FontAwesomeIcon icon={faInfoCircle} /> Stats</>}
                                id="stats-nav-dropdown"
                            >
                                <NavDropdown.Item as={Link} to="/stats/images">
                                    <FontAwesomeIcon icon={faImage} fixedWidth /> Images
                                </NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/stats/hits">
                                    <FontAwesomeIcon icon={faChartBar} fixedWidth /> Hits
                                </NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/stats/changes">
                                    <FontAwesomeIcon icon={faHistory} fixedWidth /> Changes
                                </NavDropdown.Item>
                            </NavDropdown>

                            <NavDropdown
                                title={<><FontAwesomeIcon icon={faUser} /> Account</>}
                                id="account-nav-dropdown"
                            >
                                <NavDropdown.Item as={Link} to="/dashboard">
                                    <FontAwesomeIcon icon={faTachometerAlt} fixedWidth /> Dashboard
                                </NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/equipment">
                                    <FontAwesomeIcon icon={faWrench} fixedWidth /> Equipment
                                </NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/contribute">
                                    <FontAwesomeIcon icon={faDonate} fixedWidth /> Contribute
                                </NavDropdown.Item>
                                <NavDropdown.Item as={Link} to="/blog">
                                    <FontAwesomeIcon icon={faNewspaper} fixedWidth /> Blog
                                </NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item as={Link} to="/logout">
                                    <FontAwesomeIcon icon={faSignOutAlt} fixedWidth /> Log Out
                                </NavDropdown.Item>
                            </NavDropdown>
                        </>
                    )}

                    {/* Admin dropdown */}
                    {currentUser?.role === 'Administrator' && (
                        <NavDropdown
                            title={<><FontAwesomeIcon icon={faUserShield} /> Admin</>}
                            id="admin-nav-dropdown"
                        >
                            <NavDropdown.Item as={Link} to="/admin/listEndpoints">
                                <FontAwesomeIcon icon={faNetworkWired} fixedWidth /> Endpoints
                            </NavDropdown.Item>
                            <NavDropdown.Item as={Link} to="/admin/information">
                                <FontAwesomeIcon icon={faServer} fixedWidth /> Server Info
                            </NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item as={Link} to="/admin/Messages">
                                <FontAwesomeIcon icon={faEnvelope} fixedWidth /> Messages
                            </NavDropdown.Item>
                            <NavDropdown.Item href={API.docs.backend()} target="_blank" rel="noopener noreferrer">
                                <FontAwesomeIcon icon={faBook} fixedWidth /> Backend Docs
                            </NavDropdown.Item>
                            <NavDropdown.Item href={API.docs.frontend()} target="_blank" rel="noopener noreferrer">
                                <FontAwesomeIcon icon={faBook} fixedWidth /> Frontend Docs
                            </NavDropdown.Item>
                            <NavDropdown.Item href={API.docs.pi3Server()} target="_blank" rel="noopener noreferrer">
                                <FontAwesomeIcon icon={faBook} fixedWidth /> Pi3 Server Docs
                            </NavDropdown.Item>
                            <NavDropdown.Item href={API.docs.mobileApp()} target="_blank" rel="noopener noreferrer">
                                <FontAwesomeIcon icon={faBook} fixedWidth /> Mobile App Docs
                            </NavDropdown.Item>
                            <NavDropdown.Item as={Link} to="/admin/Debug">
                                <FontAwesomeIcon icon={faBug} fixedWidth /> Debug
                            </NavDropdown.Item>
                            <NavDropdown.Item as={Link} to="/admin/archive">
                                <FontAwesomeIcon icon={faDatabase} fixedWidth /> DB Archive
                            </NavDropdown.Item>
                        </NavDropdown>
                    )}

                    {/* Auth actions — logged out */}
                    {!currentUser && (
                        <>
                            <div className="nav-auth-action" onClick={() => openModal(ModalType.Login)}>
                                <FontAwesomeIcon icon={faSignInAlt} /> Login
                            </div>
                            <div className="nav-auth-action" onClick={() => openModal(ModalType.SignUp)}>
                                <FontAwesomeIcon icon={faUserPlus} /> Sign Up
                            </div>
                        </>
                    )}
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
}

export default GpNavbar;
