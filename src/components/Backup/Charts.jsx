import React, { useEffect, useState } from "react"
import Row from "react-bootstrap/Row"
import Col from "react-bootstrap/Col"
import { useData } from '../../contexts/DataContext'
import { clone } from "../Globals"
import NVD3Chart from "react-nvd3"
import "nvd3/build/nv.d3.min.css"
// import { format } from 'd3-format';



export default function Charts() {

    const [data, setData] = useState({ speed: [[0, 0]], humidity: [[]], direction: [[]], pressure: [[]], temperature: [[]] })

    const { charts } = useData()


    // link up the data
    useEffect(() => {
        return charts(setData)
    }, [charts])
    useEffect(() => {
        console.log(data)
        // debugger
    }, [data])
    var strokeWidth = 2;

    const wind = [{
        values: data.speed,
        key: 'Gliderport',
        color: '#790098',
        strokeWidth: strokeWidth,
        // disabled: (state.selected & 1) ? false : true
    },
    ];

    const direction = [
        {
            values: data.direction,
            key: 'Gliderport',
            color: '#FF00FF',
            strokeWidth: strokeWidth,
            // disabled: (state.dirsel & 2) ? false : true
        }];

    const temperature = [
        {
            values: data.temperature,
            key: 'Gliderport',
            color: '#FF00FF',
            strokeWidth: strokeWidth,
            // disabled: (state.tempsel & 2) ? false : true
        }];

    const pressure = [{
        values: data.pressure,
        key: 'Gliderport',
        color: '#790098',
        strokeWidth: strokeWidth,
        disabled: false
    }];

    const humidity = [{
        values: data.humidity,
        key: 'Gliderport',
        color: '#790098',
        strokeWidth: strokeWidth,
        disabled: false
    }];

    const tconv = function (d) { //format as date and time
        var dt = new Date(1000 * (d + data.start)); // - (dt.getTimezoneOffset() * 60000));
        return (1 + dt.getMonth()).toString() + "/" + dt.getDate().toString() + ' ' + dt.getHours().toString() + ":" + (dt.getMinutes() < 10 ? "0" : "") + dt.getMinutes().toString();
    }
    var options = {
        chart: {
            type: 'lineChart',
            height: 250,
            margin: {
                top: 20,
                right: 20,
                left: 55,
                bottom: 20
            },
            noData: 'Loading Chart Data...',
            x: function (d) {
                return d.x;
            },
            y: function (d) {
                return d.y;
            },
            interactive: false,

            xAxis: {
                tickFormat: tconv,
                axisLabel: ''
            },
            yAxis: {
                tickFormat: function (d) {
                    return d; //format('d')(d); parseFloat(d).toFixed(2)
                },
                axisLabelDistance: -10
            },
            defined: function (d, i) {
                return !isNaN(d.y) && d.y !== null;
            }
        },
        title: {
            enable: false,
            text: ''
        }
    };

    var optionsTemperature = clone(options);
    var optionsDirection = clone(options);
    var optionsPressure = clone(options);
    var optionsHumidity = clone(options);

    options.chart.yAxis.axisLabel = 'Wind Speed (mph)';
    optionsTemperature.chart.yAxis.axisLabel = "Temp (F)";
    optionsDirection.chart.yAxis.axisLabel = "Wind Direction";
    optionsPressure.chart.yAxis.axisLabel = "Pressure (hPa)";
    optionsHumidity.chart = {
        yAxis: {
            axisLabel: "Relatuve Humidity (%)"
        },
        xAxis: {
            axisLabel: 'Time'
        },
        margin: {
            bottom: 0
        },
    }

    options.title = {
        enable: true,
        text: ''
        //text: '(note: you can select and deselect data sources to the right)'
    };

    var api = {}
    const callbackSpeed = (scope, element) => { api.speed = scope.api }
    const callbackDirection = (scope, element) => { api.direction = scope.api }
    const callbackTemperature = (scope, element) => { api.temperature = scope.api }
    const callbackHumidity = (scope, element) => { api.humidity = scope.api }
    const callbackPressure = (scope, element) => { api.pressure = scope.api }

    // debugger


    function getDatum(j) {
        var sin = [],
            cos = [];

        for (var i = 0; i < 100; i++) {
            sin.push({ x: i, y: Math.sin(i / j) });
            cos.push({ x: i, y: .5 * Math.cos(i / j) });
        }

        return [
            {
                values: sin,
                key: 'Sine Wave',
                color: '#ff7f0e',
                area: false,
            },
            {
                values: cos,
                key: 'Cosine Wave',
                color: '#2ca02c'
            }
        ];
    }
    const md = getDatum(11)


    const callback = function (chart) {
        debugger
        // var bgcodes = ["rgba(136,136,136, 0.1)", "rgba(255,165,0, 0.1)",
        //     "rgba(208,168,136, 0.1)", "rgba(170,255,170, 0.5)",
        //     "rgba(31,190,214, 0.5)", "rgba(177,86,237, 0.5)",
        //     "rgba(255,204,203, 0.1)", "rgba(136,136,136, 0.1)"];
        // var rect_back = document.getElementById("speedChart").getElementsByClassName("nvd3")[0]; //.firstChild;
        // var w;
        // var h;
        // if (rect_back && rect_back.firstChild && rect_back.firstChild.firstChild && $scope.wind[1].values.length) {
        //     rect_back = rect_back.firstChild.firstChild;
        //     var range = $scope.dirmax - $scope.dirmin;
        //     h = rect_back.getAttribute('height');
        //     deltaTime = $scope.wind[1].values[$scope.wind[1].values.length - 1].x - $scope.wind[1].values[0].x;
        //     w = rect_back.getAttribute('width') / deltaTime;
        //     lasti = 0;
        //     lastcode = getCode($scope.wind[1].values[0].y, $scope.dir[1].values[0].y, 0);
        //     i = 0;
        //     while (i < $scope.wind[1].values.length - 1) {
        //         do {
        //             i += 1;
        //             code = getCode($scope.wind[1].values[i].y, $scope.dir[1].values[i].y, 0);
        //             //code=0;
        //         } while ((code == lastcode) && (i < ($scope.wind[1].values.length - 1)));
        //         if (lastcode > 2 && lastcode < 6)
        //             d3.selectAll('#speedChart .nv-groups').append("rect")
        //                 .attr("x", (w * ($scope.wind[1].values[lasti].x - $scope.wind[1].values[0].x)))
        //                 .attr("y", 0)
        //                 .attr("width", (w * ($scope.wind[1].values[i].x - $scope.wind[1].values[lasti].x)))
        //                 .attr("height", h / 8)
        //                 .attr("fill", bgcodes[lastcode]);
        //         lasti = i;
        //         lastcode = code;
        //     }
        // }
    };


    return (
        <Row id="speedPlot" style={{ paddingTop: "15px", border: "1px solid black" }}>
            {/* <p class="blink textred col-sm-12">I am aware the data is dropping... it will take time to debug and fix</p> */}
            <Col
                xs={12}
                lg={12}
                style={{ marginBottom: "20px", border: "1px solid black" }}
            >

                {React.createElement(NVD3Chart, {
                    xAxis: {
                        tickFormat: function (d) { return d; },
                        axisLabel: 'Period'
                    },
                    yAxis: {
                        tickFormat: function (d) { return parseFloat(d).toFixed(2); }
                    },

                    // xDomain: [-10, 12000],
                    type: 'lineChart',
                    datum: wind,
                    // x: (d) => d.x,
                    // y: (d) => d.y,
                    x: (d) => d[0],
                    y: (d) => d[1],
                    width: "100%",
                    height: 400,
                    margin: {
                        left: 100
                    },
                    ready: () => {
                        console.log("here")
                        callback()
                    }
                })}


                <NVD3Chart
                    id="testChart"
                    datum={null}
                    class="with-3d-shadow with-transitions"
                />

                {/* {React.createElement(NVD3Chart, options.chart)} */}
                {/* <NVD3Chart
                    id="speedChart"
                    type="lineChart"
                    options={options}
                    datum={wind}
                    className="with-3d-shadow with-transitions"
                    ready={callbackSpeed}
                    x={(d) => d[0]}
                    y={(d) => d[1]}
                /> */}
                {/* 
                <NVD3Chart
                    id="dirChart"
                    options={optionsDirection}
                    datum={direction}
                    class="with-3d-shadow with-transitions"
                    ready={callbackDirection}
                />

                <NVD3Chart
                    id="tempChart"
                    options={optionsTemperature}
                    datum={temperature}
                    class="with-3d-shadow with-transitions"
                    ready={callbackTemperature}
                />

                <NVD3Chart
                    id="pressureChart"
                    options={optionsPressure}
                    datum={pressure}
                    class="with-3d-shadow with-transitions"
                    ready={callbackPressure}
                />
                <NVD3Chart
                    id="humidityChart"
                    options={optionsHumidity}
                    datum={humidity}
                    class="with-3d-shadow with-transitions"
                    ready={callbackHumidity}
                />
                <NVD3Chart
                    id="wind"
                    type="lineChart"
                    datum={wind}
                    x="label"
                    y="value"
                /> */}
            </Col>
        </Row>

    )
}
