/**
 * DisplayMessages component fetches and renders a list of chat messages
 * from the 'posts' PocketBase collection, subscribes to realtime updates,
 * and formats messages for display using DisplayMessage.
 *
 * @packageDocumentation DisplayMessages
 */
import React, { useState, useEffect } from 'react'
import { pb } from '@/contexts/pb'
import { formatter } from '@/components/Globals'
import DisplayMessage, { MessageItem } from './DisplayMessage'

interface RecordUser {
    id: string;
    username?: string;
    avatar?: string;
    name?: string;
}

interface RecordType {
    id: string;
    created?: string;
    message: string;
    user: string;
    expand?: {
        user?: RecordUser;
    };
}

/**
 * Loads the initial set of messages from PocketBase,
 * expands the 'user' relation, formats each record,
 * and updates component state.
 *
 * @async
 * @function loadInitialMessages
 * @param setMessages - State setter for messages
 * @returns {Promise<void>}
 */
async function loadInitialMessages(setMessages: React.Dispatch<React.SetStateAction<MessageItem[]>>): Promise<void> {
    try {
        const records = await pb.collection('posts').getFullList(200, { expand: 'user' })
        const msgs = records.map(record => ({
            id: record.id,
            created: record.created ? formatter.format(new Date(record.created)) : 'Unknown',
            message: record.message,
            username: record.expand?.user?.username ?? 'Unknown',
            avatar: record.expand?.user?.avatar
                ? pb.files.getURL(record.expand.user, record.expand.user.avatar)
                : '',
            name: record.expand?.user?.name ?? 'Unknown',
            uid: record.user,
        }))
        setMessages(msgs)
    } catch (err) {
        console.error('Error loading messages:', err)
    }
}

/**
 * Renders the list of messages or a loading indicator.
 * @function getMessages
 * @param messagesLoaded - Whether messages are loaded
 * @param messages - The array of MessageItem
 * @returns {React.ReactElement} Array of DisplayMessage elements or a loading div.
 */
function getMessages(messagesLoaded: boolean, messages: MessageItem[]): React.ReactElement {
    if (!messagesLoaded) {
        return <div>Loading...</div>
    }
    return (
        <>
            {messages.map((msgItem) => (
                <DisplayMessage key={msgItem.id} msgItem={msgItem} />
            ))}
        </>
    )
}

/**
 * React component that loads and displays a list of messages,
 * handling creation, update, and deletion in realtime.
 *
 * @returns {React.ReactElement} The rendered list of messages.
 */
export function DisplayMessages(): React.ReactElement {
    const [messages, setMessages] = useState<MessageItem[]>([])
    const [messagesLoaded, setMessagesLoaded] = useState<boolean>(false)

    useEffect(() => {
        // Load initial messages on mount
        loadInitialMessages(setMessages)

        // Subscribe to realtime events: create, update, delete
        pb.collection('posts').subscribe('*', e => {
            setMessages(prev => {
                let updated = [...prev]
                const formatRecord = (rec: RecordType): MessageItem => ({
                    id: rec.id,
                    created: rec.created ? formatter.format(new Date(rec.created)) : 'Unknown',
                    message: rec.message,
                    username: rec.expand?.user?.username ?? 'Unknown',
                    avatar: rec.expand?.user?.avatar
                        ? pb.files.getURL(rec.expand.user, rec.expand.user.avatar)
                        : '',
                    name: rec.expand?.user?.name ?? 'Unknown',
                    uid: rec.user,
                })

                if (e.action === 'create') {
                    updated.push(formatRecord(e.record as unknown as RecordType))
                } else if (e.action === 'update') {
                    updated = updated.map(msg =>
                        msg.id === e.record.id ? formatRecord(e.record as unknown as RecordType) : msg
                    )
                } else if (e.action === 'delete') {
                    updated = updated.filter(msg => msg.id !== e.record.id)
                }

                return updated
            })
        })

        setMessagesLoaded(true)

        return () => {
            // Cleanup realtime subscription
            pb.collection('posts').unsubscribe()
        }
    }, [])

    return (
        <div
            className="msgsC"
            style={{ background: '#ccc', width: '55%', float: 'right', padding: '20px' }}
        >
            <h2>Messages</h2>
            {getMessages(messagesLoaded, messages)}
        </div>
    )
}

export default DisplayMessages
