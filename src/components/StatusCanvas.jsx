import React, { useRef, useEffect } from "react"

const StatusCanvas = (props) => {

    const { width, data, full, ...rest } = props
    const canvasRef = useRef()
    const RectWidthRef = useRef()
    const RectStartRef = useRef()
    const height = 30

    useEffect(() => {
        const draw = (context, full) => {
            var drawSection = function (startRatio, endRatio, context, status) {
                context.beginPath();
                context.fillStyle = (status === 0) ? "red" : (status === 2 ? "LightGrey" : "LightGreen");
                context.rect(RectStartRef.current + startRatio * RectWidthRef.current, 0, (endRatio - startRatio) * RectWidthRef.current, 12);
                context.fill();
                context.closePath();
            }

            var AddHashMarks = function (context, full) {
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
                        context.fillText(i, RectStartRef.current + (i * RectWidthRef.current / 24) - context.measureText(i).width / 2, 29)
                    }
                }
                context.closePath();
            }

            context.fillStyle = "black"
            context.fillText(data.date, 10, 18)

            var from, to
            var status = data.start
            if (full) {
                let dt = new Date()
                to = dt.getTime() / 1000
                dt.setHours(0, 0, 0, 0)
                to -= dt.getTime() / 1000
                to /= (24 * 3600)
                drawSection(0, to, context, status)
                drawSection(to, 1, context, 2)
            } else {
                drawSection(0, (data.changes.length === 0) ? 1 : data.changes[0] / (24 * 3600), context, status)
            }
            data.changes.forEach((element, i) => {
                status = (status === 1) ? 0 : 1
                from = data.changes[i] / (24 * 3600)
                if (i === data.changes.length - 1) {
                    //last one
                    if (full) {
                        let dt = new Date()
                        to = (parseInt(dt.getTime() / 1000) % (24 * 3600)) / (24 * 3600)
                        drawSection(from, to, context, status)
                        drawSection(to, 1, context, 2)
                    } else {
                        drawSection(from, 1, context, status)
                    }
                } else {
                    to = data.changes[i + 1] / (24 * 3600)
                    drawSection(from, to, context, status)
                }
            })

            AddHashMarks(context, full);
        }

        const canvas = canvasRef.current

        if (!canvas | !width) {
            if (!canvas) { console.log("no canvas:" + canvas) }
            if (!width) { console.log("no width:" + width) }
            return
        }
        const context = canvas.getContext('2d')
        context.canvas.width = width
        context.canvas.height = height
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.font = "12px Verdana"
        RectWidthRef.current = width - 7 - (context.measureText(data.date).width + 40)
        RectStartRef.current = (context.measureText(data.date).width + 40)

        if (data) { draw(context, full) }

    }, [data, width, full])

    return <canvas ref={canvasRef} {...rest} />
}

export default StatusCanvas