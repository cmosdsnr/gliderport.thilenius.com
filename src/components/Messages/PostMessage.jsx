import React, { useState } from "react"
import { useAuth } from '../../contexts/AuthContext'

export default function PostMessage() {
    const [msgItems, setMsgItems] = useState({ msg: "" });

    const { currentUser, saveMessage } = useAuth()

    //Dynamically Update States for the form
    function updateFormEdits(event) {
        const { name, value } = event.target;
        setMsgItems(prevState => ({ ...prevState, [name]: value }));
    }

    //Submit a new post
    function postFormUpdate(e) {
        e.preventDefault();
        saveMessage(msgItems)
    }

    return (
        <div
            className="postMsgC"
            style={{
                background: "#ccc",
                width: "30%",
                float: "left",
                padding: "20px"
            }}
        >
            <form onSubmit={postFormUpdate}>
                <h2>Post A Message</h2>

                <textarea
                    name="msg"
                    value={msgItems.msg}
                    onChange={updateFormEdits}
                    placeholder="Enter message"
                    style={{ width: "98%", height: "80px" }}
                />
                <br />
                <br />
                <input
                    type="submit"
                    value="Post Message"
                    style={{ width: "100px", height: "30px" }}
                />
            </form>
        </div>
    );
}
