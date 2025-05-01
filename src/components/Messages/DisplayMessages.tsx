import React, { useState, useEffect } from 'react'
import { pb } from '@/contexts/pb'
import { formatter } from '@/components/Globals'
import DisplayMessage, { MessageItem } from './DisplayMessage';


export default function DisplayMessages() {

    const [messages, setMessages] = useState<MessageItem[]>([])
    const [messagesLoaded, setMessagesLoaded] = useState(false)


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



    function getMessages() {
        if (messagesLoaded && messages) {
            return messages.map((msgItem: MessageItem, i: number) => (
                <DisplayMessage key={i} msgItem={msgItem} />
            ));
        } else {
            return <div>Loading...</div>;
        }
    }

    return (
        <div
            className="msgsC"
            style={{
                background: "#ccc",
                width: "55%",
                float: "right",
                padding: "20px"
            }}
        >
            <h2>Messages</h2>

            {getMessages()}
        </div >
    );
}
