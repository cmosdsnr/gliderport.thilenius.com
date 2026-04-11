/**
 * Module providing a component to render individual chat messages.
 * It displays avatar, author name, timestamp, and allows deletion
 * of messages owned by the current user via PocketBase.
 *
 * @packageDocumentation DisplayMessage
 */
import React from 'react'
import { Button } from 'react-bootstrap'
import { pb } from '@/contexts/pb'

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
export interface DisplayMessageProps {
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
        <div className="d-flex gap-3 mb-3 pb-3 border-bottom">
            {msgItem.avatar.length > 0
                ? <img
                    src={msgItem.avatar}
                    alt="avatar"
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                : <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#dee2e6', flexShrink: 0 }} />
            }
            <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <span className="fw-semibold">{msgItem.name}</span>
                        <span className="text-muted ms-1 small">@{msgItem.username}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <small className="text-muted">{msgItem.created}</small>
                        {msgItem.uid === currentUser?.id ? (
                            <Button variant="outline-danger" size="sm" onClick={() => deleteMessage(msgItem)}>Delete</Button>
                        ) : null}
                    </div>
                </div>
                <p className="mb-0 mt-1">{msgItem.message}</p>
            </div>
        </div>
    )
}

export default DisplayMessage;
