import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import NavDropdown from 'react-bootstrap/NavDropdown'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faVideo, faDonate, faInfoCircle, faTty, faAtom, faWind, faSignInAlt, faSignOutAlt, faUserPlus, faSadCry } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/contexts/AuthContext'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

import { useModal, ModalType } from 'modals/Modals'

import paraglider from 'images/paraglider.png';
import banner from 'images/banner.jpg'
import { useWindow } from 'hooks/useWindow'

export const MyFontAwesomeIcon = (props: any) => {
    const width = useWindow();
    const showIcons = width > 950 || width < 768;
    const { icon, inverse } = props;
    return (
        <>{showIcons && <FontAwesomeIcon icon={icon} inverse={inverse} />}</>
    )
}

interface NavImageTextProps {
    icon: IconDefinition | null;
    name: string;
}

function NavImageText({ icon, name }: NavImageTextProps) {
    return (<Nav.Link
        as={Link}
        to={"/" + name}
        href={"/" + name}
    >
        {icon ? <FontAwesomeIcon icon={icon} /> : null}
        <span style={{ paddingLeft: '5px' }}>{name}</span>
    </Nav.Link>)
}

interface Page {
    icon: IconDefinition;
    name: string;
    loggedIn?: boolean;
    loggedOut?: boolean;
    admin?: boolean;
}


export default function GpNavbar() {
    const [bannerStyle, setBannerStyle] = useState("-500px 500px");
    const [bannerTimer, setBannerTimer] = useState<number>(0);
    const { openModal, closeModal } = useModal();
    const { currentUser } = useAuth();

    const pages: Page[] = [
        {
            icon: faHome,
            name: "Home",
        }, {
            icon: faVideo,
            name: "Video",
            loggedIn: true,
        }, {
            icon: faInfoCircle,
            name: "Stats",
            loggedIn: true,
        }, {
            icon: faWind,
            name: "Forecast",
        }, {
            icon: faAtom,
            name: "Equipment",
            loggedIn: true,
        }, {
            icon: faTty,
            name: "Contact",
        }, {
            icon: faDonate,
            name: "Contribute",
            loggedIn: true,
        }, {
            icon: faTty,
            name: "Dashboard",
            loggedIn: true,
        }, {
            icon: faTty,
            name: "Blog",
            loggedIn: true,
        }, {
            icon: faTty,
            name: "Admin",
            admin: true,
        },
    ];

    useEffect(() => {
        if (!bannerTimer) {
            let pos = 500;
            const timer = setInterval(() => {
                pos--;
                if (pos < 0) { pos = 500; }
                setBannerStyle(`-${pos}px ${pos}px`);
            }, 100);
            setBannerTimer(timer);
        }
        return () => {
            if (bannerTimer > 0) {
                clearInterval(bannerTimer);
            }
        };
    }, [bannerTimer]);

    return (
        <div>
            <Navbar
                bg="light"
                expand="md"
                id="myContainer"
                style={{
                    backgroundPosition: bannerStyle,
                    backgroundImage: `url(${banner})`
                }}
            >
                <Navbar.Brand as={Link} to="/">
                    <img alt='' src={paraglider} width="40" />
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="mr-auto">
                        {pages.map((page, i) => {
                            // in the menu if we are logged in
                            if (currentUser && (page.loggedIn || page.admin)) {
                                if (page.admin && currentUser.role == 'Administrator')
                                    return (
                                        <NavDropdown key={i} title={<span>
                                            <MyFontAwesomeIcon icon={faUserPlus} /> Admin
                                        </span>} id="basic-nav-dropdown">
                                            <NavDropdown.Item as={Link} to="/admin/listEndpoints">Endpoints</NavDropdown.Item>
                                            <NavDropdown.Item as={Link} to="/admin/Information">Server Info</NavDropdown.Item>
                                            <NavDropdown.Divider />
                                            <NavDropdown.Item as={Link} to="/admin/Messages">Messages</NavDropdown.Item>
                                            <NavDropdown.Item
                                                href="https://gpupdate.thilenius.com/docs"
                                                target="_blank"             // open in new tab
                                                rel="noopener noreferrer"   // security best‑practice
                                            >
                                                gpUpdate Documentation
                                            </NavDropdown.Item>
                                            <NavDropdown.Item
                                                href="https://gpupdate.thilenius.com/docs/gp_pi3_server"
                                                target="_blank"             // open in new tab
                                                rel="noopener noreferrer"   // security best‑practice
                                            >
                                                gp_pi3_server Documentation
                                            </NavDropdown.Item>
                                        </NavDropdown>
                                    )
                                if (page.name == "Stats")
                                    return (
                                        <NavDropdown key={i} title={<span>
                                            <MyFontAwesomeIcon icon={faUserPlus} /> Stats
                                        </span>} id="basic-nav-dropdown">
                                            <NavDropdown.Item as={Link} to="/stats/images">Images</NavDropdown.Item>
                                            <NavDropdown.Item as={Link} to="/stats/hits">Hits</NavDropdown.Item>
                                            <NavDropdown.Item as={Link} to="/stats/changes">Changes</NavDropdown.Item>
                                            <NavDropdown.Item as={Link} to="/stats/links">Links</NavDropdown.Item>

                                        </NavDropdown>
                                    )
                                if (page.loggedIn)
                                    return (<NavImageText key={i} name={page.name} icon={page.icon} />)
                            }

                            // in the menu if we are logged out
                            if (!currentUser && page.loggedOut)
                                return (<NavImageText key={i} name={page.name} icon={page.icon} />)

                            //always in the menu
                            if (!page.loggedIn && !page.loggedOut && !page.admin)
                                return (<NavImageText key={i} name={page.name} icon={page.icon} />)

                            return (null)

                        })}
                        {currentUser ?
                            <Nav.Link as={Link} to="/logout">
                                <MyFontAwesomeIcon icon={faSignOutAlt} />
                                <span className="navText">Logout</span>
                            </Nav.Link> :
                            <>
                                <div style={{ paddingTop: "8px", paddingRight: "25px" }} onClick={() => openModal(ModalType.Login)}>
                                    <MyFontAwesomeIcon icon={faSignInAlt} />
                                    <span className="navText"> Login</span>
                                </div>
                                <div style={{ paddingTop: "8px", paddingRight: "25px" }} onClick={() => openModal(ModalType.SignUp)}>
                                    <MyFontAwesomeIcon icon={faUserPlus} />
                                    <span className="navText"> Sign-up</span>
                                </div>
                            </>
                        }
                    </Nav>
                </Navbar.Collapse>
            </Navbar>


        </div>
    )
}

