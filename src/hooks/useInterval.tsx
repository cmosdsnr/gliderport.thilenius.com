import { useEffect, useRef } from 'react';

/**
 * Custom React hook that repeatedly calls a callback function at a specified interval.
 * @param callback - The function to be called at each interval.
 * @param interval - The delay in milliseconds for the interval. If <= 0, the interval is not set.
 */
export function useInterval(callback: () => void, interval: number): void {
    const savedCallback = useRef<(() => void) | null>(null);
    // After every render, save the latest callback into our ref.
    useEffect(() => {
        savedCallback.current = callback;
    });

    useEffect(() => {
        function tick() {
            if (savedCallback.current) {
                savedCallback.current();
            }
        }
        if (interval > 0) {
            let id = setInterval(tick, interval);
            return () => clearInterval(id);
        } else {
            return () => { };
        }
    }, [interval]);
}

export default useInterval;

