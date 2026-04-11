/**
 * MessageBoard module renders the message posting form and the list of messages.
 * It provides a container for users to post new messages and view existing ones.
 *
 * @packageDocumentation MessageBoard
 */
import React from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import PostMessage from './PostMessage'
import DisplayMessages from './DisplayMessages'

/**
 * React component that displays a message board with a posting form
 * and a list of existing messages.
 *
 * @returns {React.ReactElement} The rendered message board.
 */
export function MessageBoard(): React.ReactElement {
    return (
        <Container className="py-4" style={{ maxWidth: '960px' }}>
            <h2 className="mb-4">Community Board</h2>
            <p className="text-muted mb-4">Feel free to post for all pilots to see!</p>
            <Row className="g-4">
                <Col md={4}>
                    <PostMessage />
                </Col>
                <Col md={8}>
                    <DisplayMessages />
                </Col>
            </Row>
        </Container>
    )
}
export default MessageBoard;
