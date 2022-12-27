
function int_to_hex(num) {
    var hex = Math.round(num).toString(16);
    if (hex.length === 1)
        hex = '0' + hex;
    return hex;
}

export function blendColors(color1, color2, percentage) {
    // check input
    color1 = color1 || '#000000';
    color2 = color2 || '#ffffff';
    percentage = percentage || 0.5;

    if (color1.length === 4)
        color1 = color1[1] + color1[1] + color1[2] + color1[2] + color1[3] + color1[3];
    else
        color1 = color1.substring(1);
    if (color2.length === 4)
        color2 = color2[1] + color2[1] + color2[2] + color2[2] + color2[3] + color2[3];
    else
        color2 = color2.substring(1);


    color1 = [parseInt(color1[0] + color1[1], 16), parseInt(color1[2] + color1[3], 16), parseInt(color1[4] + color1[5], 16)];
    color2 = [parseInt(color2[0] + color2[1], 16), parseInt(color2[2] + color2[3], 16), parseInt(color2[4] + color2[5], 16)];

    // 4: blend
    var color3 = [
        (1 - percentage) * color1[0] + percentage * color2[0],
        (1 - percentage) * color1[1] + percentage * color2[1],
        (1 - percentage) * color1[2] + percentage * color2[2]
    ];

    // 5: convert to hex
    color3 = '#' + int_to_hex(color3[0]) + int_to_hex(color3[1]) + int_to_hex(color3[2]);

    // return hex
    return color3;
}

export const colors = [
    ["#ffbbbb", "#0066cc", "#00ffff", "#00b300", "#e6ff99"], //good
    ["#e0c5c5", "#7aa3cc", "#7ae0e0", "#66c066", "#dcebad"], //poor
    ["#d4c9c9", "#adbdcc", "#add4d4", "#99c699", "#d5deba"]  //bad
]

export function getGradients(svgDefs, dataMax) {

    const transitions = [[0, 1], [1, 2], [2, 1], [1, 0], [0, 2], [2, 0]]


    // const colors = [
    //     ["#ffbbbb", "#0066cc", "#00ffff", "#00b300", "#CC9966"],  //good
    //     ["#ffbbbb", "#ddbb22", "#ddbb22", "#aabb22", "#ddaa77"],  //poor
    //     ["#ffbbbb", "#ffbb66", "#ffbb66", "#bbbb66", "#eebb88"],  //bad
    // ]
    // const colors = [
    //     ["#ffbbbb", "#0066cc", "#00ffff", "#00b300", "#CC9966"],  //good
    //     ["#ffbbbb", "#77aacc", "#ccffdd", "#77bb22", "#ddaa77"],  //poor
    //     ["#ffbbbb", "#8899aa", "#eeffcc", "#99bb66", "#eebb88"],  //bad
    // ]


    for (let i = 0; i < 3; i++) {
        var mainGradient = svgDefs.append('linearGradient').attr('id', 'mg' + i).attr("gradientTransform", "rotate(90)")
        if (dataMax > 21) {
            mainGradient.append('stop').attr('stop-color', colors[i][0]).attr('offset', '0')
            mainGradient.append('stop').attr('stop-color', colors[i][1]).attr('offset', (dataMax - 19) / dataMax)
            mainGradient.append('stop').attr('stop-color', colors[i][2]).attr('offset', (dataMax - 13) / dataMax)
            mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', (dataMax - 9) / dataMax)
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', (dataMax - 6) / dataMax)
        }
        else if (dataMax > 15) {
            mainGradient.append('stop').attr('stop-color', colors[i][1]).attr('offset', 0)
            mainGradient.append('stop').attr('stop-color', colors[i][2]).attr('offset', (dataMax - 13) / dataMax)
            mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', (dataMax - 9) / dataMax)
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', (dataMax - 6) / dataMax)
        }
        else if (dataMax > 11) {
            mainGradient.append('stop').attr('stop-color', colors[i][2]).attr('offset', 0)
            mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', (dataMax - 9) / dataMax)
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', (dataMax - 6) / dataMax)
        }
        else if (dataMax > 8) {
            mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', 0)
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', (dataMax - 6) / dataMax)
        }
        else {
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', 0)
            mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', 1)
        }
    }

    transitions.forEach((v, i) => {
        for (let j = 1; j < 6; j++) {
            const z = j - 1
            var mainGradient = svgDefs.append('linearGradient').attr('id', 'gd' + i + '-' + z).attr("gradientTransform", "rotate(90)")
            if (dataMax > 21) {
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][0], colors[v[1]][0], j / 6)).attr('offset', '0')
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][1], colors[v[1]][1], j / 6)).attr('offset', (dataMax - 19) / dataMax)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][2], colors[v[1]][2], j / 6)).attr('offset', (dataMax - 13) / dataMax)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][3], colors[v[1]][3], j / 6)).attr('offset', (dataMax - 9) / dataMax)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][4], colors[v[1]][4], j / 6)).attr('offset', (dataMax - 6) / dataMax)
            }
            else if (dataMax > 15) {
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][1], colors[v[1]][1], j / 6)).attr('offset', 0)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][2], colors[v[1]][2], j / 6)).attr('offset', (dataMax - 13) / dataMax)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][3], colors[v[1]][3], j / 6)).attr('offset', (dataMax - 9) / dataMax)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][4], colors[v[1]][4], j / 6)).attr('offset', (dataMax - 6) / dataMax)
            }
            else if (dataMax > 11) {
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][2], colors[v[1]][2], j / 6)).attr('offset', 0)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][3], colors[v[1]][3], j / 6)).attr('offset', (dataMax - 9) / dataMax)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][4], colors[v[1]][4], j / 6)).attr('offset', (dataMax - 6) / dataMax)
            }
            else if (dataMax > 8) {
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][3], colors[v[1]][3], j / 6)).attr('offset', 0)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][4], colors[v[1]][4], j / 6)).attr('offset', (dataMax - 6) / dataMax)
            }
            else {
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][4], colors[v[1]][4], j / 6)).attr('offset', 0)
                mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][4], colors[v[1]][4], j / 6)).attr('offset', 1)
            }
        }
    })


    for (let i = 0; i < 3; i++) {
        mainGradient = svgDefs.append('linearGradient').attr('id', 'kg' + i).attr("gradientTransform", "rotate(90)")
        mainGradient.append('stop').attr('stop-color', colors[i][0]).attr('offset', '0')
        mainGradient.append('stop').attr('stop-color', colors[i][1]).attr('offset', (22 - 19) / 22)
        mainGradient.append('stop').attr('stop-color', colors[i][2]).attr('offset', (22 - 13) / 22)
        mainGradient.append('stop').attr('stop-color', colors[i][3]).attr('offset', (22 - 9) / 22)
        mainGradient.append('stop').attr('stop-color', colors[i][4]).attr('offset', (22 - 6) / 22)
    }
    const kt = [[0, 1], [1, 2]]
    kt.forEach((v, i) => {
        for (let j = 1; j < 10; j++) {
            const z = j - 1
            mainGradient = svgDefs.append('linearGradient').attr('id', 'kg' + i + '-' + z).attr("gradientTransform", "rotate(90)")
            mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][0], colors[v[1]][0], j / 10)).attr('offset', '0')
            mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][1], colors[v[1]][1], j / 10)).attr('offset', (22 - 19) / 22)
            mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][2], colors[v[1]][2], j / 10)).attr('offset', (22 - 13) / 22)
            mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][3], colors[v[1]][3], j / 10)).attr('offset', (22 - 9) / 22)
            mainGradient.append('stop').attr('stop-color', blendColors(colors[v[0]][4], colors[v[1]][4], j / 10)).attr('offset', (22 - 6) / 22)
        }
    })

}
