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
import { useData } from 'contexts/DataContext';
import './admin.css';

/**
 * Represents a single message record in the logger.
 *
 * Message
 * {number} direction - 0 for SENT, 1 for RECEIVED
 * {string|null} command - The command name, if any
 * {string|null} subcommand - The subcommand name, if any
 * {any|null} data - The payload data associated with this message
 * {Date} timestamp - When the message was logged
 */
export type Message = {
    direction: number;
    command: string | null;
    subcommand: string | null;
    data: any | null;
    timestamp: Date;
};

/**
 * Shape of the MessageContext value.
 *
 * MessageContextType
 * {Message[]} messages - Array of logged messages
 * {(direction: number, command: string|null, subcommand: string|null, data: any|null) => void} messageLogger
 *           - Function to log a new message
 * {number} chartLength - Current length of the message chart (alias for messages.length)
 * {(length: number) => void} setChartLength - Setter for chartLength (rarely used)
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
     * Logs a new message into the context state, keeping max 500 entries.
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
 * Props for the DataCell component.
 */
type DataCellProps = {
    fullData: string;
    maxLength?: number;
};

/**
 * Table cell that truncates long text and reveals full text on hover.
 *
 * @param {DataCellProps} props
 * @returns {React.ReactElement}
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
 * Component that renders the message log with pause/resume and data summary.
 *
 * @returns {React.ReactElement}
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
 * Props for ExpandableObjectCell component.
 */
type ExpandableObjectCellProps = {
    obj: any;
};

/**
 * Recursively renders an object as an expandable nested table cell.
 *
 * @param {ExpandableObjectCellProps} props
 * @returns {React.ReactElement}
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
 * Renders a value, delegating objects to ExpandableObjectCell.
 *
 * @param {any} value - Value to render.
 * @returns {React.ReactElement}
 */
const renderValue = (value: any): React.ReactElement => {
    return typeof value === 'object' && value !== null ? <ExpandableObjectCell obj={value} /> : <>{String(value)}</>;
};

/**
 * Summarizes key DataContext values and message count in a table.
 *
 * @returns {React.ReactElement}
 */
const DataSummaryComponent: React.FC = () => {
    const {
        clients,
        donors,
        posts,
        history,
        status,
        lastCheck,
        passedSeconds,
        offline,
        cameraImages,
        lastForecast,
        numberConnections,
    } = useData();
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
