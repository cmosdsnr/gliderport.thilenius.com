import React from 'react'
import Canvas from './Canvas'
import { codes } from '../Globals'

interface KeyCanvasProps {
    width: number
}

export const KeyCanvas = ({ width }: KeyCanvasProps) => {
    const drawKey = (ctx: CanvasRenderingContext2D) => {

        var widthA, widthB = 0;
        var cntA,
            cntB = 0;
        var w;

        if (width < 1400) {
            // cntA = parseInt(codes.length / 2);
            // cntB = codes.length - cntA;
            cntA = Math.floor(11 / 2);
            cntB = 11 - cntA;
            widthA = width / cntA;
            widthB = width / cntB;
        } else {
            cntA = codes.length;
            widthA = width / codes.length;
        }
        for (var i = 0; i < cntA; i++) {
            ctx.beginPath();
            ctx.fillStyle = codes[i].color;
            ctx.rect(i * widthA, 0, (i + 1) * widthA, 30);
            ctx.fill();
            ctx.closePath();

            ctx.beginPath();
            ctx.fillStyle = "#000000";
            if (i === 7) {
                ctx.fillStyle = "#FFFFFF";
            }

            w = widthA / 2 - ctx.measureText(codes[i].code).width / 2;
            ctx.fillText(codes[i].code, w + i * widthA, 15);
            ctx.closePath();
        }
        for (i = 0; i < cntB; i++) {
            ctx.beginPath();
            ctx.fillStyle = codes[i + cntA].color;
            ctx.rect(i * widthB, 30, (i + 1) * widthB, 60);
            ctx.fill();
            ctx.closePath();

            ctx.beginPath();
            ctx.fillStyle = "#000000";
            if (i === 7) {
                ctx.fillStyle = "#FFFFFF";
            }

            w = widthB / 2 - ctx.measureText(codes[i + cntA].code).width / 2;
            ctx.fillText(codes[i + cntA].code, w + i * widthB, 45);
            ctx.closePath();
        }
    }

    return <Canvas draw={drawKey} height={width < 1400 ? 60 : 30} width={width} data={1} />
}

export default KeyCanvas