import React, { useState, useEffect, useContext } from 'react'
import { phpLoc } from '../components/Globals'


const subCommands = ["Posts", "Donors", "History", "Chart", "Status", "Forecast", "Videos", "Stats"]
const subCommandsSets = [SetPosts, SetDonors, SetHistory, SetChart, SetForecast, setVideos, SetStats]


const DataContext = React.createContext()

export function useData() {
    return useContext(DataContext)
}

export function DataProvider({ children }) {
    const [loading, setLoading] = useState(true)

    const [posts, setPosts] = useState([])
    const [donors, setDonors] = useState([])
    const [history, setHistory] = useState([])
    const [chart, setChart] = useState([])
    const [forecast, setForecast] = useState([])
    const [videos, setVideos] = useState({ videos: [], videoYears: [] })
    const [hitStats, setHitStats] = useState([])

    const [updates, setUpdates] = useState([])

    const ws = useRef(null)

    // Connect to the socket server
    useEffect(() => {
        // ws.current = new WebSocket("ws://localhost/ws");
        ws.current = new WebSocket("wss://gliderportsocketserver.thilenius.org/ws");
        ws.current.onopen = () => {
            console.log("ws opened")
            setLoading(false)
        }
        ws.current.onclose = () => console.log("ws closed");

        const wsCurrent = ws.current;

        return () => {
            wsCurrent.close();
        };
    }, [])

    // ask for data
    // name =  Posts | Donors | History | Chart | Status | Forecast | Stats
    function loadData(name) {
        if (!ws.current) {
            console.log("no ws")
            return
        }
        if (subCommands.find(e => e === name) === undefined) {
            console.log("wrong SubCommand given to loadData")
            return
        }
        messageBody = { command: "fetchData", type: name }
        ws.current.send(JSON.stringify(messageBody));
    }

    // process returned messages
    useEffect(() => {
        ws.current.onmessage = (webSocketMessage) => {
            const c = [...cursors]
            const messageBody = JSON.parse(webSocketMessage.data)
            const sender = messageBody.sender

            if (messageBody.command === 'fetchData') {
                const cmd = subCommands.findIndex((e) => messageBody.subCommand === e)
                if (cmd < 0) {
                    console.log("unknown SubCommand returned")
                    return
                }
                subCommandsSets[cmd](JSON.parse(messageBody.data))
            }
            if (messageBody.command === 'updates') {
                setUpdates(JSON.parse(messageBody.data))
            }
        };
    }, [donors, posts, history, chart, forecast, videos, videoYears, hitStats])






    const value = {
        //states
        donors,
        posts,
        history,
        chart,
        forecast,
        videos,
        videoYears,
        hitStats,
        updates,

        //functions 
        loadData
    }
    return (
        <DataContext.Provider value={value}>
            {loading ? <h3>Connecting to Web Socket Server</h3> : children}
        </DataContext.Provider>
    )
}
