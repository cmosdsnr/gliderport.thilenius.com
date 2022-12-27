import { useEffect, useState } from "react"
import Row from "react-bootstrap/Row"
import Col from "react-bootstrap/Col"
import { useData } from '../contexts/DataContext'

export default function Contribute() {
    const [donors, setDonors] = useState([])
    const { loadDonors } = useData()

    useEffect(() => {
        loadDonors(setDonors);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    return (
        <div className="selectionBox">
            <Row>
                <p>
                    I have been very pleased to see this site grow in use over the
                    years, and have enjoyed programing and changing it. I very much
                    appreciate any feedback, ideas for improvement, and especially if
                    people let me know when the camera stops working or other issues
                    occur. I don't necessarily look at my own site every day so don't
                    always notice when things break.
                </p>

                <p>
                    If you'd like to make a donation to keep this site up and running,
                    please feel free! (who doesn't like support?!)<br />
                    <a href="https://paypal.me/TuitionPlayment" target="_blank" rel="noreferrer">
                        Paypal
                    </a> or <a href="https://venmo.com/Stephen-Thilenius" target="_blank" rel="noreferrer">Venmo</a> me @Stephen-Thilenius
                </p>

                <p>
                    When you see these folks at the gliderport thank them for their
                    support!! (Also in case you don't want your name on this list let me
                    know){" "}
                </p>
            </Row>

            <Row style={{ fontWeight: "bold" }}>
                {donors.map((donor, i) => {
                    return (
                        <Col key={i} sm={6} md={4} lg={3}>
                            {donor.name}
                        </Col>
                    );
                })}
            </Row>
        </div>
    )
}
