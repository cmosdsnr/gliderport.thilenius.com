import React from 'react'
import { Button } from 'react-bootstrap'

export default function CreatePost() {
    return (
        <div className="create-post">
            <h1>Create Post</h1>
            <form>
                <div className="form-field">
                    <label>Post Title</label>
                    <input />
                </div>
                <div className="form-field">
                    <label>Post Sub-title</label>
                    <input />
                </div>
                <div className="form-field">
                    <label>Content</label>
                    <textarea />
                </div>

                <Button className="btn btn-success">Create Post</Button>
            </form>
        </div>
    )
}
