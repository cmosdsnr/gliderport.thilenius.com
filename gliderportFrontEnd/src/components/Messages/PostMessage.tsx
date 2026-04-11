/**
 *
 * @packageDocumentation Component for posting messages to the PocketBase 'posts' collection.
 */
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { pb } from '@/contexts/pb';

/**
 * Represents a message record. Currently unused; consider defining fields or removing.
 */
export interface Message { }

/**
 * Props for the PostMessage component. Currently no props are used.
 */
export interface PostMessageProps { }

/**
 * PostMessage component renders a form for users to submit new messages.
 * @returns {React.ReactElement} The message post form UI.
 */
export function PostMessage(props: PostMessageProps): React.ReactElement {
    const [message, setMessage] = useState<string>('');

    /**
     * Creates a new message post in the 'posts' collection.
     * @async
     * @param {string} message - The content of the message to post.
     * @returns {Promise<void>}
     */
    const newMessage = async (message: string): Promise<void> => {
        const currentUser = pb.authStore.record;
        if (!currentUser) {
            alert("Please login first");
            return;
        } else if (!currentUser.firstName || currentUser.firstName.length === 0) {
            alert("Please go to Dashboard and enter your name first");
            return;
        }

        try {
            // Await creation and handle potential errors
            await pb.collection('posts').create({ user: currentUser.id, message });
        } catch (error) {
            console.error('Failed to post message:', error);
            alert('An error occurred while posting your message.');
        }
    };

    /**
     * Update message state as the user types in the textarea.
     * @param {ChangeEvent<HTMLTextAreaElement>} event - The change event from the textarea.
     */
    const updateFormEdits = (event: ChangeEvent<HTMLTextAreaElement>): void => {
        setMessage(event.target.value);
    };

    /**
     * Handle form submission, send the new message, and clear the textarea.
     * @param {FormEvent<HTMLFormElement>} e - The form submission event.
     */
    const postFormUpdate = (e: FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        newMessage(message);
        setMessage('');
    };

    return (
        <Card className="shadow-sm h-100">
            <Card.Header className="fw-semibold">Post a Message</Card.Header>
            <Card.Body>
                <Form onSubmit={postFormUpdate}>
                    <Form.Control
                        as="textarea"
                        rows={4}
                        value={message}
                        onChange={updateFormEdits}
                        placeholder="Share conditions, tips, or a message for fellow pilots..."
                        className="mb-3"
                    />
                    <Button variant="primary" type="submit">Post Message</Button>
                </Form>
            </Card.Body>
        </Card>
    );
}

export default PostMessage;
