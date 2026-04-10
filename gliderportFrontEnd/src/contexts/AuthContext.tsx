/**
 * @packageDocumentation
 * AuthContext for the Gliderport application.
 * Provides authentication, user profile, and settings management using PocketBase.
 */
import React, { useState, useEffect, useContext, ReactNode } from 'react'
import { formatter } from 'components/Globals'
import PocketBase from "pocketbase";
import { pb } from '@/contexts/pb'


export interface AuthProviderProps {
    children: ReactNode;
}

/**
 * AuthContextType defines the shape of the authentication context.
 * - pb: PocketBase instance for API access.
 * - currentUser: The currently authenticated user or null.
 * - changePassword: Function to change the user's password.
 * - avatar: URL string for the user's avatar image.
 * - login: Function to log in with email and password.
 * - googleLogin: Function to log in with Google OAuth.
 * - logout: Function to log out the current user.
 * - signUp: Function to register a new user.
 * - sendVerification: Function to send a verification email.
 * - requestVerification: Function to request email verification.
 * - resetPassword: Function to send a password reset email.
 * - changeEmail: Function to request an email change.
 * - changeAvatar: Function to update the user's avatar.
 * - updateUser: Function to update a user field.
 * - updateUserSettings: Function to update user settings.
 * - reloadUserInfo: Function to reload the current user's info from the server.
 */
export interface AuthContextType {
    pb: PocketBase;
    currentUser: User | null;
    changePassword: (transaction: any) => void;
    avatar: string;
    login: (email: string, password: string) => any;
    googleLogin: () => void;
    logout: () => void;
    signUp: (data: any) => void;
    sendVerification: (email: string) => void;
    requestVerification: () => void;
    resetPassword: (email: string) => void;
    changeEmail: (newEmail: string) => void;
    changeAvatar: (data: FormData) => void;
    updateUser: (name: string, value: any) => Promise<boolean>;
    updateUserSettings: (obj: Partial<UserSettings>, textMe?: boolean) => Promise<boolean>;
    reloadUserInfo: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

/**
 * Custom hook to access the AuthContext.
 * @returns {AuthContextType} The authentication context.
 * @throws Error if used outside of an AuthProvider.
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

/**
 * AuthProvider component that wraps its children with authentication context.
 * @param props - The children to provide context to.
 * @returns {React.ReactElement} The provider with authentication context.
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {

    const defaultAvatar = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/images/user.png"
    const [avatar, setAvatar] = useState<string>(defaultAvatar);
    const [settings, setSettings] = useState<any>({});
    const [currentUser, setCurrentUser] = useState<User | null>(null)

    useEffect(() => {
        // Check if there is a valid auth token in localStorage
        // debugger;
        if (pb.authStore.isValid) {
            reloadUserInfo();
        }
    }, []);

    // Change password for the current user, or prompt if using Google login
    const changePassword = async () => {
        if (pb.authStore.record) resetPassword(pb.authStore.record.email)
    }

    useEffect(() => {
        if (currentUser)
            console.log("currentUser: ", currentUser);
    }, [currentUser])

    const handleCurrentUser = (record: User) => {
        if (record.avatar) setAvatar(record.avatar);
        setCurrentUser(record);
    }

    // Log in with email and password
    const login = async (email: string, password: string) => {
        try {
            await pb.collection('users').authWithPassword(email, password);
            if (pb.authStore.record) {
                handleCurrentUser(pb.authStore.record as unknown as User);
            }
        } catch (error) {
            console.log("error: ", error);
            throw error;
        }
    }

    // Log in with Google OAuth
    const googleLogin = async () => {
        try {
            const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
            const meta = authData.meta;
            const record = authData.record;

            if (meta && record) {
                // Sync name from Google if it differs
                if (meta.name?.length > 0 && meta.name !== record.name && pb.authStore.record) {
                    const n = meta.name.split(" ");
                    const res: Record<string, string> = {};
                    if (n.length > 0) res.firstName = n[0];
                    if (n.length > 1) res.lastName = n[n.length - 1];
                    await pb.collection('users').update(pb.authStore.record.id, res);
                }

                // Populate avatar + name for brand-new Google users
                if (meta.isNew) {
                    const formData = new FormData();
                    const response = await fetch(meta.avatarUrl);
                    if (response.ok) formData.append('avatar', await response.blob());
                    formData.append('name', meta.name);
                    const n = meta.name.split(" ");
                    if (n.length > 0) formData.append('firstName', n[0]);
                    if (n.length > 1) formData.append('lastName', n[n.length - 1]);
                    formData.append('role', "Member");
                    await pb.collection('users').update(authData.record.id, formData);
                    await pb.collection("users").authRefresh();
                }
            }

            // Update React state so the rest of the app sees the logged-in user
            if (pb.authStore.record) {
                handleCurrentUser(pb.authStore.record as unknown as User);
            }
        } catch (error) {
            console.log("Failed to exchange code.\n" + error);
            throw error;
        }
    }

    // Log out the current user
    const logout = () => {
        pb.authStore.clear();
        setCurrentUser(null);
    }

    // Register a new user
    const signUp = async (data: SignUp) => {
        await pb
            .collection('users')
            .create({
                email: data.email,
                password: data.password,
                passwordConfirm: data.passwordConfirm,
                firstName: data.firstName,
                lastName: data.lastName,
                textMe: false,
                role: "Member"
            })
    }

    // Send a verification email for any given email address
    const sendVerification = async (email: string) => {
        if (pb.authStore.record?.provider === 'google') {
            alert('You are logged in with Google. Please manage your account there.');
            return;
        }
        if (await pb.collection('users').requestVerification(email)) console.log("Verification Email Sent!")
    }

    // Request email verification for the current user
    const requestVerification = async () => {
        if (pb.authStore.record?.provider === 'google') {
            alert('You are logged in with Google. Please manage your account there.');
            return;
        }
        if (await pb.collection('users').requestVerification(pb.authStore.record?.email)) alert('Verification Email Sent! Check your inbox.')
        else alert('Error sending verification email.')
    }

    // Send a password reset email, or prompt if using Google login
    const resetPassword = async (email: string) => {
        // Check if the user is logged in via Google OAuth
        if (pb.authStore.record?.provider === 'google') {
            alert('You are logged in with Google. Please visit your Google Account to change your password.');
            return;
        }
        if (await pb.collection('users').requestPasswordReset(email)) alert('Password Reset Email Sent to ' + email + '! Check your inbox.')
        else alert('Error sending Password Reset email.')
    }

    // Request an email change, or prompt if using Google login
    const changeEmail = async (newEmail: string) => {
        // Check if the user is logged in via Google OAuth
        if (pb.authStore.record?.provider === 'google') {
            alert('You are logged in with Google. Please visit your Google Account to change your email.');
            return;
        }
        return await pb.collection('users').requestEmailChange(newEmail);
    };

    // Change the user's avatar
    const changeAvatar = async (data: FormData) => {
        if (pb.authStore.record) {
            await pb.collection("users").update(pb.authStore.record.id, data);
            await pb.collection("users").authRefresh();
            setAvatar(pb.authStore.record.avatar);
        }
    }

    // Update a user field
    const updateUser = async (name: string, value: any) => {
        if (pb.authStore.record) {
            const data = { ...pb.authStore.record, [name]: value };
            // remove the id field
            // data.id = null;
            await pb.collection("users").update(pb.authStore.record.id, data);
            await pb.collection("users").authRefresh();
        }
        return true;
    }

    // Update user settings
    const updateUserSettings = async (obj: Partial<UserSettings>, textMe?: boolean) => {
        if (currentUser) {
            let t: UserSettings = { ...currentUser.settings, ...obj };
            if (!t.speed) t.speed = 10;
            if (!t.direction) t.direction = 10;
            if (!t.duration) t.duration = 0;
            await pb.collection("users").update(currentUser.id, textMe === undefined ? { settings: t } : { textMe, settings: t });
            reloadUserInfo();
        }
        return true;
    }

    // Reload the current user's info from the server
    const reloadUserInfo = async () => {
        await pb.collection("users").authRefresh();
        if (pb.authStore.record) {
            handleCurrentUser(pb.authStore.record as unknown as User);
        }
    }

    const value: AuthContextType = {
        pb,
        currentUser,
        changePassword,
        avatar,
        login,
        googleLogin,
        logout,
        signUp,
        sendVerification,
        requestVerification,
        resetPassword,
        changeEmail,
        changeAvatar,
        updateUser,
        updateUserSettings,
        reloadUserInfo,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
            {/* {!loading && children} */}
        </AuthContext.Provider>
    )
}
