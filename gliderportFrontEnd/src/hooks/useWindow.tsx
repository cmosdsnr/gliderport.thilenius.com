import React, { useState, useEffect } from 'react'

/**
 * Returns the current browser viewport width and re-renders whenever the
 * window is resized.
 *
 * @remarks
 * Attaches a single `resize` listener on mount and cleans it up on unmount.
 * Useful for switching layouts or chart dimensions at runtime without relying
 * on CSS-only breakpoints.
 *
 * @returns The current `window.innerWidth` in pixels. Starts at `0` on the
 * first render before the effect fires.
 *
 * @example
 * ```tsx
 * const width = useWindow();
 * return <Chart width={width > 768 ? 600 : 300} />;
 * ```
 */
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
