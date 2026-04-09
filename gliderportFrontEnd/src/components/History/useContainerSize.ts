/**
 *
 * @packageDocumentation
 *   Custom React hook that measures and returns the size (width & height)
 *   of a DOM element via a ResizeObserver. Returns a ref to attach to the
 *   element and an object with its current dimensions.
 */

import { useState, useRef, useLayoutEffect } from "react";

/**
 * Hook to track the size of a container element.
 *
 * @typeParam T - The type of HTMLElement being observed (e.g., HTMLDivElement).
 * @returns {[React.RefObject<T>, { width: number; height: number }]}
 *   A tuple where the first element is a ref to attach to your element,
 *   and the second is an object containing `width` and `height` in pixels.
 *
 * @example
 * const [containerRef, size] = useContainerSize<HTMLDivElement>();
 * return <div ref={containerRef}>Current width: {size.width}</div>;
 */
export function useContainerSize<T extends HTMLElement>() {
  // Ref to attach to the target DOM element
  const ref = useRef<T | null>(null);
  // State to hold measured width and height
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;

    // Create a ResizeObserver to watch for size changes
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return [ref, size] as const;
}
