/**
 * @packageDocumentation
 * Diagnostics page for the Gliderport application.
 * Displays client diagnostic information and logs client data from the DataContext.
 */
import React, { useEffect } from 'react';
import { useData } from 'contexts/DataContext';

/**
 * Diagnostics component displays client diagnostic information.
 * Fetches and logs client data from the DataContext.
 * @returns {React.ReactElement} The rendered diagnostics component.
 */
export function Diagnostics(): React.ReactElement {
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
                        <p>no {i}</p>
                        <p>{JSON.stringify(client)}</p>
                        {Object.keys(client).map((key, j) => {
                            return (
                                <p key={j}>{key}: {client[key as keyof typeof client]}</p>
                            )
                        })}
                    </div>
                )
            })}
        </div>
    );
}

export default Diagnostics;
