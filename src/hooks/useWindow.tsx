import React, { useState, useEffect } from 'react'

export const useWindow = () => {
    const [width, setWidth] = useState(0)

    useEffect(() => {
        const resizeAndDraw = () => {
            setWidth(window.innerWidth)
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])
    return width

}
