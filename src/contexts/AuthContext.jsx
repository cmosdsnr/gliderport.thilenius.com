import React, { useState, useEffect, useContext } from 'react'
import { auth, db } from '../firebase'
import { doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateEmail,
    updatePassword,
    onAuthStateChanged
} from 'firebase/auth'
import date from "date-and-time"

const AuthContext = React.createContext()


export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState() //initially undefined, then set to null or currentUser info
    const [loading, setLoading] = useState(true)
    const [messages, setMessages] = useState([])
    const [messagesLoaded, setMessagesLoaded] = useState(false)

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

    const saveMessage = async (msg) => {
        if (currentUser) {
            let ts = parseInt((new Date()).getTime() / 1000)
            let formatDate = date.format(new Date(), "YYYY-MM-DD, HH:mm")
            msg.ts = ts
            msg.date = formatDate
            msg.uid = currentUser.uid
            if (currentUser.firstName.length === 0) {
                alert("Please go to Dashboard and enter your name first")
            } else {
                msg.ownerName = currentUser.firstName + " " + currentUser.lastName
                const docRef = await addDoc(collection(db, "messages"), msg)
            }
        }

    }

    const deleteMessage = async (msg) => {
        if (msg.data.id === currentUser.id) {
            if (confirm("Do you want to delete this message?"))
                await deleteDoc(doc(db, "messages", msg.id))
        }
    }

    useEffect(() => {
        const messageRef = collection(db, "messages")
        const q = query(messageRef, orderBy("ts", "desc"))

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            var tempArr = [];
            querySnapshot.forEach(function (child) {
                tempArr.push({ id: child.id, data: child.data() });
            });
            setMessages(tempArr);
            //Change loading status
            setMessagesLoaded(true);
        })
        return unsubscribe
    }, [])

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
        reloadUserInfo,
        messages,
        messagesLoaded,
        saveMessage,
        deleteMessage,
    }
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
