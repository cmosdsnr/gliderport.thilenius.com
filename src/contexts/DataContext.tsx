import React, { createContext, useState, useEffect, useContext, useRef, Dispatch, SetStateAction } from 'react'
import { useInterval } from 'components/Globals'
import { formatter } from 'components/Globals'
import { useMessages } from 'components/Admin/MessageLogger'

const DataContext = createContext<DataContextInterface>({} as DataContextInterface);

export function useData() {
    return useContext(DataContext)
}

export function DataProvider({ children }: any) {
    const [loading, setLoading] = useState(true)
    const [posts, setPosts] = useState<Post[]>([])
    const [donors, setDonors] = useState<Donor[]>([])
    const [history, setHistory] = useState<Day[]>([])
    const [chart, setChart] = useState<Reading[]>([])
    const [latest, setLatest] = useState<Reading>(
        {
            time: 0,
            speed: 0,
            direction: 0,
            humidity: 0,
            pressure: 0,
            temperature: 0,
        })
    const [status, setStatus] = useState<number[]>([])
    const [forecast, setForecast] = useState<Forecast[]>([])
    const [forecastFull, setForecastFull] = useState<Forecast[]>([])
    const [hitStats, setHitStats] = useState<Stats>({})
    const [clients, setClients] = useState<Client[]>([])
    const [passedSeconds, setPassedSeconds] = useState(0)
    const [offline, setOffline] = useState(false)
    const [image1, setImage1] = useState<string | null>(null)
    const [bigImage1, setBigImage1] = useState<string | null>(null)
    const [image2, setImage2] = useState<string | null>(null)
    const [bigImage2, setBigImage2] = useState<string | null>(null)
    const [lastForecast, setLastForecast] = useState(0)
    const [sun, setSun] = useState<Sun>({ rise: 0, set: 0 })
    const [sleeping, setSleeping] = useState<boolean>(false)
    const [lastCheck, setLastCheck] = useState<TimeStamp>(1658263194)
    const [videoWidth, setVideoWidth] = useState(0)
    const [videoHeight, setVideoHeight] = useState(0)
    const [numberConnections, setNumberConnections] = useState(0)
    const [videoServerOnline, setVideoServerOnline] = useState<boolean>(false)

    const [message, setMessage] = useState<[string | null, string | null]>([null, null])
    const [cameraImages, setCameraImages] = useState<CameraImages>({
        camera1: [],
        camera2: [],
    });
    const { messageLogger, setChartLength } = useMessages();

    const handleChart = (d: Reading[]) => {
        setChart(d)
        if (Array.isArray(d) && d.length > 0) {
            setLatest(d[d.length - 1])
            setPassedSeconds(((new Date()).getTime() / 1000) - d[d.length - 1].time)
        }
        // console.log(d)
        // debugger
    }

    const handleCurrentData = (d: CurrentData) => {
        setSun({ rise: d.sunrise, set: d.sunset })
        setOffline(d.onlineStatus === 0)
        setLastCheck(d.onlineStatusTouched)
        setLastForecast(d.lastForecast)
        setVideoWidth(d.videoWidth)
        setVideoHeight(d.videoHeight)
        setNumberConnections(d.numberConnections);
        setVideoServerOnline(d.videoServerOnline === 1);
        setSleeping(d.sleeping == 1 ? true : false);
    }

    const handleImage1 = (d: gpImageData) => {
        if (d === null || d.A === undefined) return
        setImage1(d.A)
    }

    const handleBigImage1 = (d: gpImageData) => {
        setBigImage1((d === null ? null : d.A))
        console.log("Initial fetch of big image")
    }

    const handleImage2 = (d: gpImageData) => {
        if (d === null || d.A === undefined) return
        setImage2(d.A)
    }

    const handleBigImage2 = (d: gpImageData) => {
        setBigImage2((d === null ? null : d.A))
        console.log("Initial fetch of big image")
    }

    const handleMessage = (msg: [string | null, string | null]) => {
        setMessage(msg)
        console.log("Message received")
    }

    const handleClients = (d: Client[]) => {
        setClients(d);
        // console.log("clients: ", JSON.stringify(d));
    }

    const subCommands = {
        Posts: setPosts,
        Donors: setDonors,
        History: setHistory,
        Chart: handleChart,
        Status: setStatus,
        Clients: handleClients,
        Forecast: setForecast,
        ForecastFull: setForecastFull,
        Stats: setHitStats,
        CurrentData: handleCurrentData,
        Image1: handleImage1,
        BigImage1: handleBigImage1,
        Image2: handleImage2,
        BigImage2: handleBigImage2,
        Message: handleMessage,
    }

    const ws = useRef<WebSocket | null>(null)

    useEffect(() => {
        console.table(hitStats)
    }, [hitStats])

    useEffect(() => {
        setChartLength(chart.length);
    }, [chart])

    const startWebSocket = () => {
        ws.current = new WebSocket(import.meta.env.VITE_SOCKET_SERVER_URL)
        ws.current.onopen = () => {
            console.log("ws opened");
            loadData("Message");
            loadData("CurrentData");
            loadData("Chart");
            loadData("Clients");
            loadData("Forecast");
            // testAll()
            setLoading(false);
            setPassedSeconds(0);
        }
        ws.current.onclose = () => {
            console.log("ws closed");
            setLoading(true);
        }
    }

    const updateImageList = (camera: number, newImages: string, date: number) => {
        const t = { ...cameraImages };
        // add in the new image to the correct camera

        if (camera === 1) {
            t.camera1.push({ image: newImages, date, dateString: formatter.format(new Date(1000 * date)) });
            t.camera1.shift();
        }
        if (camera === 2) {
            t.camera2.push({ image: newImages, date, dateString: formatter.format(new Date(1000 * date)) });
            t.camera2.shift();
        }
    }

    // Fetch last 10 images on startup
    const fetchImages = () => {
        fetch(import.meta.env.VITE_UPDATE_SERVER_URL + "/getLastFiveSmallImages")
            .then(res => res.json())
            .then(data => {
                data.camera1.forEach((d: any, i: number) => { data.camera1[i].dateString = formatter.format(new Date(d.date)) });
                data.camera2.forEach((d: any, i: number) => { data.camera2[i].dateString = formatter.format(new Date(d.date)) });
                setCameraImages(data);
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

                switch (command) {
                    case 'fetchData': {
                        // Define a mapping from subCommand strings to functions.
                        const fetchDataHandlers = {
                            Posts: subCommands.Posts,
                            Donors: subCommands.Donors,
                            History: subCommands.History,
                            Chart: subCommands.Chart,
                            Status: subCommands.Status,
                            Forecast: subCommands.Forecast,
                            ForecastFull: subCommands.ForecastFull,
                            Clients: subCommands.Clients,
                            Stats: subCommands.Stats,
                            CurrentData: subCommands.CurrentData,
                            Message: subCommands.Message,
                            Image1: subCommands.Image1,
                            BigImage1: subCommands.BigImage1,
                            Image2: subCommands.Image2,
                            BigImage2: subCommands.BigImage2,
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
                            sunrise,
                            sunset,
                            onlineStatus,
                            onlineStatusTouched,
                            lastForecast,
                            lastRecord,
                            speed,
                            direction,
                            humidity,
                            pressure,
                            temperature,
                            videoWidth,
                            videoHeight,
                            numberConnections,
                            sleeping,
                        } = data;

                        if (sunrise && sunset) {
                            setSun({ rise: sunrise, set: sunset });
                        }
                        if (onlineStatus !== undefined) {
                            setOffline(onlineStatus === 0);
                        }
                        if (onlineStatusTouched) {
                            setLastCheck(onlineStatusTouched);
                        }
                        if (lastForecast) {
                            setLastForecast(lastForecast);
                        }
                        if (lastRecord) {
                            let newRecord = { ...latest, time: lastRecord };
                            if (speed !== undefined) newRecord.speed = speed;
                            if (direction !== undefined) newRecord.direction = direction;
                            if (humidity !== undefined) newRecord.humidity = humidity;
                            if (pressure !== undefined) newRecord.pressure = pressure;
                            if (temperature !== undefined) newRecord.temperature = temperature;
                            setChart([...chart, newRecord]);
                            setLatest(newRecord);
                            setPassedSeconds(0);
                        }
                        if (videoWidth !== undefined) setVideoWidth(videoWidth);
                        if (videoHeight !== undefined) setVideoHeight(videoHeight);
                        if (numberConnections !== undefined) setNumberConnections(numberConnections);
                        if (sleeping !== undefined) setSleeping(sleeping === 1);
                        break;
                    }
                    case 'image': {
                        // Log the data but clear out the image field.
                        if (data.camera === 1) {
                            updateImageList(1, data.image, data.date);
                        }
                        if (data.camera === 2) {
                            updateImageList(2, data.image, data.date);
                        }
                        break;
                    }
                    case 'image1': {
                        setImage1(data);
                        break;
                    }
                    case 'image2': {
                        setImage2(data);
                        break;
                    }
                    case 'ping': {
                        break;
                    }
                    default: {
                        break;
                    }
                }
                // if command was image1 or image2 make the data "Image Data"
                if (command === "image1" || command === "image2")
                    messageLogger(1, command, subCommand, "Image Data");
                else
                    messageLogger(1, command, subCommand, { ...data, image: "Image Data" });
            };
        }


    }, [chart, ws.current])

    const interval = 10 //seconds
    useInterval(() => {
        setPassedSeconds(passedSeconds + interval)
        if (loading)
            // try to open again
            startWebSocket();
    }, interval * 1000)

    const printDate = (ts: TimeStamp): string => {
        const dt = new Date(1000 * ts)
        return (
            (1 + dt.getMonth()).toString() + "/" +
            dt.getDate().toString() + ' ' +
            (dt.getHours() < 10 ? "0" : "") +
            dt.getHours().toString() + ":" +
            (dt.getMinutes() < 10 ? "0" : "") +
            dt.getMinutes().toString()
        )
    }
    const testAll = () => {
        loadData("Image1")
        loadData("Image2")
        loadData("BigImage1")
        loadData("BigImage2")
        loadData("Posts")
        loadData("Donors")
        loadData("History")
        loadData("Chart")
        loadData("Status")
        loadData("Forecast")
        loadData("ForecastFull")
        loadData("Stats")
    }



    const value: DataContextInterface = {
        //states
        clients,
        donors,
        posts,
        history,
        chart,
        latest,
        forecast,
        forecastFull,
        status,
        lastCheck,
        hitStats,
        passedSeconds,
        offline,
        cameraImages,
        sleeping,
        image1,
        bigImage1,
        image2,
        bigImage2,
        lastForecast,
        sun,
        videoWidth,
        videoHeight,
        numberConnections,
        videoServerOnline,
        //functions 
        loadData,
        printDate,
        message,

    }
    return (
        <DataContext.Provider value={value}>
            {loading ? <h3>Server hardware failure... working on it</h3> : children}
            {/* {loading ? <h3>Connecting to Web Socket Server...</h3> : children} */}
        </DataContext.Provider>
    )
}