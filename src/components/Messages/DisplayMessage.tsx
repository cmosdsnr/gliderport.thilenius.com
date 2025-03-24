import React from 'react';
import { useAuth } from 'contexts/AuthContextPocketbase'
import "css/message.css"
interface DisplayMessageProps {

    msgItem: MessageItem;

}


export default function DisplayMessage({ msgItem }: DisplayMessageProps) {
    const { currentUser, deleteMessage } = useAuth()

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
