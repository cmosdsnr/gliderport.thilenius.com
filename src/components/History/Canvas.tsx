
// src/components/Canvas.tsx
import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface CanvasProps {
    width?: string | number;
    height: number | string;
    children: React.ReactNode;
}

const Canvas: React.FC<CanvasProps> = ({ width = '100%', height, children }) => (
    <ResponsiveContainer width={width} height={height}>
        {React.isValidElement(children) ? children : <></>}
    </ResponsiveContainer>
);

export default Canvas;