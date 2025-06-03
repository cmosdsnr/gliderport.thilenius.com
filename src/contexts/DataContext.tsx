import React, { createContext, useState, useEffect, useContext, useRef, Dispatch, SetStateAction } from 'react'
import { useInterval } from 'hooks/useInterval'
import { formatter, b64toBlob } from 'components/Globals'
import { useMessages } from 'components/Admin/MessageLogger'
import { StatusCollectionProvider } from './StatusCollection'

export type Reading = {
    time: number;
    speed: number;
    direction: number;
    humidity: number;
    pressure: number;
    temperature: number;
};

// Fetch 24hrs data
const fetchData = async (): Promise<Reading[]> => {
    try {
        // const url = new URL("/getData", import.meta.env.VITE_UPDATE_SERVER_URL);
        const url = new URL("/getData", import.meta.env.VITE_UPDATE_SERVER_URL);
        url.searchParams.set("hours", "24");
        const response = await fetch(url.toString());
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            //rename timestamp to time
            // add 101,325 to pressure
            //divide speed and temperature by 10
            data.forEach((d: any) => {
                d.time = d.timestamp;
                delete d.timestamp;
                d.pressure = (d.pressure + 101325) / 100;
                d.speed = d.speed / 10;
                d.temperature = d.temperature / 10;
            });
            return data;
        }
        return [];
    } catch (error: any) {
        console.error("Error fetching data:", error.message);
        return [];
    }
};



export interface CameraImage {
    url: string;
    date: number;
    dateString: string;
}

export interface CameraImages {
    camera1: CameraImage[];
    camera2: CameraImage[];
}


export interface DataContextInterface {
    //states
    clients: Array<Client>;
    donors: Array<Donor>;
    posts: Array<Post>;
    history: Array<any>;
    readings: Reading[];
    status: Array<number>;
    lastCheck: TimeStamp;
    passedSeconds: number;
    offline: boolean;
    cameraImages: CameraImages;
    lastForecast: TimeStamp;
    numberConnections: number;
    //functions
    loadData: (name: string) => void;
}

const DataContext = createContext<DataContextInterface>({} as DataContextInterface);

export function useData() {
    return useContext(DataContext)
}

export function DataProvider({ children }: any) {
    const [loading, setLoading] = useState(true)
    const [posts, setPosts] = useState<Post[]>([])
    const [donors, setDonors] = useState<Donor[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [readings, setReadings] = useState<Reading[]>(
        [{
            time: 0,
            speed: 0,
            direction: 0,
            humidity: 0,
            pressure: 0,
            temperature: 0,
        }])
    const [status, setStatus] = useState<number[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [passedSeconds, setPassedSeconds] = useState(0)
    const [offline, setOffline] = useState(false)
    const [lastForecast, setLastForecast] = useState(0)
    const [lastCheck, setLastCheck] = useState<TimeStamp>(1658263194)
    const [numberConnections, setNumberConnections] = useState(0)
    const [cameraImages, setCameraImages] = useState<CameraImages>({
        camera1: [],
        camera2: [],
    });
    const { messageLogger } = useMessages();

    const load = async () => {
        const data = await fetchData();
        setReadings(data);
    };

    useEffect(() => {
        load();
    }, []);

    const handleCurrentData = (d: CurrentData) => {
        setOffline(d.onlineStatus === 0)
        setLastCheck(d.onlineStatusTouched)
        setLastForecast(d.lastForecast)
        setNumberConnections(d.numberConnections);
    }

    const handleClients = (d: Client[]) => {
        setClients(d);
        // console.log("clients: ", JSON.stringify(d));
    }

    const subCommands = {
        Posts: setPosts,
        Donors: setDonors,
        History: setHistory,
        Status: setStatus,
        Clients: handleClients,
        CurrentData: handleCurrentData,
    }

    const ws = useRef<WebSocket | null>(null)

    useEffect(() => {
        console.log("readings length:", readings.length);
    }, [readings])

    const startWebSocket = () => {
        ws.current = new WebSocket(import.meta.env.VITE_SOCKET_SERVER_URL)
        ws.current.onopen = () => {
            console.log("ws opened");
            setLoading(false);
            setPassedSeconds(0);
        }
        ws.current.onclose = () => {
            console.log("ws closed");
            setLoading(true);
        }
    }

    const updateImageList = (camera: number, newImage: string, date: number) => {
        setCameraImages(prev => {
            const blob = b64toBlob(newImage, 'image/jpeg');
            const url = blob ? URL.createObjectURL(blob) : '';

            // clone the arrays so we never mutate prev in-place
            const cam1 = [...prev.camera1];
            const cam2 = [...prev.camera2];

            const target = camera === 1 ? cam1 : cam2;

            /* 1️⃣ Drop the oldest frame *first* (only when we already have five) */
            if (target.length === 5) {
                const dropped = target.shift();          // now length is 4
                if (dropped?.url) URL.revokeObjectURL(dropped.url);
            }

            /* 2️⃣ Push the new frame – list is never empty during render */
            target.push({ url, date, dateString: formatter.format(new Date(date)) });

            /* 3️⃣ Return a *new* top-level object so React re-renders */
            return { camera1: cam1, camera2: cam2 };
        });
    }

    // Fetch last 10 images on startup
    const fetchImages = () => {
        if (!loading) return;
        fetch(import.meta.env.VITE_UPDATE_SERVER_URL + "/getLastFiveSmallImages")
            .then(res => res.json())
            .then(data => {
                const processed: CameraImages = { camera1: [], camera2: [] };
                data.camera1.forEach((d: any) => {
                    const blob = b64toBlob(d.image, 'image/jpeg');
                    const url = blob ? URL.createObjectURL(blob) : '';
                    processed.camera1.push({ url, date: d.date, dateString: formatter.format(new Date(d.date)) });
                });
                data.camera2.forEach((d: any) => {
                    const blob = b64toBlob(d.image, 'image/jpeg');
                    const url = blob ? URL.createObjectURL(blob) : '';
                    processed.camera2.push({ url, date: d.date, dateString: formatter.format(new Date(d.date)) });
                });
                setCameraImages(processed);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching images:", error);
                setLoading(false);
            });
    };



    // Connect to the socket server
    useEffect(() => {
        fetchImages();
        // fetchData();
        startWebSocket();
        const wsCurrent = ws.current;
        return () => {
            if (wsCurrent) wsCurrent.close();
        };
    }, [])

    // ask for data
    // name =  Posts | Donors | History | Chart | Status | Forecast | Stats
    function loadData(name: string) {
        if (!ws.current) {
            console.log("no ws");
            return;
        }

        if (ws.current.readyState === WebSocket.CONNECTING) {
            console.log("WebSocket is still connecting, please wait...");
            return;
        }

        if (ws.current.readyState !== WebSocket.OPEN) {
            console.log("WebSocket is not open, cannot send data.");
            return;
        }

        if (!(name in subCommands)) {
            console.log("wrong SubCommand given to loadData");
            return;
        }

        const messageBody = { command: "fetchData", subCommand: name, days: 8 };
        messageLogger(0, "fetchData", name, null);
        ws.current.send(JSON.stringify(messageBody));
    }
    // process returned messages fetchData || update || image || ping
    // ws.current.onmessage must be redefined when chart changes
    useEffect(() => {
        if (ws.current != null) {
            ws.current.onmessage = (webSocketMessage) => {
                const messageBody = JSON.parse(webSocketMessage.data);
                const { command, subCommand, data, error } = messageBody;

                console.log("ws message received: ", messageBody.command);
                switch (command) {
                    case 'newRecords': {
                        messageBody.records.forEach((d: any) => {
                            d.time = d.timestamp;
                            delete d.timestamp;
                            d.pressure = (d.pressure + 101325) / 100;
                            d.speed = d.speed / 10;
                            d.temperature = d.temperature / 10;
                        });
                        setReadings(prev => [...prev, ...messageBody.records].slice(-9000));
                        break;
                    }
                    case 'newImage': {
                        // Destructure the properties from data.
                        console.log("newImage received")
                        const { camera, image, date } = messageBody.imageInfo;
                        updateImageList(camera, image, date);
                        break;
                    }

                    case 'fetchData': {
                        // Define a mapping from subCommand strings to functions.
                        const fetchDataHandlers = {
                            Posts: subCommands.Posts,
                            Donors: subCommands.Donors,
                            History: subCommands.History,
                            Status: subCommands.Status,
                            Clients: subCommands.Clients,
                            CurrentData: subCommands.CurrentData,
                        };

                        const handler = fetchDataHandlers[subCommand as keyof typeof fetchDataHandlers];
                        if (!handler) {
                            console.log(`${subCommand}: unknown SubCommand returned`);
                            return;
                        }
                        if (error) {
                            console.log(`error: ${subCommand} : ${error}`);
                            return;
                        }
                        handler(data);
                        break;
                    }
                    case 'update': {
                        // Destructure the properties from data.
                        const {
                            onlineStatus,
                            onlineStatusTouched,
                            lastForecast,
                            numberConnections,
                        } = data;

                        if (onlineStatus !== undefined) {
                            setOffline(onlineStatus === 0);
                        }
                        if (onlineStatusTouched) {
                            setLastCheck(onlineStatusTouched);
                        }
                        if (lastForecast) {
                            setLastForecast(lastForecast);
                        }
                        if (numberConnections !== undefined) setNumberConnections(numberConnections);

                        break;
                    }
                    case 'ping': {
                        console.log("ping received");
                        ws.current?.send(JSON.stringify({ command: "pong" }));
                        break;
                    }
                    default: {
                        break;
                    }
                }
            };
        }
    }, [ws.current])

    const interval = 10 //seconds
    useInterval(() => {
        setPassedSeconds(passedSeconds + interval)
        if (loading)
            // try to open again
            startWebSocket();
    }, interval * 1000)


    const testAll = () => {
        loadData("Posts")
        loadData("Donors")
        loadData("History")
        loadData("Chart")
        loadData("Status")
        loadData("Forecast")
        loadData("ForecastFull")
    }



    const value: DataContextInterface = {
        //states
        clients,
        donors,
        posts,
        history,
        readings,
        status,
        lastCheck,
        passedSeconds,
        offline,
        cameraImages,
        lastForecast,
        numberConnections,
        //functions 
        loadData,

    }
    return (
        <StatusCollectionProvider>
            <DataContext.Provider value={value}>
                {/* {loading ? <h3>Server hardware failure... working on it</h3> : children} */}
                {children}
                {/* {loading ? <h3>Connecting to Web Socket Server...</h3> : children} */}
            </DataContext.Provider>
        </StatusCollectionProvider>
    )
}