import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';

const Diagnostics: React.FC = () => {

    const { loadData, clients } = useData();

    useEffect(() => {
        loadData("Clients");
    }, []);

    useEffect(() => {
        console.log("Clients in diagnostics: ", JSON.stringify(clients));
    }, [clients]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '70%' }}>
                <h1>Diagnostics</h1>
                {clients.map((client, i) => {
                    return (
                        <div key={i}>
                            <h5 style={{ textAlign: 'center' }}>Client {i + 1}</h5>
                            <table style={{ width: '100%', border: '3px solid black', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {Object.keys(client).map((key, j) => {
                                        return (
                                            <tr key={j}>
                                                <td style={{ border: '1px solid black', padding: '8px' }}>{key}</td>
                                                <td style={{ border: '1px solid black', padding: '8px' }}>{client[key as keyof typeof client]}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

export default Diagnostics;
