import React from 'react';
import DisplayMessage from './DisplayMessage';
import { useAuth } from 'contexts/AuthContextPocketbase'


export default function DisplayMessages() {
    const { messages, messagesLoaded } = useAuth()

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
