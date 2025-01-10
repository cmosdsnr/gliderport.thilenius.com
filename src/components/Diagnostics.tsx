import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';

const Diagnostics: React.FC = () => {

    const { loadData, clients } = useData();


    useEffect(() => {
        loadData("Clients");
    }, []);

    useEffect(() => {
        console.log("Clients: ", JSON.stringify(clients));
    }, [clients]);

    return (
        <div>
            <h1>Diagnostics</h1>
            {clients.map((client, i) => {
                return (
                    <div key={i}>
                        <p>no {i}</p>
                        {Object.keys(client).map((key, j) => {
                            return (

                                <p>{key}: {client[key]}</p>
                            )
                        })}
                    </div>
                )
            }
            )}
        </div>
    );
}

export default Diagnostics;
