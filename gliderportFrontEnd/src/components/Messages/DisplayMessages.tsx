/**
 * DisplayMessages component fetches and renders a list of chat messages
 * from the 'posts' PocketBase collection, subscribes to realtime updates,
 * and formats messages for display using DisplayMessage.
 *
 * @packageDocumentation DisplayMessages
 */
import React, { useState, useEffect } from 'react'
import { Card } from 'react-bootstrap'
import { pb } from '@/contexts/pb'
import { formatter } from '@/components/Globals'
import DisplayMessage, { MessageItem } from './DisplayMessage'

/** Expanded PocketBase user record fields returned when `expand: 'user'` is requested. */
interface RecordUser {
    id: string;
    username?: string;
    avatar?: string;
    name?: string;
}

/**
 * Minimal shape of a `posts` collection record as returned by PocketBase,
 * including the optionally-expanded `user` relation.
 */
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

    /**
     * On mount: loads the initial message list then subscribes to realtime
     * `create`, `update`, and `delete` events on the `posts` PocketBase collection
     * so the UI reflects changes made by any connected client without a page refresh.
     * Returns a cleanup function that unsubscribes when the component unmounts.
     */
    useEffect(() => {
        loadInitialMessages(setMessages)

        pb.collection('posts').subscribe('*', e => {
            setMessages(prev => {
                let updated = [...prev]
                /**
                 * Normalises a raw PocketBase record into the {@link MessageItem} shape
                 * expected by {@link DisplayMessage}.
                 */
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
            pb.collection('posts').unsubscribe()
        }
    }, [])

    return (
        <Card className="shadow-sm h-100">
            <Card.Header className="fw-semibold">Messages</Card.Header>
            <Card.Body style={{ maxHeight: '520px', overflowY: 'auto' }}>
                {getMessages(messagesLoaded, messages)}
            </Card.Body>
        </Card>
    )
}

export default DisplayMessages
