import { useState, useEffect } from "react";

/**
 * React hook that syncs a piece of state with localStorage.
 * @param key - The localStorage key to use.
 * @param defaultValue - The default value if nothing is found in localStorage.
 * @returns A tuple containing the state and a setter function.
 */
export function useLocalStorageState<T>(
    key: string,
    defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
    // 1️⃣   read once on mount
    const [state, setState] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : defaultValue;
        } catch {
            return defaultValue; // corrupted? — fall back
        }
    });

    // 2️⃣   write on every change
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch {
            /* storage quota exceeded, private mode, etc. */
        }
    }, [key, state]);

    return [state, setState];
}

export default useLocalStorageState;