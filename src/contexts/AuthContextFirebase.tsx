import React, { useState, useEffect, useContext, ReactNode } from 'react'
import { auth, db } from '../firebase'
import { User, UserCredential } from 'firebase/auth'
import { doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, collection, query, orderBy, onSnapshot, DocumentData } from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateEmail,
    updatePassword,
    onAuthStateChanged
} from 'firebase/auth'
import date from 'date-and-time'


export interface Message {
    ts: number;
    date: string;
    uid: string;
    ownerName: string;
    msg: string;
}

interface AuthProviderProps {
    children: ReactNode;
}

export interface MessageItem {
    id: string;
    data: Message;
}

interface AuthContextType {
    currentUser: User & DocumentData | null;
    login: (email: string, password: string) => Promise<UserCredential>;
    logout: () => Promise<void>;
    signup: (email: string, password: string) => Promise<UserCredential>;
    resetPassword: (email: string) => Promise<void>;
    updateUserEmail: (email: string) => Promise<void>;
    updateUserPassword: (password: string) => Promise<void>;
    updateUser: (name: string, value: any) => Promise<void>;
    reloadUserInfo: () => Promise<void>;
    messages: MessageItem[];
    messagesLoaded: boolean;
    saveMessage: (msg: any) => Promise<void>;
    deleteMessage: (msg: { id: string; data: Message }) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [currentUser, setCurrentUser] = useState<User & DocumentData | null>(null)
    const [loading, setLoading] = useState(true)


    const [messages, setMessages] = useState<MessageItem[]>([])
    const [messagesLoaded, setMessagesLoaded] = useState(false)

    function signup(email: string, password: string) {
        return createUserWithEmailAndPassword(auth, email, password)
    }

    function login(email: string, password: string) {
        return signInWithEmailAndPassword(auth, email, password)
    }

    function logout() {
        return signOut(auth)
    }

    function resetPassword(email: string) {
        return sendPasswordResetEmail(auth, email)
    }

    function updateUserEmail(email: string): Promise<void> {
        if (auth.currentUser) {
            return updateEmail(auth.currentUser, email);
        }
        return Promise.reject(new Error("No current user"));
    }

    function updateUserPassword(password: string): Promise<void> {
        if (auth.currentUser) {
            return updatePassword(auth.currentUser, password);
        }
        return Promise.reject(new Error("No current user"));
    }

    function updateUser(name: string, value: any): Promise<void> {
        interface Delta {
            [key: string]: any;
            text?: {
                sent: boolean;
                [key: string]: any;
            };
        }

        const delta: Delta = { [name]: value };

        if (currentUser) {
            if (name !== 'text') {
                delta.text = { ...currentUser.text, sent: false };
            }

            setCurrentUser({ ...currentUser, ...delta });
            if (name === 'phone') console.log("auth ", currentUser.phone);
            const docRef = doc(db, 'users', currentUser.uid);
            return updateDoc(docRef, delta);
        }
        return Promise.resolve(); // Return a resolved promise if no user
    }

    async function reloadUserInfo() {

        if (currentUser) {
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
    }
    const saveMessage = async (msg: Message) => {
        if (currentUser) {
            let ts = Math.floor(Date.now() / 1000);
            let formatDate = date.format(new Date(), "YYYY-MM-DD, HH:mm");
            const newMsg: Message = {
                ...msg,
                ts,
                date: formatDate,
                uid: currentUser.uid,
                ownerName: currentUser.firstName.length === 0 ? "" : `${currentUser.firstName} ${currentUser.lastName}`
            };

            if (currentUser.firstName.length === 0) {
                alert("Please go to Dashboard and enter your name first");
            } else {
                await addDoc(collection(db, "messages"), newMsg);
            }
        }
    }

    const deleteMessage = async (msg: MessageItem) => {
        if (msg.data.uid === currentUser?.uid) {
            if (confirm("Do you want to delete this message?")) {
                await deleteDoc(doc(db, "messages", msg.id));
            }
        }
    }

    useEffect(() => {
        const messageRef = collection(db, "messages")
        const q = query(messageRef, orderBy("ts", "desc"))

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tempArr: MessageItem[] = [];
            querySnapshot.forEach((child) => {
                tempArr.push({ id: child.id, data: child.data() as Message });
            });
            setMessages(tempArr);
            //Change loading status
            setMessagesLoaded(true);
        })
        return unsubscribe
    }, [])

    let first = true;
    useEffect(() => {
        async function getUserData(user: User) {
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

    const value: AuthContextType = {
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
