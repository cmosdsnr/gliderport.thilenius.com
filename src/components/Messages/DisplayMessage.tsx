import React from "react";
import { useAuth, Message, MessageItem } from '../../contexts/AuthContext'
import "../../css/message.css"


export default function DisplayMessage(msgItem: MessageItem) {
    const { currentUser, deleteMessage } = useAuth()

    return (
        <div className="message" style={{ paddingBottom: "20px" }}>
            <b>{msgItem.data.date}</b> from {msgItem.data.ownerName.length > 1 ? <>{msgItem.data.ownerName}</> : "unknown"} {
                msgItem.data.uid === currentUser?.id ?
                    <span className="deleteBtn"
                        onClick={() => deleteMessage(msgItem)}
                    >❌</span> : <></>}<br />
            {msgItem.data.msg}
        </div>
    );
}
