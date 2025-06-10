/**
 * 
 * @packageDocumentation
 *   Renders a horizontal legend (key) showing each wind code alongside
 *   its corresponding color swatch. Uses a flexible list to wrap items
 *   as needed to fit the available width.
 */

import React from 'react';
import { codes } from '../Globals';

/**
 * Props for the KeyCanvas component.
 *
 * KeyCanvasProps
 * {number} [width] Optional width to constrain the legend container.
 *   (Note: currently not applied in the component.)
 */
interface KeyCanvasProps {
    width?: number;
}

/**
 * KeyCanvas
 *
 * Displays a legend of wind codes. Each list item shows a colored square and
 * the code label. The list is marked with role="list" and styled as a flex row
 * that wraps to multiple lines if necessary.
 *
 * @param props - KeyCanvasProps
 * @returns {React.ReactElement}
 */
export function KeyCanvas(props: KeyCanvasProps): React.ReactElement {
    return (
        <ul
            className="legend"
            role="list"
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                listStyle: 'none',
                padding: 0,
            }}
        >
            {codes.map((c) => (
                <li
                    key={c.code}
                    style={{
                        margin: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
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
}

export default React.memo(KeyCanvas);
