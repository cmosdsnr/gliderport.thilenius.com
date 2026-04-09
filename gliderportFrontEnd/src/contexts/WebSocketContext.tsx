/**
 * @packageDocumentation
 * WebSocketContext — owns the raw WebSocket connection, reconnect loop, and ping/pong.
 * Exposes the last parsed message as React state so child contexts can react to it
 * via useEffect without competing for ws.onmessage.
 */
import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import useInterval from 'hooks/useInterval';
import { socketUrl } from '@/components/paths';
import { useMessages } from 'components/Admin/MessageLogger';
import { DateTime } from 'luxon';

/**
 * Shape of a parsed WebSocket message from the server.
 */
export type ParsedWsMessage = {
    command: string;
    subCommand?: string;
    data?: any;
    error?: string | null;
    records?: any[];
    imageInfo?: { camera: number; image: string; date: number };
};

interface WebSocketContextInterface {
    /** The most recently received (non-ping) message. Changes on every push, triggering consumer useEffects. */
    lastMessage: ParsedWsMessage | null;
    /** Send a JSON message. No-ops if the socket is not open. */
    sendMessage: (msg: object) => void;
    /** True when the WebSocket is in OPEN state. */
    isConnected: boolean;
    /** Seconds elapsed since the last successful connection. Resets to 0 on reconnect. */
    passedSeconds: number;
}

const WebSocketContext = createContext<WebSocketContextInterface>({} as WebSocketContextInterface);

export function useWebSocket(): WebSocketContextInterface {
    return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [passedSeconds, setPassedSeconds] = useState(0);
    const [lastMessage, setLastMessage] = useState<ParsedWsMessage | null>(null);
    const lastPingRef = useRef<number>(Date.now());
    const { messageLogger } = useMessages();

    const startWebSocket = () => {
        const state = ws.current?.readyState;
        if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

        ws.current = new WebSocket(socketUrl);

        ws.current.onopen = () => {
            setIsConnected(true);
            setPassedSeconds(0);
        };

        ws.current.onclose = () => {
            setIsConnected(false);
        };

        ws.current.onmessage = (event) => {
            const msg: ParsedWsMessage = JSON.parse(event.data);
            messageLogger(0, msg.command, 'none', null);

            if (msg.command === 'ping') {
                ws.current?.send(JSON.stringify({ command: 'pong' }));
                const now = Date.now();
                if (now - lastPingRef.current > 1000 * 60 * 5) {
                    console.error(
                        'LATE PING at',
                        DateTime.fromMillis(now).toLocaleString(DateTime.DATETIME_SHORT),
                        '— reloading. Seconds since last ping:',
                        (now - lastPingRef.current) / 1000
                    );
                    if (document.visibilityState === 'visible') {
                        window.location.reload();
                        return;
                    }
                }
                if (document.visibilityState === 'visible') lastPingRef.current = now;
                return; // ping is handled here; don't propagate to consumers
            }

            setLastMessage(msg);
        };
    };

    useEffect(() => {
        startWebSocket();
        return () => { ws.current?.close(); };
    }, []);

    const sendMessage = (msg: object) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not open, cannot send message');
            return;
        }
        ws.current.send(JSON.stringify(msg));
    };

    const INTERVAL_S = 10;
    useInterval(() => {
        setPassedSeconds(s => s + INTERVAL_S);
        if (!isConnected) startWebSocket();
    }, INTERVAL_S * 1000);

    return (
        <WebSocketContext.Provider value={{ lastMessage, sendMessage, isConnected, passedSeconds }}>
            {children}
        </WebSocketContext.Provider>
    );
}
