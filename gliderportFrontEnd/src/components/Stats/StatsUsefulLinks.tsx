import React from 'react'
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';

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
        <Container className="py-4" style={{ maxWidth: '600px' }}>
            <Card className="shadow">
                <Card.Header className="fw-semibold fs-5">Useful Links</Card.Header>
                <ListGroup variant="flush">
                    <ListGroup.Item action href="https://www.windy.com/32.892/-117.240?100m,32.883,-117.240,14,m:ezYacTK" target="_blank" rel="noopener noreferrer">
                        Wind Predictions (location = Torrey Pines)
                    </ListGroup.Item>
                    <ListGroup.Item action href="http://findu.com/cgi-bin/wx.cgi?call=W9IF-4&last=4" target="_blank" rel="noopener noreferrer">
                        Analog gliderport system Weather
                    </ListGroup.Item>
                    <ListGroup.Item action href="https://www.tidesandcurrents.noaa.gov/stationhome.html?id=9410230" target="_blank" rel="noopener noreferrer">
                        NOAA Scripps Pier Weather
                    </ListGroup.Item>
                    <ListGroup.Item action href="https://www.flytorrey.com/" target="_blank" rel="noopener noreferrer">
                        Torrey Pines Gliderport Site
                    </ListGroup.Item>
                </ListGroup>
            </Card>
        </Container>
    )
}

export default StatsUsefulLinksComponent;
