import React, { useState, useEffect, useContext, ReactNode } from 'react'
import PocketBase from 'pocketbase';
import { formatter } from 'components/Globals'
import date from 'date-and-time'
import { set } from 'react-hook-form';

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
    const [messages, setMessages] = useState<MessageItem[]>([])
    const [messagesLoaded, setMessagesLoaded] = useState(false)
    const [currentUser, setCurrentUser] = useState<User | null>(null)

    const pbURL = import.meta.env.VITE_PB_URL.toString();
    console.log("connecting to: " + pbURL)
    const [pb, setPb] = useState<PocketBase>(new PocketBase(pbURL))

    useEffect(() => {
        // Check if there is a valid auth token in localStorage
        // debugger;
        if (pb.authStore.isValid) {
            reloadUserInfo();
        }
    }, []);

    const newMessage = async (msg: string) => {
        if (currentUser?.firstName?.length === 0) {
            alert("Please go to Dashboard and enter your name first");
        } else {
            pb.collection('posts').create({ user: currentUser?.id, message: msg });
        }
    }

    const deleteMessage = async (msg: MessageItem) => {
        if (msg.uid === currentUser?.id) {
            if (confirm("Do you want to delete this message?")) {
                try {
                    // Attempt to delete the record with the given messageId
                    await pb.collection('posts').delete(msg.id);
                    console.log(`Message ${msg.id} deleted successfully.`);
                } catch (error) {
                    console.error(`Error deleting message ${msg.id}:`, error);
                    // Optionally rethrow the error or handle it further here.
                }
            }
        } else
            alert("You can only delete your own messages");

    }

    const ChangePassword = async () => { if (pb.authStore.record) resetPassword(pb.authStore.record.email) }

    // useEffect(() => {
    //     if (pb.authStore.isValid && pb.authStore.record) {
    //         setAvatar(pb.files.getURL(pb.authStore.record, pb.authStore.record.avatar));
    //         try {
    //             pb.collection('users').subscribe(pb.authStore.record?.id, async (e) => {
    //                 try {
    //                     if (pb.authStore.isValid) {
    //                         await pb.collection('users').authRefresh();
    //                     }
    //                 } catch (error) {
    //                     console.log("error: ", error)
    //                 }
    //                 // if (pb.authStore.record?.verified == true)
    //                 //     setVerified(true);
    //                 // else
    //                 //     setVerified(false);
    //             }, { /* other options like expand, custom headers, etc. */ });
    //         } catch (error) {
    //             console.log("error: ", error);
    //         }
    //         return () => {
    //             pb.collection('users').unsubscribe(pb.authStore.record?.id);
    //         }
    //     } else {
    //         return () => { };
    //     }

    // }, [pb.authStore.isValid])

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



    // Load the initial messages from the collection
    async function loadInitialMessages() {
        try {
            // Fetch all records with expansion of the 'users' relation.
            // Adjust the limit as needed.
            const records = await pb.collection('posts').getFullList(200, {
                expand: 'user'
            });
            const msgs = records.map(record => {
                return {
                    id: record.id,
                    created: record.created ? formatter.format(new Date(record.created)) : "Unknown",
                    message: record.message,
                    username: record.expand == undefined || record.expand.user == undefined ? 'Unknown' : record.expand.user.username,
                    avatar: record.expand?.user?.avatar ? pb.files.getURL(record.expand.user, record.expand?.user.avatar) : "",
                    name: record.expand?.user?.name || 'Unknown',
                    uid: record.user
                }
            });
            setMessages(msgs);
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    }


    useEffect(() => {
        // Load messages when the component mounts.
        loadInitialMessages();

        // Subscribe to realtime events for the posts collection.

        pb.collection('posts').subscribe('*', (e) => {
            // e.action is one of "create", "update", or "delete".
            // e.record contains the record data (with expanded relations if available).
            setMessages(prevMessages => {
                let updated = [...prevMessages];
                if (e.action === 'create') {
                    // Add the new record.
                    const newMsg = {
                        id: e.record.id,
                        created: e.record.created ? formatter.format(new Date(e.record.created)) : "Unknown",
                        message: e.record.message,
                        username: e.record.expand == undefined || e.record.expand.user == undefined ? 'Unknown' : e.record.expand.user.username,
                        avatar: e.record.expand?.user?.avatar ? pb.files.getURL(e.record.expand.user, e.record.expand?.user.avatar) : "",
                        name: e.record.expand?.user?.name || 'Unknown',
                        uid: e.record.user
                    };
                    updated.push(newMsg);
                } else if (e.action === 'update') {
                    // Replace the updated record.
                    updated = updated.map(msg =>
                        msg.id === e.record.id
                            ? {
                                id: e.record.id,
                                created: e.record.created ? formatter.format(new Date(e.record.created)) : "Unknown",
                                message: e.record.message,
                                username: e.record.expand == undefined || e.record.expand.user == undefined ? 'Unknown' : e.record.expand.user.username,
                                avatar: e.record.expand?.user?.avatar ? pb.files.getURL(e.record.expand.user, e.record.expand?.user.avatar) : "",
                                name: e.record.expand?.user?.name || 'Unknown',
                                uid: e.record.user
                            }
                            : msg
                    );
                } else if (e.action === 'delete') {
                    // Remove the deleted record.
                    updated = updated.filter(msg => msg.id !== e.record.id);
                }
                return updated;
            });
        });
        setMessagesLoaded(true);
        // Cleanup subscription when the component unmounts.
        return () => {
            pb.collection('posts').unsubscribe();
        };

    }, []);



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

        messages,
        messagesLoaded,
        newMessage,
        deleteMessage,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
            {/* {!loading && children} */}
        </AuthContext.Provider>
    )
}
