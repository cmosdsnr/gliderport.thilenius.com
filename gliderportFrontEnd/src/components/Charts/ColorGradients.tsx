/**
 * Utility functions for color blending and gradient generation using D3.
 *
 * Provides functions to blend two hex colors by a given percentage and
 * to generate SVG linearGradient definitions for heatmap-like color scales.
 *
 * @packageDocumentation d3Gradients
 */

import * as d3 from 'd3';

/**
 * Converts a number in [0,255] to a 2-digit hexadecimal string.
 * @param num - The number to convert (will be rounded).
 * @returns A two-character hex string (e.g. "0a", "ff").
 */
function int_to_hex(num: number): string {
    let hex = Math.round(num).toString(16);
    if (hex.length === 1) {
        hex = '0' + hex;
    }
    return hex;
}

/**
 * Blends two hex colors by a specified fraction.
 *
 * @param color1 - The first color as "#rrggbb" or shorthand "#rgb". Defaults to black if null.
 * @param color2 - The second color as "#rrggbb" or shorthand "#rgb". Defaults to white if null.
 * @param percentage - Blend amount from color1 (0) to color2 (1). Defaults to 0.5 if null.
 * @returns The blended color in full hex format "#rrggbb".
 */
export function blendColors(
    color1: null | string,
    color2: null | string,
    percentage: null | number
): string {
    // sanitize inputs
    color1 = color1 || '#000000';
    color2 = color2 || '#ffffff';
    percentage = percentage ?? 0.5;

    // expand shorthand (#rgb) to full form
    if (color1.length === 4) {
        color1 = color1[1] + color1[1] + color1[2] + color1[2] + color1[3] + color1[3];
    } else {
        color1 = color1.substring(1);
    }
    if (color2.length === 4) {
        color2 = color2[1] + color2[1] + color2[2] + color2[2] + color2[3] + color2[3];
    } else {
        color2 = color2.substring(1);
    }

    // parse RGB components
    const c1 = [
        parseInt(color1.slice(0, 2), 16),
        parseInt(color1.slice(2, 4), 16),
        parseInt(color1.slice(4, 6), 16)
    ];
    const c2 = [
        parseInt(color2.slice(0, 2), 16),
        parseInt(color2.slice(2, 4), 16),
        parseInt(color2.slice(4, 6), 16)
    ];

    // interpolate each channel
    const c3 = [0, 1, 2].map(i => (1 - percentage!) * c1[i] + percentage! * c2[i]);

    // convert back to hex
    return '#' + c3.map(v => int_to_hex(v)).join('');
}

/**
 * Predefined color palettes for heatmap gradients.
 * Each sub-array represents a qualitative scale of five colors.
 */
export const colors: string[][] = [
    ['#ffbbbb', '#0066cc', '#00ffff', '#00b300', '#e6ff99'], // good
    ['#e0c5c5', '#7aa3cc', '#7ae0e0', '#66c066', '#dcebad'], // poor
    ['#d4c9c9', '#adbdcc', '#add4d4', '#99c699', '#d5deba']  // bad
];

/**
 * Appends multiple <linearGradient> definitions to an SVG <defs> element.
 * Generates both main gradients and transitional blends based on dataMax.
 *
 * @param svgDefs - D3 Selection of an SVG <defs> element to append gradients into.
 * @param dataMax - Maximum data value used to compute stop offsets.
 * @throws If `mainGradient` is reassigned without declaration, a runtime error may occur.
 */
export function getGradients(
    svgDefs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
    dataMax: number
): void {
    // Transition index pairs for blending between palettes
    const transitions = [[0, 1], [1, 2], [2, 1], [1, 0], [0, 2], [2, 0]];

    // Create main gradients for each palette
    for (let i = 0; i < colors.length; i++) {
        const mainGradient = svgDefs.append('linearGradient')
            .attr('id', `mg${i}`)
            .attr('gradientTransform', 'rotate(90)');
        if (dataMax > 21) {
            mainGradient.append('stop').attr('stop-color', colors[i][0]).attr('offset', '0');
            mainGradient.append('stop').attr('stop-color', colors[i][1]).attr('offset', `${(dataMax - 19) / dataMax}`);
            mainGradient.append('stop').attr('stop-color', colors[i][2]).attr('offset', `${(dataMax - 13) / dataMax}`);
            mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', `${(dataMax - 9) / dataMax}`);
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', `${(dataMax - 6) / dataMax}`);
        } else if (dataMax > 15) {
            mainGradient.append('stop').attr('stop-color', colors[i][1]).attr('offset', '0');
            mainGradient.append('stop').attr('stop-color', colors[i][2]).attr('offset', `${(dataMax - 13) / dataMax}`);
            mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', `${(dataMax - 9) / dataMax}`);
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', `${(dataMax - 6) / dataMax}`);
        } else if (dataMax > 11) {
            mainGradient.append('stop').attr('stop-color', colors[i][2]).attr('offset', '0');
            mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', `${(dataMax - 9) / dataMax}`);
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', `${(dataMax - 6) / dataMax}`);
        } else if (dataMax > 8) {
            mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', '0');
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', `${(dataMax - 6) / dataMax}`);
        } else {
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', '0');
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', '1');
        }
    }

    // Transitional gradients between palettes
    transitions.forEach((pair, idx) => {
        for (let j = 1; j <= 5; j++) {
            const [a, b] = pair;
            const grad = svgDefs.append('linearGradient')
                .attr('id', `gd${idx}-${j - 1}`)
                .attr('gradientTransform', 'rotate(90)');
            const frac = j / 6;
            if (dataMax > 21) {
                colors[a].forEach((col, k) => {
                    grad.append('stop')
                        .attr('stop-color', blendColors(col, colors[b][k], frac))
                        .attr('offset', `${[0, (dataMax - 19) / dataMax, (dataMax - 13) / dataMax, (dataMax - 9) / dataMax, (dataMax - 6) / dataMax][k]}`);
                });
            } else if (dataMax > 15) {
                [1, 2, 3, 4].forEach((k, i2) => {
                    grad.append('stop')
                        .attr('stop-color', blendColors(colors[a][k], colors[b][k], frac))
                        .attr('offset', `${[0, (dataMax - 13) / dataMax, (dataMax - 9) / dataMax, (dataMax - 6) / dataMax][i2]}`);
                });
            } else if (dataMax > 11) {
                [2, 3, 4].forEach((k, i2) => {
                    grad.append('stop')
                        .attr('stop-color', blendColors(colors[a][k], colors[b][k], frac))
                        .attr('offset', `${[0, (dataMax - 9) / dataMax, (dataMax - 6) / dataMax][i2]}`);
                });
            } else if (dataMax > 8) {
                [3, 4].forEach((k, i2) => {
                    grad.append('stop')
                        .attr('stop-color', blendColors(colors[a][k], colors[b][k], frac))
                        .attr('offset', `${[0, (dataMax - 6) / dataMax][i2]}`);
                });
            } else {
                grad.append('stop').attr('stop-color', blendColors(colors[a][4], colors[b][4], frac)).attr('offset', '0');
                grad.append('stop').attr('stop-color', blendColors(colors[a][4], colors[b][4], frac)).attr('offset', '1');
            }
        }
    });
}
