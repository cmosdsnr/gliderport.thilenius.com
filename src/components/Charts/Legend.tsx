/**
 * Legend component renders a semicircular wind-direction color legend using D3.
 * It dynamically resizes to its container width and draws colored wedges,
 * gradient definitions, directional markers, and annotations.
 *
 * @packageDocumentation Legend
 */
import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { colors, blendColors } from './ColorGradients';

/**
 * Legend component.
 * @returns {React.ReactElement} A div containing the D3-rendered legend.
 */
export function Legend(): React.ReactElement {
    const [svgWidth, setSvgWidth] = useState<number>(0);
    const rowRef = useRef<HTMLDivElement>(null);

    /**
     * Update svgWidth to match container width on mount and resize.
     */
    useEffect(() => {
        const resizeAndDraw = () => {
            const container = rowRef.current;
            if (!container) {
                console.warn('Legend: container ref is not set');
                return;
            }
            setSvgWidth(container.clientWidth);
        };

        resizeAndDraw();
        window.addEventListener('resize', resizeAndDraw);
        return () => {
            window.removeEventListener('resize', resizeAndDraw);
        };
    }, []);

    /**
     * Draws the legend when svgWidth changes.
     * Clears previous drawing and rebuilds the SVG elements.
     */
    useEffect(() => {
        // Select and clear container
        const svgContainer = d3.select(rowRef.current);
        svgContainer.selectAll('*').remove();

        /**
         * Generate an SVG path data string for a wedge.
         * @param {number} cx - X-coordinate of center.
         * @param {number} cy - Y-coordinate of center.
         * @param {number} startAngle - Starting angle in degrees.
         * @param {number} endAngle - Ending angle in degrees.
         * @param {number} radius - Radius of the wedge.
         * @returns {string} The SVG path data string.
         */
        function generateWedgeString(
            cx: number,
            cy: number,
            startAngle: number,
            endAngle: number,
            radius: number
        ): string {
            const x1 = cx + radius * Math.cos((Math.PI * startAngle) / 180);
            const y1 = cy + radius * Math.sin((Math.PI * startAngle) / 180);
            const x2 = cx + radius * Math.cos((Math.PI * endAngle) / 180);
            const y2 = cy + radius * Math.sin((Math.PI * endAngle) / 180);
            return (
                `M${cx} ${cy}` +
                ` L${x1} ${y1}` +
                ` A${radius} ${radius} 0 0 1 ${x2} ${y2}` +
                ' z'
            );
        }

        // Create SVG root and defs
        const svg = svgContainer
            .append('svg')
            .attr('height', 600)
            .attr('width', svgWidth)
            .append('g');
        const svgDefs = svg.append('defs');

        // Draw 30 wedges with radial gradients
        for (let i = 0; i < 30; i++) {
            // Determine palette indices
            let j = Math.floor(i / 5);
            let l = j;
            if (i < 4 || i > 26) j = 2;
            else if (i < 7 || i > 23) j = 1;
            else j = 0;
            if (i < 1 || i > 29) l = 2;
            else if (i < 5 || i > 25) l = 1;
            else l = 0;

            // Blend fraction for gradient
            let m = 0;
            if (i === 1 || i === 29) m = 0.75;
            else if (i === 2 || i === 28) m = 0.5;
            else if (i === 3 || i === 27) m = 0.25;
            else if (i === 5 || i === 25) m = 0.67;
            else if (i === 6 || i === 24) m = 0.33;

            // Define radial gradient for this wedge
            const mainGradient = svgDefs
                .append('radialGradient')
                .attr('id', `cc${i}`);
            [0, 1, 2, 3, 4].forEach((k, idx) => {
                mainGradient
                    .append('stop')
                    .attr('stop-color', blendColors(colors[l][4 - idx], colors[j][4 - idx], m))
                    .attr('offset', [0.25, 0.45, 0.6, 0.8, 0.98][idx].toString());
            });

            // Create clip path for wedge
            svg
                .append('clipPath')
                .attr('id', `ccClip${i}`)
                .append('path')
                .attr('d', generateWedgeString(400, 300, 130 + 3 * i, 133 + 3 * i + 0.1, 350));

            // Draw the wedge using the gradient
            svg
                .append('circle')
                .attr('cx', 400)
                .attr('cy', 300)
                .attr('r', 350)
                .style('stroke-width', 0)
                .style('fill', `url(#cc${i})`)
                .attr('clip-path', `url(#ccClip${i})`);
        }

        // Define arrow marker for baselines
        const markerSize = 10;
        svgDefs
            .append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', [0, 0, markerSize, markerSize])
            .attr('refX', markerSize)
            .attr('refY', markerSize / 2)
            .attr('markerWidth', markerSize)
            .attr('markerHeight', markerSize)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', d3.line()!([[0, 0], [0, markerSize], [markerSize, markerSize / 2]]))
            .attr('stroke', 'black')
            .attr('fill', 'black');

        // Draw baseline with arrow
        svg
            .append('path')
            .attr('d', d3.line()!([[400, 300], [40, 300]]))
            .attr('stroke', 'black')
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrow)');

        // Draw opposite baseline (grey, slight rotation)
        svg
            .append('path')
            .attr('transform', 'translate(0,0) rotate(-5, 400, 300)')
            .attr('d', d3.line()!([[400, 300], [0, 300]]))
            .attr('stroke', 'grey')
            .attr('fill', 'none')
            .attr('marker-end', 'url(#arrow)');

        // Draw outer arc
        svg
            .append('clipPath')
            .attr('id', 'arch')
            .append('path')
            .attr('d', generateWedgeString(400, 300, 130, 221, 350));
        svg
            .append('circle')
            .attr('cx', 400)
            .attr('cy', 300)
            .attr('r', 350)
            .style('stroke-width', 2)
            .style('stroke', 'black')
            .style('fill', 'none')
            .attr('clip-path', 'url(#arch)');

        // Concentric circles inside arc
        for (let i = 0; i < 6; i++) {
            svg
                .append('circle')
                .attr('cx', 400)
                .attr('cy', 300)
                .attr('r', 65 * (i + 1))
                .style('stroke-width', 2)
                .style('stroke', 'black')
                .style('fill', 'none')
                .attr('clip-path', 'url(#arch)');
        }

        // Label 'cliff' at left edge
        svg
            .append('text')
            .attr('x', 10)
            .attr('y', 299)
            .text('cliff')
            .style('font', '15px times')
            .attr('transform', 'translate(0,0) rotate(-5, 400, 300)');

        // Tick marks and labels around arc
        for (let i = 0; i < 10; i++) {
            const angle = -50 + i * 10;
            svg
                .append('path')
                .attr('transform', `translate(0,0) rotate(${angle}, 400, 300)`)
                .attr('d', d3.line()!([[60, 300], [40, 300]]))
                .attr('stroke', 'black');

            svg
                .append('text')
                .attr('x', 10)
                .attr('y', 306)
                .text((220 + i * 10).toString())
                .style('font', '15px times')
                .attr('transform', `translate(0,0) rotate(${angle}, 400, 300)`);
        }
    }, [svgWidth]);

    return <div ref={rowRef} />;
}

export default Legend;
