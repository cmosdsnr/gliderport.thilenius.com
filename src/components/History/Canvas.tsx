import React, { useRef, useEffect } from 'react'

interface CanvasProps {
    draw: (context: CanvasRenderingContext2D) => void
    data: any
    width: number
    height: number
    rest?: any[]
}

const Canvas = ({ draw, data, width, height, ...rest }: CanvasProps) => {

    const canvasRef = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !width) {
            if (!canvas) console.log("no canvas provided")
            else console.log("no width provided")
            return
        }
        const context: CanvasRenderingContext2D | null = canvas.getContext('2d')
        if (context === null) return
        context.canvas.width = width
        context.canvas.height = height
        if (data && (data === 1 || data.limits)) draw(context)
    }, [draw, data, width, height])

    return <canvas ref={canvasRef} {...rest} />
}

export default Canvas