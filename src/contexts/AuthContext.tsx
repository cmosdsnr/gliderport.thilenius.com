import React, { useState, useEffect, useContext, ReactNode } from 'react'
import { formatter } from 'components/Globals'
import PocketBase from "pocketbase";
import { pb } from '@/contexts/pb'


interface AuthProviderProps {
    children: ReactNode;
}

export interface AuthContextType {
    pb: PocketBase;
    currentUser: User | null;
    ChangePassword: (transaction: any) => void;
    avatar: string;
    login: (email: string, password: string) => any;
    googleLogin: () => void;
    logout: () => void;
    signUp: (data: any) => void;
    sendVerification: (email: string) => void;
    requestVerification: () => void;
    resetPassword: (email: string) => void;
    ChangeEmail: (newEmail: string) => void;
    changeAvatar: (data: FormData) => void;
    updateUser: (name: string, value: any) => Promise<boolean>;
    updateUserSettings: (obj: Partial<UserSettings>, textMe?: boolean) => Promise<boolean>;
    reloadUserInfo: () => Promise<void>;
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

    const ChangePassword = async () => { if (pb.authStore.record) resetPassword(pb.authStore.record.email) }

    useEffect(() => {
        if (currentUser)
            console.log("currentUser: ", currentUser);
    }, [currentUser])

    const handleCurrentUser = (record: User) => {
        if (record.avatar) setAvatar(record.avatar);
        setCurrentUser(record);
    }

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

    const googleLogin = async () => {

        //all-in-1 google login
        //explanation: https://pocketbase.io/docs/authentication
        //get key and secret from google developer console, and set them in pocketbase auth configuration 
        //redirect set to https://pocketbase.thilenius.com/api/oauth2-redirect
        try {
            const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
            const meta = authData.meta;
            const record = authData.record;
            if (meta && record) {
                if ((meta.name.length > 0) &&
                    (meta.name !== record.name) &&
                    pb.authStore.record
                ) {
                    const n = meta.name.split(" ");
                    const res: any = {};
                    if (n.length > 0) res.firstName = n[0];
                    if (n.length > 1) res.lastName = n[n.length - 1];
                    pb.collection('users').update(pb.authStore.record.id, res);
                }

                if (meta.isNew) {
                    const formData = new FormData();
                    const response = await fetch(meta.avatarUrl);
                    if (response.ok) {
                        const file = await response.blob();
                        formData.append('avatar', file);
                    }
                    formData.append('name', meta.name);
                    const n = meta.name.split(" ");
                    if (n.length > 0) formData.append('firstName', n[0]);
                    if (n.length > 1) formData.append('lastName', n[n.length - 1]);

                    formData.append('role', "Member");
                    await pb.collection('users').update(authData.record.id, formData);
                    await pb.collection("users").authRefresh();
                }
                // setIsLoggedIn(true);
                console.log(pb.authStore.isValid);
                // debugger;
            }
        } catch (error) {
            console.log("Failed to exchange code.\n" + error)
        }
        // setIsLoggedIn(true);
    }

    const logout = () => {
        pb.authStore.clear();
        setCurrentUser(null);
    }

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


    const sendVerification = async (email: string) => {
        if (await pb.collection('users').requestVerification(email)) console.log("Verification Email Sent!")
    }

    const requestVerification = async () => {
        if (await pb.collection('users').requestVerification(pb.authStore.record?.email)) alert('Verification Email Sent! Check your inbox.')
        else alert('Error sending verification email.')
    }

    const resetPassword = async (email: string) => {
        if (await pb.collection('users').requestPasswordReset(email)) alert('Password Reset Email Sent to ' + email + '! Check your inbox.')
        else alert('Error sending Password Reset email.')
    }

    const ChangeEmail = async (newEmail: string) => await pb.collection('users').requestEmailChange(newEmail);

    const changeAvatar = async (data: FormData) => {
        if (pb.authStore.record) {
            await pb.collection("users").update(pb.authStore.record.id, data);
            await pb.collection("users").authRefresh();
            setAvatar(pb.authStore.record.avatar);
        }
    }

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

    const reloadUserInfo = async () => {
        await pb.collection("users").authRefresh();
        if (pb.authStore.record) {
            handleCurrentUser(pb.authStore.record as unknown as User);
        }
    }






    const value: AuthContextType = {
        pb,
        currentUser,
        ChangePassword,
        avatar,
        login,
        googleLogin,
        logout,
        signUp,
        sendVerification,
        requestVerification,
        resetPassword,
        ChangeEmail,
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
