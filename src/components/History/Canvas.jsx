import React, { useRef, useEffect } from 'react'

const Canvas = props => {

    const { draw, data, width, height, ...rest } = props
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas | !width) {
            if (!canvas) { console.log("no canvas:" + canvas) }
            if (!width) { console.log("no width:" + width) }
            return
        }
        const context = canvas.getContext('2d')
        context.canvas.width = width
        context.canvas.height = height
        if (data && (data === 1 || data.limits)) draw(context)
    }, [draw, data, width, height])

    return <canvas ref={canvasRef} {...rest} />
}

export default Canvas