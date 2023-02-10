import React, { createContext, useState, useEffect, useContext, useRef, Dispatch, SetStateAction } from 'react'
import { useInterval } from '../components/Globals'

// Donor format from WebSocket Server
type Donor = {
    id: number,
    name: string,
    amount: number,
    date: string
}

// Post format from WebSocket Server PLACEHOLDER
interface Post {
    d?: number[],
    sun?: number
}

// Code History format from WebSocket Server
type Day = {
    date: number,
    codes: number[],
    sun: [number, number],
    limits: [number, number],
}

// 
export type Reading = {
    time: number,
    speed: number,
    direction: number,
    humidity: number,
    pressure: number,
    temperature: number
}
const emptyReading: Reading = { time: 0, speed: 0, direction: 0, humidity: 0, pressure: 0, temperature: 0 }

export interface Weeks {
    totals: number[],
    uniques: number[],
    start: string
}

export interface Stats {
    lastReset?: string,
    total?: {
        date: string,
        count: number,
        unique: number
    },
    day?: { day: string, unique: number, total: number },
    week?: { day: string, unique: number, total: number },
    month?: { unique: number, total: number },
    weeks?: Weeks,
}

interface Forecast {
    [index: number]: [number, string]  // hour of the day, forecast
}

// video data received from server
type VideoItem = {
    years: [string],
    dates: [[string, string] | string] // from date -> to date, or a single day
}


// translated video data for consumption
interface VideoData {
    videos: string[]
    videoYears: string[]
}



type TimeStamp = number

type Sun = {
    rise: TimeStamp,
    set: TimeStamp,
}

// possible fields of update data received from WebSocket Server
type CurrentData = {
    sunrise: TimeStamp,
    sunset: TimeStamp,

    onlineStatus: 0 | 1,
    onlineStatusTouched: TimeStamp,

    lastRecord: TimeStamp,
    speed: number,
    direction: number,
    humidity: number,
    pressure: number,
    temperature: number,

    lastImage: TimeStamp,
    lastForecast: TimeStamp,

    videoWidth: number,
    videoHeight: number,
    numberConnections: number,

}

type ImageData = null | {
    A: string,
}

interface DataContextInterface {
    //states
    donors: Array<Donor>,
    posts: Array<Post>,
    history: Array<Day>,
    chart: Array<Reading>,
    latest: Reading,
    status: Array<number>,
    lastCheck: TimeStamp,
    forecast: Array<Forecast>,
    forecastFull: any,
    videos: VideoData,
    hitStats: Stats | null,
    passedSeconds: number,
    offline: boolean,
    image: string | null,
    bigImage: string | null,
    lastForecast: TimeStamp,
    sun: Sun,
    videoWidth: number,
    videoHeight: number,
    numberConnections: number,
    //functions 
    loadData: (name: string) => void,
    printDate: (ts: TimeStamp) => string,
}

// const DataContext = createContext<DataContextInterface | null>(null)
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
    const [latest, setLatest] = useState<Reading>(emptyReading)
    const [status, setStatus] = useState<number[]>([])
    const [forecast, setForecast] = useState<Forecast[]>([])
    const [forecastFull, setForecastFull] = useState<Forecast[]>([])
    const [hitStats, setHitStats] = useState<Stats>({})
    const [passedSeconds, setPassedSeconds] = useState(0)
    const [offline, setOffline] = useState(false)
    const [image, setImage] = useState<string | null>(null)
    const [bigImage, setBigImage] = useState<string | null>(null)
    const [lastForecast, setLastForecast] = useState(0)
    const [sun, setSun] = useState<Sun>({ rise: 0, set: 0 })
    const [videos, setVideos] = useState<VideoData>({ videos: [], videoYears: [] })
    const [updateForecast, setUpdateForecast] = useState(0)
    const [reFetch, setReFetch] = useState(0)
    const [restartEventSource, setRestartEventSource] = useState()
    const [loaded, setLoaded] = useState<boolean>(false)
    const [lastCheck, setLastCheck] = useState<TimeStamp>(1658263194)
    const [videoWidth, setVideoWidth] = useState(0)
    const [videoHeight, setVideoHeight] = useState(0)
    const [numberConnections, setNumberConnections] = useState(0)

    const handleChart = (d: Reading[]) => {
        setChart(d)
        setLatest(d[d.length - 1])
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
        setNumberConnections(d.numberConnections)
    }

    const handleVideos = (d: VideoItem) => {
        let vids: string[] = []
        d.dates.forEach((v, i) => {
            if (Array.isArray(v)) {
                let dt = new Date(v[0] + " 12:00:00")
                const end = new Date(v[1] + " 12:00:00")
                while (dt <= end) {
                    //push the date
                    const yyyy = dt.getFullYear()
                    let mm = dt.getMonth() + 1 as string | number // Months start at 0!
                    if (mm < 10) mm = '0' + mm;
                    let dd = dt.getDate() as string | number
                    if (dd < 10) dd = '0' + dd;
                    vids.push(yyyy + '-' + mm + '-' + dd)
                    //add a day
                    dt.setDate(dt.getDate() + 1)
                }
            } else {
                let dt = new Date(v + " 12:00:00")
                const yyyy = dt.getFullYear()
                let mm = dt.getMonth() + 1 as string | number // Months start at 0!
                if (mm < 10) mm = '0' + mm;
                let dd = dt.getDate() as string | number
                if (dd < 10) dd = '0' + dd;
                vids.push(yyyy + '-' + mm + '-' + dd)
            }
        })
        setVideos({ videos: vids, videoYears: d.years })
    }

    const handleImage = (d: ImageData) => {
        if (d === null || d.A === undefined) return
        setImage(d.A)
    }

    const handleBigImage = (d: ImageData) => {
        setBigImage((d === null ? null : d.A))
        console.log("Initial fetch of big image")
    }

    const subCommands = {
        Posts: setPosts,
        Donors: setDonors,
        History: setHistory,
        Chart: handleChart,
        Status: setStatus,
        Forecast: setForecast,
        ForecastFull: setForecastFull,
        Videos: handleVideos,
        Stats: setHitStats,
        CurrentData: handleCurrentData,
        Image: handleImage,
        BigImage: handleBigImage,
    }

    const ws = useRef<WebSocket | null>(null)
    useEffect(() => {
        console.table(hitStats)
    }, [hitStats])
    useEffect(() => {
        console.log("chart length:", chart.length)
    }, [chart])

    // Connect to the socket server
    useEffect(() => {
        ws.current = new WebSocket(import.meta.env.VITE_SOCKET_SERVER_URL)
        ws.current.onopen = () => {
            console.log("ws opened")
            loadData("CurrentData")
            loadData("Chart")
            // testAll()
            setLoading(false)
            setPassedSeconds(0)
        }
        ws.current.onclose = () => {
            console.log("ws closed")
            // try to open again
            setLoading(true)
            ws.current = new WebSocket(import.meta.env.VITE_SOCKET_SERVER_URL)
        }
        const wsCurrent = ws.current;
        return () => {
            wsCurrent.close();
        };
    }, [])

    // ask for data
    // name =  Posts | Donors | History | Chart | Status | Forecast | Stats
    function loadData(name: string) {
        if (!ws.current) {
            console.log("no ws")
            return
        }
        if (!(name in subCommands)) {
            console.log("wrong SubCommand given to loadData")
            return
        }
        console.log("requesting data: " + name)
        const messageBody = { command: "fetchData", subCommand: name, days: 8 }
        // if (name === "History") messageBody.days = 8
        ws.current.send(JSON.stringify(messageBody));
    }

    // process returned messages fetchData || update || image || ping
    useEffect(() => {
        if (ws.current != null) ws.current.onmessage = (webSocketMessage) => {

            const messageBody = JSON.parse(webSocketMessage.data)
            const sender = messageBody.sender

            if (messageBody.command === 'fetchData') {
                if (!(messageBody.subCommand in subCommands)) {
                    console.log(messageBody.subCommand + ": unknown SubCommand returned")
                    return
                }

                // Posts: setPosts,
                // Donors: setDonors,
                // History: setHistory,
                // Chart: handleChart,
                // Status: setStatus,
                // Forecast: setForecast,
                // ForecastFull: setForecastFull,
                // Videos: handleVideos,
                // Stats: setHitStats,
                // CurrentData: handleCurrentData,
                // Image: handleImage,
                // BigImage: handleBigImage,

                let cmd

                if (messageBody.subCommand === "Posts")
                    cmd = subCommands.Posts
                else if (messageBody.subCommand === "Donors")
                    cmd = subCommands.Donors
                else if (messageBody.subCommand === "History")
                    cmd = subCommands.History
                else if (messageBody.subCommand === "Chart")
                    cmd = subCommands.Chart
                else if (messageBody.subCommand === "Status")
                    cmd = subCommands.Status
                else if (messageBody.subCommand === "Forecast")
                    cmd = subCommands.Forecast
                else if (messageBody.subCommand === "ForecastFull")
                    cmd = subCommands.ForecastFull
                else if (messageBody.subCommand === "Videos")
                    cmd = subCommands.Videos
                else if (messageBody.subCommand === "Stats")
                    cmd = subCommands.Stats
                else if (messageBody.subCommand === "CurrentData")
                    cmd = subCommands.CurrentData
                else if (messageBody.subCommand === "Image")
                    cmd = subCommands.Image
                else
                    cmd = subCommands.BigImage


                if (messageBody.error) {
                    console.log("error: " + messageBody.subCommand + " : " + messageBody.error)
                    return
                }
                console.log("Fetch Data message received for " + messageBody.subCommand)

                // console.log('✅ function is defined');
                // console.log('⛔️ ', cmd, ' function is NOT defined')
                // if (chart.length > 1) debugger
                // if (messageBody.subCommand === "CurrentData") debugger
                cmd(messageBody.data)


            }
            // if (messageBody.command === 'update') debugger
            if (messageBody.command === 'update' && chart?.length > 0) {
                console.log("update message received: ", messageBody.data)
                const d = messageBody.data
                if ('sunrise' in d && 'sunset' in d) setSun({ rise: d.sunrise, set: d.sunset })

                if ('onlineStatus' in d) setOffline(d.onlineStatus === 0)
                if ('onlineStatusTouched' in d) setLastCheck(d.onlineStatusTouched)

                // if ('lastImage' in d) setLastImage(d.lastImage)
                if ('lastForecast' in d) setLastForecast(d.lastForecast)


                // console.log(messageBody.data)
                // note: speed, temp, and pressure are transmitted in the proper scale
                // scaling of raw database data is done in the socketServer (temp/10, speed/10 etc)
                if ('lastRecord' in d) {
                    let newRecord: Reading = { ...latest }
                    newRecord.time = d.lastRecord
                    if ('speed' in d) newRecord.speed = d.speed
                    if ('direction' in d) newRecord.direction = d.direction
                    if ('humidity' in d) newRecord.humidity = d.humidity
                    if ('pressure' in d) newRecord.pressure = d.pressure
                    if ('temperature' in d) newRecord.temperature = d.temperature
                    setChart([...chart, newRecord])
                    setLatest(newRecord)
                }

                if ('videoWidth' in d) setVideoWidth(d.videoWidth)
                if ('videoHeight' in d) setVideoHeight(d.videoHeight)
                if ('numberConnections' in d) setNumberConnections(d.numberConnections)

                setPassedSeconds(0)
            }
            if (messageBody.command === 'image') {
                // console.log("image message received, length: ", messageBody.data.length)
                setImage(messageBody.data)
            }
            if (messageBody.command === 'ping') {
                console.log("keep alive ping received")
            }
        };
    }, [chart])

    const interval = 10 //seconds
    useInterval(() => {
        setPassedSeconds(passedSeconds + interval)
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
        loadData("Image")
        loadData("BigImage")
        loadData("Posts")
        loadData("Donors")
        loadData("History")
        loadData("Chart")
        loadData("Status")
        loadData("Forecast")
        loadData("ForecastFull")
        loadData("Videos")
        loadData("Stats")
    }

    const value: DataContextInterface = {
        //states
        donors,
        posts,
        history,
        chart,
        latest,
        forecast,
        forecastFull,
        status,
        lastCheck,
        videos,
        hitStats,
        passedSeconds,
        offline,
        image,
        bigImage,
        lastForecast,
        sun,
        videoWidth,
        videoHeight,
        numberConnections,
        //functions 
        loadData,
        printDate,
    }
    return (
        <DataContext.Provider value={value}>
            {loading ? <h3>Connecting to Web Socket Server...</h3> : children}
        </DataContext.Provider>
    )
}