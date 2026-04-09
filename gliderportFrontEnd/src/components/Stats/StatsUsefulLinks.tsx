import React from 'react'
import { Row } from 'react-bootstrap';

export interface StatsUsefulLinksProps {
    // define your props here if you have any
}

/**
 * StatsUsefulLinksComponent displays a list of useful external links.
 * @param props - Component props (currently unused).
 * @returns {React.ReactElement} The rendered useful links section.
 */
export function StatsUsefulLinksComponent(props: StatsUsefulLinksProps): React.ReactElement {
    return (
        <Row className="blueBorder">
            <h4>Some useful links:</h4>
            <ul style={{ fontSize: '23px' }}>
                <li><a href="https://www.windy.com/32.892/-117.240?100m,32.883,-117.240,14,m:ezYacTK">Wind Predictions (location = Torrey Pines)</a></li>
                <li><a href="http://findu.com/cgi-bin/wx.cgi?call=W9IF-4&last=4">Analog gliderport system Weather</a>
                </li>
                <li><a href="https://www.tidesandcurrents.noaa.gov/stationhome.html?id=9410230">NOAA Scripps Pier
                    Weather</a></li>
                <li><a href="https://www.flytorrey.com/">Torrey Pines Gliderport Site</a></li>
            </ul>
        </Row>
    )
}

export default StatsUsefulLinksComponent;