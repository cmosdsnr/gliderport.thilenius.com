/**
 * ## Message Logger Context & Components
 *
 * Provides a React Context for logging messages (sent/received) with arbitrary data,
 * and UI components to display and manage the message log.
 *
 * @packageDocumentation MessageLogger
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Table, Container, Button } from 'react-bootstrap';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useCamera } from '@/contexts/CameraContext';
import { useSocialData } from '@/contexts/SocialDataContext';
import './admin.css';

/**
 * Represents a single message record stored in the {@link MessageContext}.
 *
 * @property direction   - `0` for SENT (outbound), `1` for RECEIVED (inbound).
 * @property command     - Top-level command name, or `null` if not applicable.
 * @property subcommand  - Sub-command name, or `null` if not applicable.
 * @property data        - Arbitrary payload associated with this message, or `null`.
 * @property timestamp   - JavaScript `Date` of when the message was logged.
 */
export type Message = {
    direction: number;
    command: string | null;
    subcommand: string | null;
    data: any | null;
    timestamp: Date;
};

/**
 * Value shape exposed by {@link MessageContext}.
 *
 * @property messages      - Ordered array of up to 500 logged {@link Message} entries.
 * @property messageLogger - Appends a new {@link Message} to the log.  Call this from
 *                           any component that sends or receives WebSocket messages.
 * @property chartLength   - Mirrors `messages.length`; exposed separately so consumers
 *                           can subscribe to length changes without re-rendering on
 *                           every individual message update.
 * @property setChartLength - Setter for `chartLength` (reserved for future use).
 */
export type MessageContextType = {
    messages: Message[];
    messageLogger: (
        direction: number,
        command: string | null,
        subcommand: string | null,
        data: any | null
    ) => void;
    chartLength: number;
    setChartLength: (length: number) => void;
};

/**
 * React Context for message logging.
 * Default values are no-op.
 */
const MessageContext = createContext<MessageContextType>({
    messages: [],
    messageLogger: () => { },
    chartLength: 0,
    setChartLength: () => { },
});

/**
 * Provider component for MessageContext.
 * Manages the messages state and provides logging function.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chartLength, setChartLength] = useState<number>(0);

    /**
     * Appends a new {@link Message} to the log, capping the array at 500 entries
     * (oldest entries are dropped when the limit is exceeded).
     *
     * @param direction   - `0` for SENT, `1` for RECEIVED.
     * @param command     - Top-level command name, or `null`.
     * @param subcommand  - Sub-command name, or `null`.
     * @param data        - Arbitrary message payload, or `null`.
     */
    const messageLogger = (
        direction: number,
        command: string | null,
        subcommand: string | null,
        data: any | null
    ) => {
        const newMessage: Message = {
            direction,
            command,
            subcommand,
            data,
            timestamp: new Date(),
        };
        setMessages(prev => {
            const updated = [...prev, newMessage];
            return updated.length > 500 ? updated.slice(updated.length - 500) : updated;
        });
    };

    return (
        <MessageContext.Provider value={{ messages, messageLogger, chartLength, setChartLength }}>
            {children}
        </MessageContext.Provider>
    );
};

/**
 * Props for the {@link DataCell} table-cell component.
 *
 * @property fullData  - The full string to display (may be truncated).
 * @property maxLength - Maximum characters shown before truncation; defaults to `100`.
 */
export type DataCellProps = {
    fullData: string;
    maxLength?: number;
};

/**
 * Table cell (`<td>`) that truncates text beyond `maxLength` characters and reveals
 * the full string on mouse hover, avoiding overly wide table rows for large payloads.
 *
 * @param props - See {@link DataCellProps}.
 * @returns A `<td>` element with word-break wrapping and hover-expand behaviour.
 */
export const DataCell: React.FC<DataCellProps> = ({ fullData, maxLength = 100 }) => {
    const [hover, setHover] = useState(false);
    const displayData =
        hover || fullData.length <= maxLength
            ? fullData
            : fullData.substring(0, maxLength) + '...';

    return (
        <td
            style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {displayData}
        </td>
    );
};

/**
 * Hook to access the MessageContext.
 *
 * @returns {MessageContextType}
 */
export const useMessages = () => useContext(MessageContext);

/**
 * Admin UI component that displays the full WebSocket message log in a striped table.
 *
 * Features:
 * - Pause/Resume toggle — freezes the displayed list while new messages continue to
 *   accumulate in context; resumes by syncing the full current list on un-pause.
 * - Most-recent-first ordering (messages are reversed before rendering).
 * - Long data payloads are truncated to 100 characters via {@link DataCell} and
 *   expand on hover.
 * - Renders a {@link DataSummaryComponent} above the table for quick status overview.
 *
 * @returns A Bootstrap `Container` with the data summary and paginated message table.
 */
export function MessageLogger(): React.ReactElement {
    const { messages, chartLength } = useMessages();
    const [paused, setPaused] = useState(false);
    const [displayedMessages, setDisplayedMessages] = useState<Message[]>(messages);

    useEffect(() => {
        if (!paused) {
            setDisplayedMessages(messages);
        }
    }, [messages, paused]);

    const togglePaused = () => {
        setPaused(prev => !prev);
        if (paused) {
            setDisplayedMessages(messages);
        }
    };

    const getDataString = (data: any): string => {
        if (data === null) return '';
        return typeof data === 'object' ? JSON.stringify(data) : String(data);
    };

    const maxLength = 80;

    return (
        <Container className="mt-4">
            <DataSummaryComponent />
            <Button variant={paused ? 'warning' : 'secondary'} onClick={togglePaused} className={paused ? 'flash' : ''}>
                {paused ? 'Resume' : 'Pause'} Updates
            </Button>

            <Table striped bordered hover responsive className="mt-3">
                <thead>
                    <tr>
                        <th style={{ width: '5%' }}>Direction</th>
                        <th style={{ width: '5%' }}>Command</th>
                        <th style={{ width: '5%' }}>Subcommand</th>
                        <th style={{ width: '20%' }}>Date/Time</th>
                        <th style={{ width: '65%' }}>Data</th>
                    </tr>
                </thead>
                <tbody>
                    {displayedMessages.slice().reverse().map((msg, index) => (
                        <tr key={index}>
                            <td style={{ fontWeight: 'bold', color: msg.direction === 0 ? 'blue' : 'red' }}>
                                {msg.direction === 0 ? 'SENT' : 'RECEIVED'}
                            </td>
                            <td>{msg.command}</td>
                            <td>{msg.subcommand}</td>
                            <td>{msg.timestamp.toLocaleString()}</td>
                            <DataCell fullData={getDataString(msg.data)} maxLength={100} />
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
};

/**
 * Props for the {@link ExpandableObjectCell} component.
 *
 * @property obj - Any value to render. Non-object primitives are converted to strings;
 *                 objects are rendered as a nested expandable table.
 */
export type ExpandableObjectCellProps = {
    obj: any;
};

/**
 * Renders a value inline: primitives are stringified; objects are shown as a
 * collapsed `"object"` hyperlink that expands into a nested key/value table on
 * click. Nested objects recurse into additional {@link ExpandableObjectCell} instances.
 *
 * @param props - See {@link ExpandableObjectCellProps}.
 * @returns A React fragment (primitive) or a collapsible nested table (object).
 */
export const ExpandableObjectCell: React.FC<ExpandableObjectCellProps> = ({ obj }) => {
    const [expanded, setExpanded] = useState(false);

    if (typeof obj !== 'object' || obj === null) {
        return <>{String(obj)}</>;
    }

    if (!expanded) {
        return (
            <span
                style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setExpanded(true)}
            >
                object
            </span>
        );
    }

    return (
        <Table bordered size="sm" style={{ margin: 0, borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
                {Object.entries(obj).map(([key, value], idx) => (
                    <tr key={idx}>
                        <td style={{ padding: '2px', border: '1px solid #000' }}>{key}</td>
                        <td style={{ padding: '2px', border: '1px solid #000' }}>
                            {typeof value === 'object' && value !== null ? (
                                <ExpandableObjectCell obj={value} />
                            ) : (
                                String(value)
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

/**
 * Renders a single summary-table cell value.
 * Delegates object values to {@link ExpandableObjectCell}; converts everything
 * else to a string via `String()`.
 *
 * @param value - The value to render (any type).
 * @returns A React fragment containing the rendered value.
 */
const renderValue = (value: any): React.ReactElement => {
    return typeof value === 'object' && value !== null ? <ExpandableObjectCell obj={value} /> : <>{String(value)}</>;
};

/**
 * Admin summary panel that displays key real-time context values in a compact table.
 *
 * Reads from {@link useWebSocket}, {@link useCamera}, {@link useSocialData}, and
 * {@link useMessages} to surface values such as connected client count, last network
 * check timestamp, WebSocket uptime (`passedSeconds`), camera image count, offline
 * flag, last forecast time, active connections, and total logged messages.
 *
 * @returns A Bootstrap `Container` with a labelled two-column summary table.
 */
const DataSummaryComponent: React.FC = () => {
    const { passedSeconds } = useWebSocket();
    const { cameraImages } = useCamera();
    const {
        clients,
        donors,
        posts,
        history,
        status,
        lastCheck,
        offline,
        lastForecast,
        numberConnections,
    } = useSocialData();
    const { messages } = useMessages();

    const dataSummary: any[] = [
        { name: 'clients', value: clients },
        { name: 'lastCheck', value: lastCheck.toString() + ' (' + new Date(lastCheck * 1000).toLocaleString() + ')' },
        { name: 'passedSeconds', value: passedSeconds },
        { name: 'offline', value: offline },
        { name: 'lastForecast', value: lastForecast },
        { name: 'numberConnections', value: numberConnections },
        { name: 'chartLength', value: messages.length },
    ];

    return (
        <Container style={{ marginBottom: '50px' }} className="mt-4">
            <h2>Data Summary</h2>
            <style>{`
         /* Styled summary table */
         .table { border-collapse: collapse; border: 1px solid #000 !important; }
         .table td, .table th { border:1px solid #000 !important; margin:0; padding:2px !important; }
      `}</style>
            <Table striped bordered hover style={{ width: 'auto' }}>
                <tbody>
                    {dataSummary.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.name}</td>
                            <td style={{ textAlign: 'right' }}>{renderValue(item.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
};
