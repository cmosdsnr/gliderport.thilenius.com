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
 * - **Auth-gated links** — Equipment, Contribute, Dashboard, Blog
 *   (visible only when a user is signed in).
 * - **Stats dropdown** — Images, Hits, Changes, Links
 *   (signed-in users only).
 * - **Admin dropdown** — Endpoints, Server Info, Messages, Debug,
 *   DB Archive, and TypeDoc links for all three server projects
 *   (visible only to users whose role is `"Administrator"`).
 * - **Login / Sign-up** — Opens the respective modal when no user
 *   session is active.
 * - **Logout** — Navigates to `/logout` when a session is active.
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
 * Main application navigation bar.
 *
 * Renders a Bootstrap `Navbar` containing the paraglider brand logo, a
 * responsive hamburger toggler, and the full set of navigation links.
 * Authentication state (from {@link useAuth}) determines which items are
 * shown:
 *
 * - Unauthenticated visitors see public links plus Login / Sign-up buttons.
 * - Authenticated users additionally see auth-gated page links and the
 *   Stats dropdown.
 * - Users with the `"Administrator"` role also see the Admin dropdown,
 *   which includes links to the TypeDoc documentation for all three
 *   server projects (backend, frontend, gp_pi3_server).
 *
 * The navbar background image animates by shifting its `background-position`
 * on a 100 ms interval, cycling through a 500 px offset range.
 *
 * @returns The rendered Bootstrap Navbar element.
 *
 * @example
 * ```tsx
 * // Rendered once at the application root, above all routes.
 * <GpNavbar />
 * ```
 */
export function GpNavbar(): React.ReactElement {
    const [bannerStyle, setBannerStyle] = useState<string>('-500px 500px');
    const [bannerTimer, setBannerTimer] = useState<number>(0);
    const { openModal } = useModal();
    const { currentUser } = useAuth();

    /** Logs the current authenticated user to the console whenever it changes. */
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
                                            href={API.docs.backend()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            backend Documentation
                                        </NavDropdown.Item>
                                        <NavDropdown.Item
                                            href={API.docs.frontend()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            frontend Documentation
                                        </NavDropdown.Item>
                                        <NavDropdown.Item
                                            href={API.docs.pi3Server()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            gp_pi3_server Documentation
                                        </NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/admin/Debug">Debug</NavDropdown.Item>
                                        <NavDropdown.Item as={Link} to="/admin/archive">DB Archive</NavDropdown.Item>
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
