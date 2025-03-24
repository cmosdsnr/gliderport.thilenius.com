import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import { useData } from 'contexts/DataContext'
import StatsPlot from './StatsHitsPlot'

const StatsHitsComponent = () => {
    const { loadData, hitStats, } = useData()

    // link up the visitor data
    useEffect(() => {
        loadData("Stats")
    }, [])

    useEffect(() => {
        console.table(hitStats?.weeks)
    }, [hitStats])

    return (
        <>
            <Row>
                {/* {showTable ? ( */}
                <Col xs={12} className="greyBackground">
                    <h4>Site Statistics:</h4>
                    <center>
                        <table className="stats-table">
                            <tbody>
                                <tr>
                                    <th></th>
                                    <th>all</th>
                                    <th>unique IP's</th>
                                </tr>
                                <tr>
                                    <th>Visits on {hitStats?.day?.day}</th>
                                    <th>{hitStats?.day?.total}</th>
                                    <th>{hitStats?.day?.unique}</th>
                                </tr>
                                <tr>
                                    <th>Visits last week (Fri-Fri):</th>
                                    <th>{hitStats?.week?.total}</th>
                                    <th>{hitStats?.week?.unique}</th>
                                </tr>
                                <tr>
                                    <th>Visits last 30 days:</th>
                                    <th>{hitStats?.month?.total}</th>
                                    <th>{hitStats?.month?.unique}</th>
                                </tr>
                                <tr>
                                    <th>Total visits:</th>
                                    <th>{hitStats?.total?.count}</th>
                                    <th>{hitStats?.total?.unique}</th>
                                </tr>
                                <tr>
                                    <th>Last reset:</th>
                                    <th>{hitStats?.lastReset}</th>
                                </tr>
                            </tbody>
                        </table>
                    </center>
                </Col>
            </Row>
            <Row>
                <Col xs={12} >
                    {hitStats?.weeks ? <StatsPlot data={hitStats.weeks} /> : <></>}
                </Col>
            </Row>
        </>
    )
}
export default StatsHitsComponent;