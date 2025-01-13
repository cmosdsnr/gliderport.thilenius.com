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
                <table style={{ width: '100%', border: '1px solid black', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid black', padding: '8px' }}>Client No</th>
                            {clients.length > 0 && Object.keys(clients[0]).map((key, j) => {
                                if (key != "updateClients")
                                    return (<th key={j} style={{ border: '1px solid black', padding: '8px' }}>{key}</th>)
                                else return null;
                            }
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map((client, i) => (
                            <tr key={i}>
                                <td style={{ border: '1px solid black', padding: '8px' }}>{i + 1}</td>
                                {Object.keys(client).map((key, j) => {
                                    if (key != "updateClients")
                                        return (<td key={j} style={{ border: '1px solid black', padding: '8px' }}>{client[key as keyof typeof client]}</td>)
                                    else return null;
                                }
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Diagnostics;
