/**
 * @packageDocumentation
 * Forecast page for the Gliderport application.
 * Displays a 5-day forecast with interactive charts for wind, temperature, humidity, pressure, and cloud cover.
 */
import React, { useState, useEffect, useMemo } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartTooltip,
    Legend,
    ReferenceArea,
} from "recharts";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import { motion } from "framer-motion";
import useLocalStorageState from "@/hooks/useLocalStorageState";
import { useStatusCollection } from "@/contexts/StatusCollection";
import "./Forecast.css"
// --------------------------------------------------------------------
// Types                                                               
// --------------------------------------------------------------------
export interface MainWeather {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    sea_level: number;
    grnd_level: number;
    humidity: number;
    temp_kf: number;
}

export interface WeatherInfo {
    id: number;
    main: string;
    description: string;
    icon: string;
}

export interface Wind {
    speed: number; // mph when units=imperial
    deg: number;   // wind direction (0‑360°)
    gust: number;
}

export interface ForecastEntry {
    dt: number; // UTC seconds
    main: MainWeather;
    weather: WeatherInfo[];
    clouds: { all: number };
    wind: Wind;
    visibility: number;
    pop: number;
    sys: { pod: "d" | "n" };
    dt_txt: string;
}

export interface City {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
}

export interface ForecastResponse {
    cod: string;
    message: number;
    cnt: number;
    list: ForecastEntry[];
    city: City;
}

// --------------------------------------------------------------------
// Helpers                                                             
// --------------------------------------------------------------------
const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: "America/Los_Angeles" });
const dateFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });


const buildChartData = (entries: ForecastEntry[]) =>
    entries?.map((e, i) => ({
        index: 3 * i,
        hour: hourFmt.format(new Date(e.dt * 1000)),
        ts: e.dt,
        temp: e.main.temp,
        feels_like: e.main.feels_like,
        temp_min: e.main.temp_min,
        temp_max: e.main.temp_max,
        humidity: e.main.humidity,
        pressure: e.main.pressure,
        cover: e.clouds.all,
        wind_speed: e.wind.speed,
        gusts: e.wind.gust,
        wind_dir: e.wind.deg,
    }));

// build alternating day bands (every 8 points) ----------
const bandColors = ["#d5f5f5", "#e8f0de"];
// const buildBands = (startHour: number) => {
//     const bands: { x1: number; x2: number }[] = [
//         { x1: 0, x2: 24 - startHour },
//         { x1: 24 - startHour, x2: 48 - startHour },
//         { x1: 48 - startHour, x2: 72 - startHour },
//         { x1: 72 - startHour, x2: 96 - startHour },
//         { x1: 96 - startHour, x2: 5 * 24 - 3 },
//     ];
//     return bands;
// };

const buildBands = (data: ReturnType<typeof buildChartData>) => {
    if (!data || !data.length) return [];
    const bands: { x1: number; x2: number; fill: string; label: string }[] = [];
    const startHour = parseInt(data[0].hour, 10);
    for (let day = 0; day < 6; day++) {
        const dateLabel = dateFmt.format(new Date(data[8 * day > data.length - 1 ? data.length - 1 : 8 * day].ts * 1000));
        bands.push({ x1: day > 0 ? day * 24 - startHour : 0, x2: (day + 1) * 24 - startHour, fill: bandColors[day % bandColors.length], label: dateLabel });
    }
    bands[5].x2 = 5 * 24 - 3; // last band ends at 117
    return bands;
};

// ticks every 6 h (indices divisible by 2) plus ends
const buildTicks = (data: ReturnType<typeof buildChartData>) => {
    if (!data || !data.length) return [];
    const ticks: number[] = [0];
    const startHour = parseInt(data[0].hour, 10); // first slice hour (0‑23)
    // ticks between 0 and 5*24 -3 
    // 0 -> startHour
    // nextTick at 6 hr boundary: 6-(startHour % 6)
    for (let i = startHour + 1; i < 5 * 24 + startHour - 3; i++) {
        if (i % 6 == 0) ticks.push(i - startHour);
    }
    if (!ticks.includes(5 * 24 - 3))
        ticks.push(5 * 24 - 3); // last tick at 95
    return ticks;
};

const tickFormatter = (idx: number, startHour: number) => {
    const hr = (idx + startHour) % 24;
    switch (hr) {
        case 0: return "Midnight";
        case 12: return "Noon";
        default: return hr.toString().padStart(2, "0");
    }
}

// --------------------------------------------------------------------
// Selectable multi‑series chart                                       
// --------------------------------------------------------------------

interface ChartProps {
    data: ReturnType<typeof buildChartData>,
    bands: { x1: number; x2: number; fill: string; label: string }[],
    ticks: number[],
    startHour: number,
    seriesOptions?: SeriesOptions,
    title?: string
}


// --------------------------------------------------------------------
// Wind Speed & Direction chart                                        
// --------------------------------------------------------------------
/**
 * Wind Speed & Direction chart component.
 * @param props - ChartProps
 * @returns {React.ReactElement}
 */
function WindChart({ data, bands, ticks, startHour }: ChartProps): React.ReactElement {

    const speedColor = "#0088fe";
    const gustColor = "#cc88fe";
    const dirColor = "#ff7300";

    return (
        <Card className="shadow-lg mb-4">
            <Card.Body>
                <h5 className="mb-3">Wind Speed & Direction</h5>
                <motion.div layout>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={data} margin={{ top: 20, right: 40, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="index"
                                type="number"
                                domain={[0, 5 * 24 - 3]}
                                ticks={ticks}
                                tickFormatter={(idx: number) => tickFormatter(idx, startHour)}
                            />

                            <YAxis
                                yAxisId="left"
                                stroke={speedColor}
                                tick={{ fill: speedColor }}
                                axisLine={{ stroke: speedColor }}
                                tickLine={{ stroke: speedColor }}
                                label={{ value: "mph", fill: speedColor, angle: -90, position: "insideLeft" }}
                            />

                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 360]}
                                stroke={dirColor}
                                tick={{ fill: dirColor }}
                                axisLine={{ stroke: dirColor }}
                                tickLine={{ stroke: dirColor }}
                                label={{ value: "deg", fill: dirColor, angle: 90, position: "insideRight" }}
                            />

                            <RechartTooltip />
                            <Legend />
                            {bands.map((b, i) => (
                                <ReferenceArea
                                    key={i}
                                    yAxisId="left"
                                    x1={b.x1}
                                    x2={b.x2}
                                    fill={b.fill}
                                    ifOverflow="extendDomain"
                                    label={{
                                        value: b.label,
                                        position: "top",
                                        offset: -20,     // pulls the date clear of the grid
                                        fill: "#000",
                                        fontSize: 12,
                                    }}
                                />
                            ))}

                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="wind_speed"
                                stroke={speedColor}
                                dot={false}
                                strokeWidth={2}
                                name="Wind (mph)"
                            />
                            {/* the gust data from openweathermap is not reliable and gust is often < speed */}
                            {/* <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="gusts"
                                stroke={gustColor}
                                dot={false}
                                strokeWidth={2}
                                name="Gust (mph)"
                            /> */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="wind_dir"
                                stroke={dirColor}
                                dot={false}
                                strokeWidth={2}
                                name="Direction (°)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>
            </Card.Body>
        </Card>
    );
}


type SeriesOptions = {
    key: string;
    label: string;
    color: string;
}[];

/**
 * Generic multi-series chart component.
 * @param props - ChartProps
 * @returns {React.ReactElement}
 */
function Chart({ data, bands, ticks, startHour, seriesOptions, title }: ChartProps): React.ReactElement {

    return (
        <Card className="shadow-lg mb-4">
            <Card.Body>
                <h5 className="mb-3">{title}</h5>
                <motion.div layout>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="index"
                                type="number"
                                domain={[0, 5 * 24 - 3]}
                                ticks={ticks}
                                tickFormatter={(idx: number) => tickFormatter(idx, startHour)}
                            />
                            <YAxis domain={["dataMin - 5", "dataMax + 5"]} />
                            <RechartTooltip />
                            <Legend />
                            {bands.map((b, i) => (
                                <ReferenceArea
                                    key={i}
                                    x1={b.x1}
                                    x2={b.x2}
                                    fill={b.fill}
                                    ifOverflow="extendDomain"
                                    label={{
                                        value: b.label,
                                        position: "top",
                                        offset: -20,     // pulls the date clear of the grid
                                        fill: "#000",
                                        fontSize: 12,
                                    }}
                                />
                            ))}
                            {seriesOptions && seriesOptions.map((series) => (
                                <Line
                                    key={series.key}
                                    type="monotone"
                                    dataKey={series.key}
                                    stroke={series.color}
                                    dot={false}
                                    strokeWidth={2}
                                    name={series.label}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>
            </Card.Body>
        </Card>
    );
}

// --------------------------------------------------------------------
// Container component                                                  
// --------------------------------------------------------------------
/**
 * Main ForecastChart component for displaying the 5-day forecast charts.
 * @returns {React.ReactElement} The rendered forecast charts.
 */
export function ForecastChart(): React.ReactElement {
    const [startHour, setStartHour] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    const { forecast } = useStatusCollection();
    const data = useMemo(() => (forecast ? buildChartData(forecast.list) : []), [forecast]);
    const bands = useMemo(() => buildBands(data), [data]);
    const ticks = useMemo(() => buildTicks(data), [data]);

    const charts = ["Wind Speed & Direction", "Temperature Profile", "Humidity Profile", "Pressure Profile", "Cloud Cover"];
    const [selected, setSelected] = useLocalStorageState<string[]>(
        "forecast.selectedSeries",
        charts        // default when user visits the first time
    );
    const toggle = (key: string) =>
        setSelected((prev: any) =>
            prev.includes(key) ? prev.filter((k: string) => k !== key) : [...prev, key]
        );

    const tempOptions = [
        { key: "temp", label: "Temp (°F)", color: "#8884d8" },
        { key: "feels_like", label: "Feels Like (°F)", color: "#00c49f" },
        { key: "temp_min", label: "Temp(min) (°F)", color: "#82ca9d" },
        { key: "temp_max", label: "Temp(max) (°F)", color: "#ff8042" },
    ];


    const humidityOptions = [
        { key: "humidity", label: "Humidity (%)", color: "#ff8042" },
    ];


    const pressureOptions = [
        { key: "pressure", label: "Pressure (hPa)", color: "#ff7300" },
    ];



    const cloudsOptions = [
        { key: "cover", label: "Cloud Cover (%)", color: "#ff7300" },
    ];


    if (error) return <div className="text-danger p-3">Error: {error}</div>;
    if (!forecast) return <div className="p-3">Loading forecast…</div>;

    return (
        <>
            <center><h1>5 Day Forecast</h1></center>
            <div className="d-flex flex-wrap gap-3 mb-3 justify-content-center">
                {charts.map((chart, i) => (
                    <Form.Check
                        key={i}
                        type="checkbox"
                        label={chart}
                        checked={selected.includes(chart)}
                        onChange={() => toggle(chart)}
                    />
                ))}
            </div>

            {selected.includes("Wind Speed & Direction") && <WindChart data={data} bands={bands} ticks={ticks} startHour={startHour} />}
            {selected.includes("Temperature Profile") && <Chart data={data} bands={bands} ticks={ticks} startHour={startHour} seriesOptions={tempOptions} title={"Temperature Profile"} />}
            {selected.includes("Humidity Profile") && <Chart data={data} bands={bands} ticks={ticks} startHour={startHour} seriesOptions={humidityOptions} title={"Humidity Profile"} />}
            {selected.includes("Pressure Profile") && <Chart data={data} bands={bands} ticks={ticks} startHour={startHour} seriesOptions={pressureOptions} title={"Pressure Profile"} />}
            {selected.includes("Cloud CoverCloud Cover") && <Chart data={data} bands={bands} ticks={ticks} startHour={startHour} seriesOptions={cloudsOptions} title={"Cloud Cover"} />}
        </>
    );
}

export default ForecastChart;
