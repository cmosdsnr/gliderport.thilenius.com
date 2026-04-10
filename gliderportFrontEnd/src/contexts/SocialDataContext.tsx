/**
 * @packageDocumentation
 * SocialDataContext — demand-loaded data (posts, donors, clients, history, status)
 * and server-pushed site status (offline, lastCheck, lastForecast, numberConnections).
 *
 * Call loadData(subCommand) to request a dataset. The server responds via the
 * `fetchData` WebSocket command and the state updates automatically.
 * Site status arrives via the `update` command without an explicit request.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useMessages } from 'components/Admin/MessageLogger';
import type { Codes } from '@/components/History/History';

interface SocialDataContextInterface {
    posts: Post[];
    donors: Donor[];
    clients: Client[];
    history: Codes;
    status: number[];
    offline: boolean;
    lastCheck: TimeStamp;
    lastForecast: TimeStamp;
    numberConnections: number;
    /** Request a dataset from the server. Valid names: Posts, Donors, History, Status, Clients, CurrentData */
    loadData: (name: string) => void;
}

const SocialDataContext = createContext<SocialDataContextInterface>({} as SocialDataContextInterface);

export function useSocialData(): SocialDataContextInterface {
    return useContext(SocialDataContext);
}

const VALID_SUBCOMMANDS = new Set(['Posts', 'Donors', 'History', 'Status', 'Clients', 'CurrentData']);

export function SocialDataProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const [posts, setPosts] = useState<Post[]>([]);
    const [donors, setDonors] = useState<Donor[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [history, setHistory] = useState<Codes>([]);
    const [status, setStatus] = useState<number[]>([]);
    const [offline, setOffline] = useState(false);
    const [lastCheck, setLastCheck] = useState<TimeStamp>(1658263194);
    const [lastForecast, setLastForecast] = useState<TimeStamp>(0);
    const [numberConnections, setNumberConnections] = useState(0);

    const { lastMessage, sendMessage, isConnected } = useWebSocket();
    const { messageLogger } = useMessages();

    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.command === 'update') {
            const { onlineStatus, onlineStatusTouched, lastForecast: lf, numberConnections: nc } = lastMessage.data ?? {};
            if (onlineStatus !== undefined) setOffline(onlineStatus === 0);
            if (onlineStatusTouched) setLastCheck(onlineStatusTouched);
            if (lf) setLastForecast(lf);
            if (nc !== undefined) setNumberConnections(nc);
            return;
        }

        if (lastMessage.command === 'fetchData') {
            const { subCommand, data, error } = lastMessage;
            if (error) { console.error(`fetchData error [${subCommand}]:`, error); return; }

            const handlers: Record<string, (d: any) => void> = {
                Posts: setPosts,
                Donors: setDonors,
                History: setHistory,
                Status: setStatus,
                Clients: setClients,
                CurrentData: (d: CurrentData) => {
                    setOffline(d.onlineStatus === 0);
                    setLastCheck(d.onlineStatusTouched);
                    setLastForecast(d.lastForecast);
                    setNumberConnections(d.numberConnections);
                },
            };

            const handler = handlers[subCommand!];
            if (handler) handler(data);
            else console.warn(`Unknown fetchData subCommand: ${subCommand}`);
        }
    }, [lastMessage]);

    const loadData = (name: string) => {
        if (!isConnected) { console.warn('WebSocket not connected'); return; }
        if (!VALID_SUBCOMMANDS.has(name)) { console.warn(`Invalid subCommand: ${name}`); return; }
        messageLogger(0, 'fetchData', name, null);
        sendMessage({ command: 'fetchData', subCommand: name, days: 8 });
    };

    return (
        <SocialDataContext.Provider value={{
            posts, donors, clients, history, status,
            offline, lastCheck, lastForecast, numberConnections,
            loadData,
        }}>
            {children}
        </SocialDataContext.Provider>
    );
}
