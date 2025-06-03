import React, { createContext, useContext, useState, useEffect } from 'react';
import { Table, Container, Button } from 'react-bootstrap';
import { useData } from 'contexts/DataContext';
import './admin.css';

export type Message = {
    direction: number;
    command: string | null;
    subcommand: string | null;
    data: any | null;
    timestamp: Date;
};

type MessageContextType = {
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

const MessageContext = createContext<MessageContextType>({
    messages: [],
    messageLogger: () => { },
    chartLength: 0,
    setChartLength: () => { },
});

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chartLength, setChartLength] = useState<number>(0);

    const messageLogger = (
        direction: number,
        command: string | null,
        subcommand: string | null,
        data: any | null
    ) => {
        // const sanitizedData =
        //     data && JSON.stringify(data).length > 300 ? 'Data not shown due to length' : data;
        const newMessage: Message = {
            direction,
            command,
            subcommand,
            data,
            timestamp: new Date(),
        };
        setMessages(prev => {
            const updated = [...prev, newMessage];
            // Only keep the last 500 messages
            return updated.length > 500 ? updated.slice(updated.length - 500) : updated;
        });
    };

    return (
        <MessageContext.Provider value={{ messages, messageLogger, chartLength, setChartLength }}>
            {children}
        </MessageContext.Provider>
    );
};



type DataCellProps = {
    fullData: string;
    maxLength?: number;
};

export const DataCell: React.FC<DataCellProps> = ({ fullData, maxLength = 100 }) => {
    const [hover, setHover] = useState(false);
    const displayData =
        hover || fullData.length <= maxLength
            ? fullData
            : fullData.substring(0, maxLength) + '...';

    return (
        <td
            style={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {displayData}
        </td>
    );
};


// Custom hook for convenience
export const useMessages = () => useContext(MessageContext);

export const MessageLoggerComponent: React.FC = () => {
    const { messages, chartLength } = useMessages();
    // Local state to control pause/resume.
    const [paused, setPaused] = useState(false);
    // Local copy of messages used for display when paused.
    const [displayedMessages, setDisplayedMessages] = useState(messages);

    // Whenever the global messages change and we are not paused, update the displayedMessages.
    useEffect(() => {
        if (!paused) {
            setDisplayedMessages(messages);
        }
    }, [messages, paused]);

    // Toggle pause/resume state.
    const togglePaused = () => {
        setPaused(prev => !prev);
        // When resuming, update displayedMessages immediately.
        if (paused) {
            setDisplayedMessages(messages);
        }
    };

    // Helper function to convert msg.data to string.
    const getDataString = (data: any): string => {
        if (data === null) return "";
        if (typeof data === 'object') return JSON.stringify(data);
        return data;
    };

    // Maximum characters to display when not hovered.
    const maxLength = 80;

    return (
        <Container className="mt-4">

            <DataSummaryComponent />
            <Button
                variant={paused ? 'warning' : 'secondary'}
                onClick={togglePaused}
                className={paused ? 'flash' : ''}
            >
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
                    {displayedMessages.slice().reverse().map((msg, index) => {
                        const fullData = getDataString(msg.data);
                        const displayData =
                            fullData.length > maxLength ? fullData.substring(0, maxLength) + '...' : fullData;
                        return (
                            <tr key={index}>
                                <td
                                    style={{
                                        fontWeight: 'bold',
                                        color: msg.direction === 0 ? 'blue' : 'red',
                                    }}
                                >
                                    {msg.direction === 0 ? 'SENT' : 'RECEIVED'}
                                </td>
                                <td>{msg.command}</td>
                                <td>{msg.subcommand}</td>
                                <td>{msg.timestamp.toLocaleString()}</td>
                                <DataCell fullData={getDataString(msg.data)} maxLength={100} />
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </Container>
    );
};



type ExpandableObjectCellProps = {
    obj: any;
};

export const ExpandableObjectCell: React.FC<ExpandableObjectCellProps> = ({ obj }) => {
    const [expanded, setExpanded] = useState(false);

    // If the value is not an object, just render it
    if (typeof obj !== 'object' || obj === null) {
        return <>{String(obj)}</>;
    }

    // If not expanded, display a clickable "object" label
    if (!expanded) {
        return (
            <span
                style={{
                    color: 'blue',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                }}
                onClick={() => setExpanded(true)}
            >
                object
            </span>
        );
    }

    // When expanded, render a nested table for the object.
    return (
        <Table bordered size="sm" style={{ margin: 0, borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
                {Object.entries(obj).map(([key, value], index) => (
                    <tr key={index}>
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

const renderValue = (value: any): React.ReactNode => {
    if (typeof value === 'object' && value !== null) {
        return <ExpandableObjectCell obj={value} />;
    }
    return String(value);
};


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
    const chartLength = messages.length;

    // Prepare an array of variables to display.
    const dataSummary: any[] = [
        { name: 'clients', value: clients },
        { name: 'lastCheck', value: lastCheck.toString() + " (" + new Date(1000 * lastCheck).toLocaleString() + ")" },
        { name: 'passedSeconds', value: passedSeconds },
        { name: 'offline', value: offline },
        { name: 'lastForecast', value: lastForecast },
        { name: 'numberConnections', value: numberConnections },
        { name: 'chartLength', value: chartLength },
    ];

    return (
        <Container style={{ marginBottom: "50px" }} className="mt-4">
            <h2>Data Summary</h2>
            <style>{`
             /* Applies to the outer table */
.table {
  border-collapse: collapse;
  border: 1px solid #000 !important;
}

/* All table cells have borders */
.table td, 
.table th {
  border: 1px solid #000 !important; 
  margin: 0 !important;
  padding: 0px !important;
}

            `}</style>
            <Table striped bordered hover style={{ width: 'auto' }}>
                <tbody>
                    {dataSummary.map((item, index) => (
                        <tr key={index}>
                            <td >{item.name}</td>
                            <td style={{ textAlign: 'right' }}>{renderValue(item.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
};

