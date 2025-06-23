/**
 * @file StatusCollection context and provider for global site status, sun times, hits, and more.
 * @description
 *   Provides a React context for site-wide status, including sun times, sleep state, image status,
 *   site messages, forecast, site hit statistics, and online status. Data is loaded from PocketBase
 *   and updated in real time via subscription.
 */

import React, { createContext, useState, useEffect, useContext, useMemo } from 'react'
import { pb } from '@/contexts/pb'

/**
 * Stats interface for site hit statistics.
 */
export interface Stats {
    timestamp: number;
    lastReset: number;
    weeks: { start: number, count: number[], unique: number[] };
    months: { start: number, count: number[], unique: number[] };
    days: { start: number, count: number[], unique: number[] };
}

/**
 * Online status interface.
 */
export type Online = {
    online: number;
    touched: string;
}

/**
 * StatusCollectionInterface defines the shape of the global status context.
 */
export interface StatusCollectionInterface {
    sun: Sun;
    sleeping: boolean;
    lastImage: number;
    siteMessages: string[];
    forecast: any;
    siteHits: any; // hit stats
    online: Online;
}

/**
 * React context for the status collection.
 */
const StatusCollectionContext = createContext<StatusCollectionInterface>({} as StatusCollectionInterface);

/**
 * Custom hook to access the StatusCollection context.
 * @returns The current StatusCollectionInterface value.
 */
export function useStatusCollection() {
    return useContext(StatusCollectionContext)
}

/**
 * StatusCollectionProvider loads and subscribes to site-wide status from PocketBase,
 * and provides it to all child components via React context.
 * @param children - React children to wrap with the provider.
 * @returns The provider component.
 */
export function StatusCollectionProvider({ children }: any) {

    const [sun, setSun] = useState<Sun>({ rise: 0, set: 0 });
    const [sleeping, setSleeping] = useState<boolean>(false);
    const [siteMessages, setSiteMessages] = useState<string[]>([]);
    const [forecast, setForecast] = useState<any>({});
    const [siteHits, setSiteHits] = useState<Stats>({ lastReset: 0, timestamp: 0, weeks: { start: 0, count: [], unique: [] }, months: { start: 0, count: [], unique: [] }, days: { start: 0, count: [], unique: [] } });
    const [lastImage, setLastImage] = useState<number>(0);
    const [online, setOnline] = useState<Online>({ online: 0, touched: "" });          // hit stats

    async function loadInitial() {
        try {
            const records = await pb.collection('status').getFullList(200, {});
            for (let r of records) {
                const rec = typeof r.record === 'string' ? JSON.parse(r.record) : r.record;
                if (r.name === 'sun') {
                    setSun({ rise: rec.sunrise, set: rec.sunset });
                }
                if (r.name === 'images') {
                    setSleeping(rec.sleeping == 1 ? true : false);
                    setLastImage(rec.lastImage ? rec.lastImage : 0);
                }
                if (r.name === 'siteMessage') {
                    setSiteMessages(rec);
                }
                if (r.name === 'forecast') {
                    setForecast(rec);
                }
                if (r.name === 'siteHits') {
                    setSiteHits(rec);
                }
                if (r.name === 'online') {
                    setOnline(rec);
                }
            }
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    }


    useEffect(() => {
        loadInitial();
        pb.collection('status').subscribe('*', (e) => {
            if (e.action !== 'create' && e.action !== 'update') return;

            if (e.record.name === 'sun') {
                if (sun.rise != e.record.record.sunrise || sun.set != e.record.record.sunset)
                    setSun({ rise: e.record.record.sunrise, set: e.record.record.sunset });
            } else if (e.record.name === 'images') {
                setSleeping(e.record.record.sleeping == 1 ? true : false);
                setLastImage(e.record.record.lastImage);
            } else if (e.record.name === 'siteMessage') {
                setSiteMessages(e.record.record);
            } else if (e.record.name === 'forecast') {
                setForecast(e.record.record);
            } else if (e.record.name === 'siteHits') {
                setSiteHits(e.record.record);
            }
        });

        return () => {
            pb.collection('status').unsubscribe();
        };
    }, []);

    const value: StatusCollectionInterface = { sun, sleeping, lastImage, siteMessages, forecast, siteHits, online };


    return (
        <StatusCollectionContext.Provider value={value}>
            {children}
        </StatusCollectionContext.Provider>
    )
}