/**
 * @packageDocumentation GpNavbar
 *
 * Main navigation bar component for the Gliderport application.
 * Renders brand logo, responsive menu toggler, and navigation links.
 * Handles user authentication state to display appropriate menu items,
 * including admin and stats dropdowns, and login/sign-up modals.
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
    faTty,
    faAtom,
    faWind,
    faSignInAlt,
    faSignOutAlt,
    faUserPlus
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/AuthContext';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { useModal, ModalType } from 'modals/Modals';

import paraglider from 'images/paraglider.png';
import banner from 'images/banner.jpg';
import { useWindow } from 'hooks/useWindow';
import { serverUrl } from "@/components/paths";

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
 * Props for NavImageText component.
 */
interface NavImageTextProps {
    /** Icon for the link */
    icon: IconDefinition | null;
    /** Route name and label */
    name: string;
}

/**
 * Renders a navigation link with optional icon.
 *
 * @param icon - Icon definition or null.
 * @param name - Route segment and display name.
 * @returns Nav.Link component.
 */
function NavImageText({ icon, name }: NavImageTextProps) {
    return (
        <Nav.Link as={Link} to={`/${name}`} href={`/${name}`}>
            {icon && <FontAwesomeIcon icon={icon} />}
            <span style={{ paddingLeft: '5px' }}>{name}</span>
        </Nav.Link>
    );
}

/**
 * Configuration for navigation pages.
 */
interface Page {
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
 * Main Navbar component.
 *
 * Renders brand logo, responsive menu toggler, and navigation links.
 * Handles user authentication state to display appropriate menu items,
 * including admin and stats dropdowns, and login/sign-up modals.
 *
 * @returns {React.ReactElement} The rendered Navbar.
 */
export function GpNavbar(): React.ReactElement {
    const [bannerStyle, setBannerStyle] = useState<string>('-500px 500px');
    const [bannerTimer, setBannerTimer] = useState<number>(0);
    const { openModal } = useModal();
    const { currentUser } = useAuth();

    // Debug currentUser
    useEffect(() => {
        console.log('currentUser:', currentUser);
    }, [currentUser]);

    const pages: Page[] = [
        { icon: faHome, name: 'Home' },
        { icon: faInfoCircle, name: 'Stats', loggedIn: true },
        { icon: faWind, name: 'Forecast' },
        { icon: faAtom, name: 'Equipment', loggedIn: true },
        { icon: faTty, name: 'Contact' },
        { icon: faDonate, name: 'Contribute', loggedIn: true },
        { icon: faTty, name: 'Dashboard', loggedIn: true },
        { icon: faTty, name: 'Blog', loggedIn: true },
        { icon: faTty, name: 'Admin', admin: true }
    ];

    // Animate rotating banner background
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
            bg="light"
            expand="md"
            id="myContainer"
            style={{ backgroundPosition: bannerStyle, backgroundImage: `url(${banner})` }}
        >
            <Navbar.Brand as={Link} to="/">
                <img alt="Paraglider logo" src={paraglider} width={40} />
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="mr-auto">
                    {pages.map((page, i) => {
                        if (currentUser && (page.loggedIn || page.admin)) {
                            if (page.admin && currentUser.role === 'Administrator') {
                                return (
                                    <NavDropdown key={i} title={<><MyFontAwesomeIcon icon={faUserPlus} /> Admin</>} id="admin-nav-dropdown">
                                        <NavDropdown.Item as={Link} to="/admin/listEndpoints">Endpoints</NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/admin/information">Server Info</NavDropdown.Item>
                                        <NavDropdown.Divider />
                                        <NavDropdown.Item as={Link} to="/admin/Messages">Messages</NavDropdown.Item>
                                        <NavDropdown.Item
                                            href={serverUrl + "/docs/backend"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            backend Documentation
                                        </NavDropdown.Item>
                                        <NavDropdown.Item
                                            href={serverUrl + "/docs/frontend"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            frontend Documentation
                                        </NavDropdown.Item>
                                        <NavDropdown.Item
                                            href={serverUrl + "/docs/pi3_server"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            gp_pi3_server Documentation
                                        </NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/admin/Debug">Debug</NavDropdown.Item>
                                    </NavDropdown>
                                );
                            }
                            if (page.name === 'Stats') {
                                return (
                                    <NavDropdown key={i} title={<><MyFontAwesomeIcon icon={faInfoCircle} /> Stats</>} id="stats-nav-dropdown">
                                        <NavDropdown.Item as={Link} to="/stats/images">Images</NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/stats/hits">Hits</NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/stats/changes">Changes</NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/stats/links">Links</NavDropdown.Item>
                                    </NavDropdown>
                                );
                            }
                            if (page.loggedIn) {
                                return <NavImageText key={i} icon={page.icon} name={page.name} />;
                            }
                        }
                        if (!currentUser && page.loggedOut) {
                            return <NavImageText key={i} icon={page.icon} name={page.name} />;
                        }
                        if (!page.loggedIn && !page.loggedOut && !page.admin) {
                            return <NavImageText key={i} icon={page.icon} name={page.name} />;
                        }
                        return null;
                    })}
                    {currentUser ? (
                        <Nav.Link as={Link} to="/logout">
                            <MyFontAwesomeIcon icon={faSignOutAlt} />
                            <span className="navText">Logout</span>
                        </Nav.Link>
                    ) : (
                        <>
                            <div style={{ paddingTop: '8px', paddingRight: '25px' }} onClick={() => openModal(ModalType.Login)}>
                                <MyFontAwesomeIcon icon={faSignInAlt} />
                                <span className="navText"> Login</span>
                            </div>
                            <div style={{ paddingTop: '8px', paddingRight: '25px' }} onClick={() => openModal(ModalType.SignUp)}>
                                <MyFontAwesomeIcon icon={faUserPlus} />
                                <span className="navText"> Sign-up</span>
                            </div>
                        </>
                    )}
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
}

export default GpNavbar;
