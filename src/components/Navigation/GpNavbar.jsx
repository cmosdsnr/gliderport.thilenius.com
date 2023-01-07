import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'
import Nav from "react-bootstrap/Nav"
import Navbar from "react-bootstrap/Navbar"
// import NavDropdown from "react-bootstrap/NavDropdown"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faVideo, faDonate, faInfoCircle, faTty, faAtom, faWind, faSignInAlt, faSignOutAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../contexts/AuthContext'


import "../../css/style.css"
import paraglider from "../../images/paraglider.png?as=png&width=40"

function NavImageText({ icon, name }) {
    return (<Nav.Link
        as={Link}
        to={"/" + name}
        href={"/" + name}
    >
        {icon ? <FontAwesomeIcon icon={icon} /> : null}
        <span style={{ paddingLeft: '5px' }}>{name}</span>
    </Nav.Link>)
}

export default function GpNavbar({ showSignUpModal, setShowSignUpModal, showLoginModal, setShowLoginModal }) {
    const [BannerStyle, setBannerStyle] = useState("-500px 500px")
    const [BannerTimer, setBannerTimer] = useState()

    const { currentUser } = useAuth()

    const pages = [
        {
            icon: faHome,
            name: "Home",
        },
        {
            icon: faVideo,
            name: "Video",
            loggedIn: true,
        },
        {
            icon: faInfoCircle,
            name: "Stats",
            loggedIn: true,
        },
        {
            icon: faWind,
            name: "Forecast",
        },

        {
            icon: faAtom,
            name: "Equipment",
            loggedIn: true,
        },
        {
            icon: faTty,
            name: "Contact",
        },
        {
            icon: faDonate,
            name: "Contribute",
            loggedIn: true,
        },
        {
            icon: faSignInAlt,
            name: "Login",
            loggedOut: true,
        },
        {
            icon: faSignOutAlt,
            name: "Logout",
            loggedIn: true,
        },
        {
            icon: faUserPlus,
            name: "Sign-up",
            loggedOut: true,
        },
        {
            icon: faTty,
            name: "Dashboard",
            loggedIn: true,
        },
        {
            icon: faTty,
            name: "Blog",
            loggedIn: true,
        },
    ];

    useEffect(() => {
        if (!BannerTimer) {
            //console.log("start Timer")
            var pos = 500
            setBannerTimer(setInterval(() => {
                pos--
                if (pos < 0) { pos = 500 }
                setBannerStyle(-pos + "px " + pos + "px")
            }, 100))
        }
        return (() => {
            if (BannerTimer) {
                console.log("clear the timer")
                clearInterval(BannerTimer)
            }
        })
    }, [BannerTimer])

    return (
        <div>
            <Navbar
                bg="light"
                expand="md"
                id="myContainer"
                style={{
                    backgroundPosition: BannerStyle,
                }}
            >
                <Navbar.Brand as={Link} to="/">
                    <img alt='' src={paraglider} width="40" />
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="mr-auto">
                        {pages.map((page, i) => {
                            if (currentUser && page.loggedIn) {
                                return (<NavImageText key={i} name={page.name} icon={page.icon} />)
                            } else if (!currentUser && page.loggedOut) {
                                return (<NavImageText key={i} name={page.name} icon={page.icon} />)
                            } else if (!page.loggedIn && !page.loggedOut) {
                                return (<NavImageText key={i} name={page.name} icon={page.icon} />)
                            } else {
                                return (null)
                            }
                        })}
                    </Nav>
                </Navbar.Collapse>
            </Navbar>


        </div>
    )
}

