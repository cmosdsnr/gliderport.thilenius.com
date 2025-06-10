/**
 * MessageBoard module renders the message posting form and the list of messages.
 * It provides a container for users to post new messages and view existing ones.
 *
 * @packageDocumentation MessageBoard
 */
import React from 'react'
import PostMessage from './PostMessage'
import DisplayMessages from './DisplayMessages'
import 'css/message.css'

/**
 * React component that displays a message board with a posting form
 * and a list of existing messages.
 *
 * @returns {React.ReactElement} The rendered message board.
 */
export function MessageBoard(): React.ReactElement {
    return (
        <div className="msgBoardC" style={{ width: '80%', margin: '40px auto' }}>
            <h1>Feel free to post for all pilots to see!</h1>
            <PostMessage />
            <DisplayMessages />
        </div>
    )
}
export default MessageBoard;