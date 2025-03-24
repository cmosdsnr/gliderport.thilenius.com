import React, { useRef, useEffect } from 'react'

interface CanvasProps {
    data: any
    width: number
    full: boolean
}

const StatusCanvas: React.FC<CanvasProps> = props => {

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const RectWidthRef = useRef<number>(0)
    const RectStartRef = useRef<number>(0)
    const height = 30

    useEffect(() => {
        const draw = (context: CanvasRenderingContext2D, full: boolean) => {

            var drawSection = function (startRatio: number, endRatio: number, context: CanvasRenderingContext2D, status: number) {
                context.beginPath();
                context.fillStyle = (status === 0) ? "red" : (status === 2 ? "LightGrey" : "LightGreen");
                context.rect(RectStartRef.current + startRatio * RectWidthRef.current, 0, (endRatio - startRatio) * RectWidthRef.current, 12);
                context.fill();
                context.closePath();
            }

            var AddHashMarks = function (context: CanvasRenderingContext2D, full: boolean) {
                context.beginPath();
                if (!full) {
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
            context.fillText(props.data.date, 10, 18)

            var from, to
            var status = props.data.start
            if (full) {
                let dt = new Date()
                to = dt.getTime() / 1000
                dt.setHours(0, 0, 0, 0)
                to -= dt.getTime() / 1000
                to /= (24 * 3600)
                drawSection(0, to, context, status)
                drawSection(to, 1, context, 2)
            } else {
                drawSection(0, (props.data.changes.length === 0) ? 1 : props.data.changes[0] / (24 * 3600), context, status)
            }
            props.data.changes.forEach((element: number, i: number) => {
                status = (status === 1) ? 0 : 1
                from = props.data.changes[i] / (24 * 3600)
                if (i === props.data.changes.length - 1) {
                    //last one
                    if (full) {
                        let dt = new Date()
                        to = ((Math.floor(dt.getTime() / 1000) - 60 * dt.getTimezoneOffset()) % (24 * 3600)) / (24 * 3600)
                        drawSection(from, to, context, status)
                        drawSection(to, 1, context, 2)
                    } else {
                        drawSection(from, 1, context, status)
                    }
                } else {
                    to = props.data.changes[i + 1] / (24 * 3600)
                    drawSection(from, to, context, status)
                }
            })

            AddHashMarks(context, full);
        }

        const canvas = canvasRef.current

        if (!canvas || !props.width) {
            if (!canvas) { console.log("no canvas:" + canvas) }
            if (!props.width) { console.log("no width:" + props.width) }
            return
        }
        const context = canvas.getContext('2d')
        if (!context) { return }
        context.canvas.width = props.width
        context.canvas.height = height
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.font = "12px Verdana"
        RectWidthRef.current = props.width - 7 - (context.measureText(props.data.date).width + 40)
        RectStartRef.current = (context.measureText(props.data.date).width + 40)

        if (props.data) { draw(context, props.full) }

    }, [props.data, props.width, props.full])

    return <canvas ref={canvasRef} />
}

export default StatusCanvas