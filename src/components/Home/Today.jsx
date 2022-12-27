import React, { useState, useEffect } from "react"
import { useData } from '../../contexts/DataContext'
import { codes } from '../Globals'

const Today = props => {
    const { ...rest } = props
    const { forecast } = useData()

    return (
        <table className="forecast-table">
            <thead>
                <tr>
                    <th colSpan={2}>Today's Forecast</th>
                </tr>
            </thead>
            <tbody>
                {forecast?.map((hr, i) => {
                    return (
                        <tr key={i}>
                            <td className="forecast-time">
                                {hr[0]}:00
                            </td>
                            <td className="forecast-wind">
                                {hr[1]}
                            </td>
                        </tr>
                    )
                })
                }
            </tbody>
        </table>
    )
}

export default Today