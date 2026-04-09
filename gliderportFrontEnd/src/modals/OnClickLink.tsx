import React from 'react'

/**
 * Props for the OnClickLink component.
 */
export interface OnClickLinkProps {
    fn: () => void;
    color?: string;
    children: React.ReactNode;
}

/**
 * Renders an underlined clickable link that calls the provided function.
 * @param props - The props for the OnClickLink component.
 *   - fn: The function to call on click.
 *   - color: The color of the link (default: '#0040E0').
 *   - children: The content to display inside the link.
 */
export function OnClickLink({ fn, color = '#0040E0', children }: OnClickLinkProps) {
    const linkStyle = {
        color,
        cursor: 'pointer',
    };
    return (
        <u onClick={fn} style={linkStyle}>{children}</u>
    )
}

export default OnClickLink