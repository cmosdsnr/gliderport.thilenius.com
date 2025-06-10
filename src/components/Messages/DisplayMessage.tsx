/**
 * Module providing a component to render individual chat messages.
 * It displays avatar, author name, timestamp, and allows deletion
 * of messages owned by the current user via PocketBase.
 *
 * @packageDocumentation DisplayMessage
 */
import React from 'react'
import { pb } from '@/contexts/pb'
import "css/message.css"

/**
 * Represents a single message record.
 * MessageItem
 * {string} id - Unique identifier of the message.
 * {string} created - Creation timestamp (ISO format).
 * {string} message - Text content of the message.
 * {string} username - Author's username.
 * {string} name - Author's display name.
 * {string} avatar - URL to the author's avatar image.
 * {string} uid - PocketBase user ID of the author.
 */
export interface MessageItem {
    id: string
    created: string
    message: string
    username: string
    name: string
    avatar: string
    uid: string
}

/**
 * Props for the DisplayMessage component.
 * DisplayMessageProps
 * {MessageItem} msgItem - The message data to display.
 */
interface DisplayMessageProps {
    msgItem: MessageItem
}

/**
 * Deletes the specified message if the current user is the author.
 * Prompts for confirmation and logs result to console.
 * @async
 * @param {MessageItem} msg - The message item to delete.
 * @returns {Promise<void>}
 */
async function deleteMessage(msg: MessageItem): Promise<void> {
    const currentUser = pb.authStore.record
    if (msg.uid === currentUser?.id) {
        if (confirm("Do you want to delete this message?")) {
            try {
                await pb.collection('posts').delete(msg.id)
                console.log(`Message ${msg.id} deleted successfully.`)
            } catch (error) {
                console.error(`Error deleting message ${msg.id}:`, error)
            }
        }
    } else {
        alert("You can only delete your own messages")
    }
}

/**
 * Displays a chat message with avatar, author, timestamp, and
 * a delete button when the current user is the author.
 *
 * @param {DisplayMessageProps} props - Component props.
 * @returns {React.ReactElement} Rendered message item.
 */
export function DisplayMessage({ msgItem }: DisplayMessageProps): React.ReactElement {
    const currentUser = pb.authStore.record

    return (
        <div className="message" style={{ paddingBottom: "20px" }}>
            {msgItem.avatar.length > 0
                ? <img
                    src={msgItem.avatar}
                    alt="avatar"
                    style={{ width: "50px", borderRadius: "50%" }}
                />
                : <></>
            }
            <b>{msgItem.name} / {msgItem.username}</b> posted on <b>{msgItem.created}</b>
            {msgItem.uid === currentUser?.id ? (
                <span
                    className="deleteBtn"
                    onClick={() => deleteMessage(msgItem)}
                >❌</span>
            ) : <></>}
            <br />
            {msgItem.message}
        </div>
    )
}

export default DisplayMessage;
