/**
 * @packageDocumentation
 * SensorDataContext — owns the 24-hour sensor readings array.
 * Fetches the initial dataset via REST on mount, then appends new records
 * pushed by the WebSocket server via the `newRecords` command.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';
import { API } from '@/api';

/**
 * A single sensor reading from the weather station.
 */
export type Reading = {
    time: number;
    speed: number;
    direction: number;
    humidity: number;
    pressure: number;
    temperature: number;
};

/** Raw record shape as received from the server. */
type RawRecord = {
    timestamp?: number;
    time?: number;
    speed: number;
    direction: number;
    humidity: number;
    pressure: number;
    temperature: number;
};

/**
 * Normalize raw records from the server into Reading objects.
 * - Renames `timestamp` → `time`
 * - Scales speed and temperature (÷10)
 * - Converts pressure from Pa offset to mBar
 * - Carries the last non-zero direction forward over calm readings
 */
const normalizeRecords = (raw: RawRecord[], initialDir: number): { readings: Reading[]; lastDir: number } => {
    let lastDir = initialDir;
    const readings = raw.map((d: RawRecord) => {
        if (d.speed !== 0) lastDir = d.direction;
        return {
            time: d.timestamp ?? d.time ?? 0,
            speed: d.speed / 10,
            direction: lastDir,
            humidity: d.humidity,
            pressure: (d.pressure + 101325) / 100,
            temperature: d.temperature / 10,
        };
    });
    return { readings, lastDir };
};

interface SensorDataContextInterface {
    readings: Reading[];
    /** True once the initial fetch completed (success or empty). */
    dataLoaded: boolean;
    /** True if the initial fetch returned no records — sensor system may be offline. */
    noData: boolean;
}

const SensorDataContext = createContext<SensorDataContextInterface>({} as SensorDataContextInterface);

export function useSensorData(): SensorDataContextInterface {
    return useContext(SensorDataContext);
}

export function SensorDataProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const [readings, setReadings] = useState<Reading[]>([
        { time: 0, speed: 0, direction: 0, humidity: 0, pressure: 0, temperature: 0 },
    ]);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [noData, setNoData] = useState(false);
    const { lastMessage } = useWebSocket();

    // Initial 24-hour fetch on mount
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const res = await fetch(API.getData(24));
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const { readings: normalized } = normalizeRecords(data, 270);
                    setReadings(normalized);
                } else {
                    setNoData(true);
                }
            } catch (err: unknown) {
                console.error('Error fetching sensor data:', err instanceof Error ? err.message : err);
                setNoData(true);
            } finally {
                setDataLoaded(true);
            }
        };
        fetchInitial();
    }, []);

    // Append new records pushed by the server
    useEffect(() => {
        if (!lastMessage || lastMessage.command !== 'newRecords') return;
        if (!lastMessage.records?.length) return;

        setReadings(prev => {
            let lastDir = 270;
            for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].speed !== 0) { lastDir = prev[i].direction; break; }
            }
            const { readings: normalized } = normalizeRecords(lastMessage.records! as RawRecord[], lastDir);
            return [...prev, ...normalized].slice(-9000);
        });
    }, [lastMessage]);

    return (
        <SensorDataContext.Provider value={{ readings, dataLoaded, noData }}>
            {children}
        </SensorDataContext.Provider>
    );
}
