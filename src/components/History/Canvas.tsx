/**
 * Canvas component for responsive chart containers.
 *
 * This component wraps the Recharts ResponsiveContainer to provide
 * configurable width and height, and ensures that the child element
 * is a valid React element before rendering.
 */
// src/components/Canvas.tsx
import React from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * Props for the Canvas component.
 */
interface CanvasProps {
    /**
     * Width of the container (CSS value or number). Defaults to '100%'.
     */
    width?: string | number;
    /**
     * Height of the container (CSS value or number).
     */
    height: number | string;
    /**
     * The chart component to render inside the responsive container.
     */
    children: React.ReactNode;
}

/**
 * Canvas component.
 *
 * @param props - Component props.
 * @returns {React.ReactElement} Responsive container wrapping the child component.
 */
export function Canvas({ width = '100%', height, children }: CanvasProps): React.ReactElement {
    return (
        <ResponsiveContainer width={width} height={height}>
            {React.isValidElement(children) ? children : <></>}
        </ResponsiveContainer>
    );
}

export default Canvas;
