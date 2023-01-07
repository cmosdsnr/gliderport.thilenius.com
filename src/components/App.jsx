import React, { useState } from "react"
import { Container } from "react-bootstrap"
import { AuthProvider } from "../contexts/AuthContext";
import { DataProvider } from "../contexts/DataContext";
import { FilterProvider } from "../contexts/FilterContext";
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import Dashboard from "./Dashboard"
import PrivateRoute from './Navigation/PrivateRoute'
import ForgotPassword from './Navigation/ForgotPassword'
import UpdateProfile from './UpdateProfile'
import PostDetail from './PostDetail'
import CreatePost from './CreatePost'
import Forecast from './Forecast'
import Equipment from './Equipment'
import Video from './Video'
import GpNavbar from './Navigation/GpNavbar'
import { Home } from './Home/Home'
import LoginModal, { Login, SignUp, Logout } from "./Navigation/LoginModal"
import SignUpModal from "./Navigation/SignUpModal"
import Stats from "./Stats"
import Contribute from "./Contribute"
import Contact from "./Contact"


function App() {
    const [showSignUpModal, setShowSignUpModal] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    const openSignUpModal = () => setShowSignUpModal(true)

    return (
        <AuthProvider>
            <DataProvider>
                <FilterProvider>

                    {/* <FilterProvider> */}
                    <Router>
                        <SignUpModal modalIsOpen={showSignUpModal} setModalIsOpen={setShowSignUpModal} setShowLoginModal={setShowLoginModal} />
                        <LoginModal modalIsOpen={showLoginModal} setModalIsOpen={setShowLoginModal} openSignUpModal={openSignUpModal} />
                        <GpNavbar
                            showSignUpModal={showSignUpModal}
                            setShowSignUpModal={setShowSignUpModal}
                            showLoginModal={showLoginModal}
                            setShowLoginModal={setShowLoginModal}
                        />
                        <Container fluid>
                            {/* <div className="w-100" style={{ maxWidth: '400px' }}> */}

                            <Switch>
                                <Route exact path="/" ><Redirect to="/home" /></Route>
                                <Route exact path="/home"><Home /></Route>


                                <PrivateRoute exact path="/stats" component={Stats} />
                                <PrivateRoute exact path="/forecast" component={Forecast} />
                                <PrivateRoute exact path="/equipment" component={Equipment} />
                                <PrivateRoute exact path="/video" component={Video} />
                                <Route exact path="/contact"><Contact /></Route>
                                <PrivateRoute exact path="/contribute" component={Contribute} />
                                <PrivateRoute exact path="/dashboard" component={Dashboard} />
                                <PrivateRoute exact path="/update-profile" component={UpdateProfile} />

                                <Route exact path="/socket"><WebSocket /></Route>

                                <Route exact path="/login"><Login setShowLoginModal={setShowLoginModal} /></Route>
                                <Route exact path="/sign-up"><SignUp setShowSignUpModal={setShowSignUpModal} /></Route>
                                <PrivateRoute exact path="/logout" component={Logout} />


                                <Route path="/forgot-password">
                                    <ForgotPassword
                                        showSignUpModal={showSignUpModal}
                                        setShowSignUpModal={setShowSignUpModal}
                                        showLoginModal={showLoginModal}
                                        setShowLoginModal={setShowLoginModal}
                                    />
                                </Route>
                                <PrivateRoute path="/post/:id" component={PostDetail} />
                                <PrivateRoute path="/create-post" component={CreatePost} />
                            </Switch>
                            {/* </div> */}
                        </Container>
                    </Router>
                </FilterProvider>
            </DataProvider>
        </AuthProvider>
    )
}
export default App;
