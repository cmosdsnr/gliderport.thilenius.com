/**
 * @packageDocumentation
 * StatusCanvas component for the Gliderport application.
 * Renders a canvas showing the online/offline status history for a day.
 */
import React, { useRef, useEffect } from 'react'

/**
 * Props for the StatusCanvas component.
 */
export interface CanvasProps {
    data: any,
    width: number,
    lastOne: boolean,
    dayLabel: string
}

/**
 * StatusCanvas renders a canvas showing the online/offline status history for a day.
 * @param props - The props for the StatusCanvas component.
 * @returns {React.ReactElement} The rendered canvas.
 */
export function StatusCanvas({ data, width, lastOne, dayLabel }: CanvasProps): React.ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const RectWidthRef = useRef<number>(0)
    const RectStartRef = useRef<number>(0)
    const height = 30

    useEffect(() => {
        const draw = (context: CanvasRenderingContext2D) => {

            var drawSection = function (startRatio: number, endRatio: number, context: CanvasRenderingContext2D, status: number) {
                context.beginPath();
                context.fillStyle = (status === 0) ? "red" : (status === 2 ? "LightGrey" : "LightGreen");
                context.rect(RectStartRef.current + startRatio * RectWidthRef.current, 0, (endRatio - startRatio) * RectWidthRef.current, 12);
                context.fill();
                context.closePath();
            }

            var AddHashMarks = function (context: CanvasRenderingContext2D) {
                context.beginPath();
                if (!lastOne) {
                    for (var i = 0; i <= 24; i += 2) {
                        context.moveTo(RectStartRef.current + (i * RectWidthRef.current / 24), 0);
                        context.lineTo(RectStartRef.current + (i * RectWidthRef.current / 24), 30);
                        context.stroke()
                    }
                } else {
                    context.fillStyle = "black";
                    for (i = 0; i <= 24; i += 2) {
                        context.moveTo(RectStartRef.current + (i * RectWidthRef.current / 24), 0);
                        context.lineTo(RectStartRef.current + (i * RectWidthRef.current / 24), 18);
                        context.stroke()
                        context.fillText(i.toString(), RectStartRef.current + (i * RectWidthRef.current / 24) - context.measureText(i.toString()).width / 2, 29)
                    }
                }
                context.closePath();
            }

            context.fillStyle = "black"
            context.fillText(dayLabel, 10, 18)

            var from, to
            var status = data.start

            data.forEach((e: number[], i: number) => {
                status = e[1];
                from = e[0];
                to = i < data.length - 1 ? data[i + 1][0] : 1;
                drawSection(from, to, context, status);
            })
            AddHashMarks(context);
        }

        const canvas = canvasRef.current

        if (!canvas || !width) {
            if (!canvas) { console.log("no canvas:" + canvas) }
            if (!width) { console.log("no width:" + width) }
            return
        }
        const context = canvas.getContext('2d')
        if (!context) { return }
        context.canvas.width = width
        context.canvas.height = height
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.font = "12px Verdana"
        RectWidthRef.current = width - 7 - (context.measureText("xx-xx").width + 30)
        RectStartRef.current = (context.measureText("xx-xx").width + 30)

        if (data) { draw(context) }

    }, [data, width])

    return <canvas ref={canvasRef} />
}

export default StatusCanvas