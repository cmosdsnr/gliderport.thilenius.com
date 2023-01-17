import React, { useState, useEffect, useContext } from 'react'
import { auth, db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateEmail,
    updatePassword,
    onAuthStateChanged
} from 'firebase/auth'

const AuthContext = React.createContext()


export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState() //initially undefined, then set to null or currentUser info
    const [loading, setLoading] = useState(true)

    function signup(email, password) {
        return createUserWithEmailAndPassword(auth, email, password)
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password)
    }

    function logout() {
        return signOut(auth)
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email)
    }

    function updateUserEmail(email) {
        return updateEmail(auth.currentUser, email)
    }

    function updateUserPassword(password) {
        return updatePassword(auth.currentUser, password)
    }

    function updateUser(name, value) {
        let delta = {}
        delta[name] = value
        setCurrentUser({ ...currentUser, ...delta })
        if (name === 'phone') console.log("auth ", currentUser.phone)
        const docRef = doc(db, 'users', currentUser.uid)
        return updateDoc(docRef, delta)
    }



    async function reloadUserInfo() {
        const docRef = doc(db, 'users', currentUser.uid)
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const u = { ...currentUser, ...data }
            setCurrentUser(u)
        } else {
            console.log("didn't get record")
        }

    }

    let first = true;
    useEffect(() => {
        async function getUserData(user) {
            const docRef = doc(db, 'users', user.uid)
            try {
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const tot = { ...user, ...data }
                    console.log("Document  read data:", tot);
                    setCurrentUser(tot)
                } else {
                    console.log("No such user document!");
                    //we need to create it
                    const userRef = doc(db, 'users', user.uid)
                    const text = {
                        address: "",
                        provider: "",
                        errorAngle: 10,
                        speed: 10,
                        duration: 0,
                        enabled: false
                    }
                    const data = {
                        firstName: "",
                        lastName: "",
                        phone: "",
                        text: text,
                        email: user.email,
                        role: "Member"
                    }
                    try {
                        console.log("Writing user data:", data)
                        await setDoc(userRef, data)
                        setCurrentUser({ ...user, ...data })
                    } catch (e) {
                        console.log("Could not create user record");
                    }
                }
            } catch (e) {
                // we get here on logout: user is still valid, but the authorization has been removed
                console.log("Could not read user record");
            }
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && first) {
                first = false;
                getUserData(user)
            }
            setLoading(false)
        })
        return unsubscribe
    }, [])

    const value = {
        currentUser,
        login,
        logout,
        signup,
        resetPassword,
        updateUserEmail,
        updateUserPassword,
        updateUser,
        reloadUserInfo
    }
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
