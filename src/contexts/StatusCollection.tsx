import React, { createContext, useState, useEffect, useContext, useMemo } from 'react'
import { pb } from '@/contexts/pb'


type Online = {
    online: number;
    touched: string;
}

export interface StatusCollectionInterface {
    sun: Sun;
    sleeping: boolean;
    lastImage: number;
    siteMessages: string[];
    forecast: any;
    siteHits: any; // hit stats
    online: Online;
}

const StatusCollectionContext = createContext<StatusCollectionInterface>({} as StatusCollectionInterface);

export function useStatusCollection() {
    return useContext(StatusCollectionContext)
}

export function StatusCollectionProvider({ children }: any) {

    const [sun, setSun] = useState<Sun>({ rise: 0, set: 0 });
    const [sleeping, setSleeping] = useState<boolean>(false);
    const [siteMessages, setSiteMessages] = useState<string[]>([]);
    const [forecast, setForecast] = useState<any>({});
    const [siteHits, setSiteHits] = useState<any>({});
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