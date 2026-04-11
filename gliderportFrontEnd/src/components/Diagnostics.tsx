/**
 * @packageDocumentation
 * Diagnostics page for the Gliderport application.
 * Displays client diagnostic information and logs client data from the DataContext.
 */
import React, { useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import { useSocialData } from '@/contexts/SocialDataContext';

/**
 * Diagnostics component displays client diagnostic information.
 * Fetches and logs client data from the DataContext.
 * @returns {React.ReactElement} The rendered diagnostics component.
 */
export function Diagnostics(): React.ReactElement {
    const { loadData, clients } = useSocialData();

    useEffect(() => {
        loadData("Clients");
    }, []);

    useEffect(() => {
        console.log("Clients in diagnostics: ", JSON.stringify(clients));
    }, [clients]);

    return (
        <Container className="py-4">
            <Card className="shadow-sm">
                <Card.Header>Diagnostics</Card.Header>
                <Card.Body>
                    {clients.map((client, i) => (
                        <Card key={i} className="mb-3 shadow-sm">
                            <Card.Header>Client {i}</Card.Header>
                            <Card.Body>
                                <Table size="sm" bordered className="mb-0">
                                    <tbody>
                                        {Object.keys(client).map((key, j) => (
                                            <tr key={j}>
                                                <td className="fw-semibold text-nowrap" style={{ width: '30%' }}>{key}</td>
                                                <td>{String(client[key as keyof typeof client])}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    ))}
                </Card.Body>
            </Card>
        </Container>
    );
}

export default Diagnostics;
