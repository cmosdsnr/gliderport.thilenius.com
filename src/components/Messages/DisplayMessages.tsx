import React from "react";
import DisplayMessage from "./DisplayMessage";
import { useAuth, MessageItem } from '../../contexts/AuthContext'


export default function DisplayMessages(): JSX.Element {
    const { messages, messagesLoaded } = useAuth()

    function getMessages(): JSX.Element | JSX.Element[] {
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
