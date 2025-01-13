import React from 'react'
import PostMessage from './PostMessage'
import DisplayMessages from './DisplayMessages'
import date from 'date-and-time';
import "../../css/message.css"

export default function MessageBoard() {


    return (
        <div className="msgBoardC" style={{ width: "80%", margin: "40px auto" }}>
            <h1>Feel free to post for all pilots to see!</h1>
            <PostMessage />
            <DisplayMessages />
        </div>
    );
}

