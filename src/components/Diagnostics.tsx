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
        <div>
            <h1>Diagnostics</h1>
            {clients.map((client, i) => {
                return (
                    <div key={i}>
                        <h2>Client {i + 1}</h2>
                        <table>
                            <tbody>
                                {Object.keys(client).map((key, j) => {
                                    return (
                                        <tr key={j}>
                                            <td>{key}</td>
                                            <td>{client[key as keyof typeof client]}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            })}
        </div>
    );
}

export default Diagnostics;
