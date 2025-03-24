import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import { useData } from 'contexts/DataContext';
import "css/forecast.css";

interface ForecastData {
    [key: string]: any;
}

interface Description {
    [key: string]: string;
}

export default function Forecast() {
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<any[][]>([[]]);
    const [show, setShow] = useState<boolean>(false);

    const { loadData, forecastFull } = useData();

    useEffect(() => {
        console.log(show);
    }, [show]);

    useEffect(() => {
        loadData("ForecastFull");
    }, []);

    useEffect(() => {
        console.log(forecastFull);
        if (forecastFull?.length > 0) {
            let keysList: ForecastData = {};
            forecastFull.forEach((v: ForecastData) => {
                keysList = { ...keysList, ...v };
            });
            let keys = Object.keys(keysList);

            let hr: any[] = [];
            let hrs: any[][] = [];
            forecastFull.forEach((v: ForecastData) => {
                keys.forEach((w: string) => {
                    if (v[w] != null) {
                        if (v[w]['1h'] != null)
                            hr.push(v[w]['1h']);
                        else if (w === 'dt') {
                            const dt = new Date(1000 * v[w]);
                            hr.push(dt.toLocaleString().replace(/\/[0-9]*,/, "").replace(":00:00", ""));
                        } else if (w === "temp" || w === "feels_like" || w === "dew_point") {
                            hr.push(parseInt(v[w]));
                        }
                        else if (w === "weather_icon") {
                            hr.push(<img src={`http://openweathermap.org/img/wn/${v[w]}@2x.png`} alt="Weather icon" />);
                        }
                        else
                            hr.push(v[w]);
                    }
                    else hr.push("");
                });
                hrs.push(hr);
                hr = [];
            });
            setRows(hrs);
            keys.forEach((v, i) => {
                keys[i] = v.replace(/_/g, " ");
                if (v === "uvi") keys[i] = "UV Index";
                if (v === "visibility") keys[i] = "Visibility (m)";
                if (v === "clouds") keys[i] = "Cloudyness %";
            });
            setHeaders(keys);
        }
    }, [forecastFull]);

    const description: Description = {
        dt: "Time of the forecasted data, Unix, UTC",
        temp: "Temperature. Fahrenheit",
        'feels like': "Temperature. This accounts for the human perception of weather. Fahrenheit.",
        pressure: "Atmospheric pressure on the sea level, hPa",
        humidity: "Humidity, %",
        'dew point': "Atmospheric temperature (varying according to pressure and humidity) below which water droplets begin to condense and dew can form. Fahrenheit.",
        'visibility (m)': "Average visibility, metres. The maximum value of the visibility is 10km",
        'wind speed': "Wind speed. Units miles/hour",
        'wind gust': "(where available) Wind gust. Units – default: metre/sec, metric: metre/sec, imperial: miles/hour. How to change units used",
        'wind deg': "Wind direction, degrees (meteorological)",
        'pop': "Probability of precipitation. The values of the parameter vary between 0 and 1, where 0 is equal to 0%, 1 is equal to 100%",
        rain: "(where available) Rain volume for last hour, mm",
        'weather id': "Weather = condition id",
        'weather main': "Group of weather parameters (Rain, Snow, Extreme etc.)",
        'weather description': "Weather condition within the group (full list of weather conditions). Get the output in your language",
        'weather icon': "Weather icon"
    };

    return (
        <>
            <h1><center>Forecast Data for the next 48 hrs</center></h1>
            <Row><Col xs={2}>
                <button
                    className="key"
                    onMouseEnter={() => setShow(true)}
                    onMouseLeave={() => setShow(false)}
                >Key</button></Col>
                {show ? <Col xs={10} md={7} lg={5}>
                    <table>
                        <tbody>
                            {headers.map((d, i) => {
                                return (
                                    <tr key={i}>
                                        <td >{d}</td>
                                        <td >{description[d]}</td>
                                    </tr>
                                )
                            })}

                        </tbody>
                    </table>

                </Col>
                    : <></>}
            </Row>
            <table>
                <tbody>
                    <tr style={{ height: "40px" }}>
                        {headers.map((d, i) => {
                            return (<th key={i}>{d}</th>)
                        })}
                    </tr>

                    {rows.map((row, i) => {
                        return (<tr key={i}>
                            {Array.isArray(row) ? row.map((w, j) => {
                                return (<td key={j}>{w}</td>)
                            }) : <></>}
                        </tr>)
                    })}
                </tbody>
            </table>
        </>
    )
}

interface TooltipProps {
    children: React.ReactNode;
    text: string;
    [key: string]: any;
}

export function Tooltip({ children, text, ...rest }: TooltipProps) {
    const [show, setShow] = React.useState<boolean>(false);

    return (
        <div>
            {show ? <div className="tooltipz" >
                {text}
                <span className="tooltip-arrowz" />
            </div> : <></>}
            <div
                {...rest}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                {children}
            </div>
        </div>
    );
}
