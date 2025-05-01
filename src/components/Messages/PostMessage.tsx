import React, { useState, ChangeEvent, FormEvent } from 'react';
import { pb } from '@/contexts/pb';

interface Message {
}

interface PostMessageProps {
}

const PostMessage: React.FC<PostMessageProps> = () => {
    const [message, setMessage] = useState<string>('');


    const newMessage = async (message: string) => {
        const currentUser = pb.authStore.record;
        if (!currentUser) {
            alert("Please login first");
            return;
        } else
            if (currentUser.firstName?.length === 0) {
                alert("Please go to Dashboard and enter your name first");
            } else {
                pb.collection('posts').create({ user: currentUser.id, message });
            }
    }

    /**
     * Update form state as the user types.
     */
    const updateFormEdits = (event: ChangeEvent<HTMLTextAreaElement>): void => {
        setMessage(event.target.value);
    };

    /**
     * Handle form submission and pass the new message up.
     */
    const postFormUpdate = (e: FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        newMessage(message);
        // Optionally clear the textarea:
        setMessage('');
    };

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
                    value={message}
                    onChange={updateFormEdits}
                    placeholder="Enter message"
                    style={{ width: "98%", height: "80px" }}
                />
                <br /><br />
                <input
                    type="submit"
                    value="Post Message"
                    style={{ width: "100px", height: "30px" }}
                />
            </form>
        </div>
    );
};

export default PostMessage;
