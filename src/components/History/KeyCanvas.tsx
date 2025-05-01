
// src/components/KeyCanvas.tsx
import React from 'react';
import { codes } from '../Globals';

interface KeyCanvasProps {
    width?: number;
}

const KeyCanvas: React.FC<KeyCanvasProps> = () => (
    <ul
        className="legend"
        role="list"
        style={{ display: 'flex', flexWrap: 'wrap', listStyle: 'none', padding: 0 }}
    >
        {codes.map((c) => (
            <li
                key={c.code}
                style={{ margin: '4px 8px', display: 'flex', alignItems: 'center' }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        width: 16,
                        height: 16,
                        backgroundColor: c.color,
                        display: 'inline-block',
                        marginRight: 4,
                    }}
                />
                <span>{c.code}</span>
            </li>
        ))}
    </ul>
);

export default React.memo(KeyCanvas);
