import React from 'react';
import { pb } from '@/contexts/pb'
import "css/message.css"

export interface MessageItem {
    id: string;
    created: string;
    message: string;
    username: string;
    name: string;
    avatar: string;
    uid: string;
}
interface DisplayMessageProps {
    msgItem: MessageItem;
}

export default function DisplayMessage({ msgItem }: DisplayMessageProps) {

    const deleteMessage = async (msg: MessageItem) => {
        const currentUser = pb.authStore.record;
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

    const currentUser = pb.authStore.record;

    return (
        <div className="message" style={{ paddingBottom: "20px" }}>
            {msgItem.avatar.length > 0 ? <img src={msgItem.avatar} alt="avatar" style={{ width: "50px", borderRadius: "50%" }} /> : <></>}
            <b>  {msgItem.name} / {msgItem.username}</b> posted on <b>{msgItem.created}</b>
            {msgItem.uid === currentUser?.id ?
                <span className="deleteBtn"
                    onClick={() => deleteMessage(msgItem)}
                >❌</span> : <></>}<br />
            {msgItem.message}
        </div>
    );
}
