import React, { createContext, useState, useEffect, useContext, useMemo } from 'react'
import { pb } from '@/contexts/pb'

export interface StatusCollectionInterface {
    sun: Sun;
    sleeping: boolean;
    siteMessages: string[];
}

const StatusCollectionContext = createContext<StatusCollectionInterface>({} as StatusCollectionInterface);

export function useStatusCollection() {
    return useContext(StatusCollectionContext)
}

export function StatusCollectionProvider({ children }: any) {

    const [sun, setSun] = useState<Sun>({ rise: 0, set: 0 });
    const [sleeping, setSleeping] = useState<boolean>(false);
    const [siteMessages, setSiteMessages] = useState<string[]>([]);

    async function loadInitial() {
        try {
            const records = await pb.collection('status').getFullList(200, {});
            for (let r of records) {
                const rec = typeof r.record === 'string' ? JSON.parse(r.record) : r.record;
                if (r.name === 'sun') {
                    setSun({ rise: rec.sunrise, set: rec.sunset });
                }
                if (r.name === 'images') {
                    setSleeping(!!rec.sleeping);
                }
                if (r.name === 'siteMessage') {
                    setSiteMessages(rec);
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
                if (sleeping != e.record.record.sleeping)
                    setSleeping(!!e.record.record.sleeping);
            } else if (e.record.name === 'siteMessage') {
                setSiteMessages(e.record.record);
            }
        });

        return () => {
            pb.collection('status').unsubscribe();
        };
    }, []);

    const value: StatusCollectionInterface = { sun, sleeping, siteMessages };


    return (
        <StatusCollectionContext.Provider value={value}>
            {children}
        </StatusCollectionContext.Provider>
    )
}