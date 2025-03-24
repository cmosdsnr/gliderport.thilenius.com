import React from 'react'

const OnClickLink = ({ fn, color = '#0040E0', children }: any) => {
    const linkStyle = {
        color,
        cursor: 'pointer',
    };
    return (
        <u onClick={fn} style={linkStyle}>{children}</u>
    )
}

export default OnClickLink