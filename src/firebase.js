import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import dotenv from "dotenv"
import admin from "firebase-admin";
// const { admin } = pkg;
import fs from 'fs'
import { isDirectory } from "./fileOps.js";



// ######################
// New users temporary password is TempPassword123!
// ######################


dotenv.config()

// use dokku config:set --global FIREBASE_API_KEY="AIzaSyDPOOdfatZIzOZe7RT-s_aUnG11sste6xk" FIREBASE_AUTH_DOMAIN="netninja-game-guidez-1d8c2.firebaseapp.com" PROJECT_ID="netninja-game-guidez-1d8c2" STORAGE_BUCKET="netninja-game-guidez-1d8c2.appspot.com" MESSAGE_SENDER_ID="553078821803" APP_ID="1:553078821803:web:28eb58796f56fc4ab8f8ee" MEASUREMENT_ID="G-CM7SJ8PMS0"

const app = initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGE_SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.FIREBASE_API_KEY
})

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app





export const exportFirebase = async () => {
    const logsDir = isDirectory("/app/gliderport/logs") ? "/app/gliderport/logs/" : "./public/logs/";

    const serviceAccount = {
        "type": "service_account",
        "project_id": "netninja-game-guidez-1d8c2",
        "private_key_id": "e0d80d3f7b42463766ae959848cb84f3e8efaa40",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDoJZFffeKmXQhy\nydRNqgdFoXkAZdqMFKU+w7O1nwEn15AG0nwx1yg43k3KzNKpsoAxLZtZ0Hr68MB9\n/9waq+UD4NE0TgzT0nqU+yar+mbMxZY1mQQVmmwA/Vju2pAezpOlgbP787e5g1uv\n3bVHTLd/aro5YNH9AH2r0iDYRtjlvioPasDWi2UHCgHJQYT4t85BtV8GSKUCy0Xy\n4wPuaZmcKbD5ILokdZKTNCn2HqtA+wlM+Mn+HldqTBxMriUJRAIKBXS05CUcKbbO\ncqwvpSNdj8pukq8MGt2QNu8IE+UCyVjjIjZKPDY1t9X0/HsUaW9W7H4evaCxWphy\nXCI4Bga9AgMBAAECggEAQeMbue8IK3B/K9kltO87hiM4rQi7eQOJDOHNeRBKayzu\nt0j5L8oho9ZQXO06IyjC4nJPw7N8nAlFkN1T8ov0AWBG8CHw2RPFb9BCXxBAKgEw\nS0EFHD6KRdOh8JS+z8eQtyozU6CN9gyWsrjpsPVQpUy80vksUDLZ+DC42rls6PNA\nJj/PlH084lqhql4bR/9IAVfy49KVOfIdNyiVtXKu5alZpiq4d42JevgCiCfKZeEC\nRra+0kDQaOX4bVzXvZ6MWP43+BCwcpK48pwtDDAJJxvpOVbBHRsnRaMb7XbTTive\nI4lfsGPlKxg/zGbYSEaUWJGGuxQXEXlUVQQktVqkTwKBgQDwInkIQH67BlkHvPKp\nvUNS1aMCIiF3g0bW4xyVZ7jmB+IKdHRhWX7T1V6DO3m5fIFAHMRlCzXChhxqNzA9\nLmFvpb418+2gc3dc06Hgd9nLOHWONUDqr0nsPpt6uhO+WqQEfe0sblsgYtocltnG\nhs9otLk1Ncg+H/rmf2tgl7pINwKBgQD3e/3CWpFnXFNcLcTp+JfYpsdbmACZYu0+\niUHzQ3yVNpBQsQbJ/YW+MOFWDDTrTarUFej3IF96gS7tZC2vqvVDNlKPE/kF3PIi\n2qSJ18dOmunafShqotpPYqeJkxLvEx+wfgPTVvmYsmZw5y+ua4a1MEc8tSSeLMKi\nNMbE3g2GqwKBgGQqbQQFKxfGYRK6PRqSiOefl5xHMmCQ0NbH619i4ZyKQz6LLxSA\naUfhY8gn4fF+PsfIeB+R2n3mxSmFFckfdKNGpp4IvuFD6NE+sfJY6+86AMct7YM3\nVQWHZAGAZsXrNylsgacb7UUIFuUAA50tFI0ffXX1li5b1qOZGOg0wg5nAoGBAIxa\nHiSN1m5m1sOtFUKXgA4XL3JLdvOGPgO8NdGvEUVSB3ArpS0CgUnGUNTK4WwcxOe4\ncUFNc7h28NUifiJk8ukmMpX//rcLgaqwkqW14Ms8YalOV5B6QRLKYTdNWGyLTOp7\n3NGLPswRSLV49vqU8nVpJs1P8a9etRbmlV9qiwM3AoGBAI5G6zeRLwxifTjWSdqV\nlktKwetuZ309FdDG+Ovu6GPkUgr38ImrjuFXC0wrFAmZwsMx25/0cN/XgoaDodkf\nW59TKRVgtpNWYGDMqIXrpKU8McUOu1BuLXIKSBlYw7iJSAcvkevbZVJyu2khXpDc\nMZZpjVtGtabuvPmu9VNuh7BM\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-w55cp@netninja-game-guidez-1d8c2.iam.gserviceaccount.com",
        "client_id": "100212825094754605108",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-w55cp%40netninja-game-guidez-1d8c2.iam.gserviceaccount.com",
        "universe_domain": "googleapis.com"
    }


    // Initialize the Firebase Admin SDK
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });


    async function exportUsers() {
        const allUsers = [];
        let nextPageToken; // undefined at first

        try {
            // List users in batches of 1000.
            do {
                const result = await admin.auth().listUsers(1000, nextPageToken);
                result.users.forEach((userRecord) => {
                    // Convert user record to a plain object
                    allUsers.push(userRecord.toJSON());
                });
                nextPageToken = result.pageToken;
            } while (nextPageToken);

            // Write the user data to a JSON file, nicely formatted.
            fs.writeFileSync(logsDir + "Mainusers.json", JSON.stringify(allUsers, null, 2));
            console.log(`Exported ${allUsers.length} users to users.json`);
        } catch (error) {
            console.error("Error exporting users:", error);
        }
    }

    exportUsers();


    const db = admin.firestore();

    async function exportAllCollections() {
        try {
            // List all top-level collections
            const collections = await db.listCollections();

            for (const collection of collections) {
                // Get all documents in the collection
                const snapshot = await collection.get();
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    data: doc.data()
                }));

                // Write the documents to a JSON file named after the collection
                const filename = `${collection.id}.json`;
                fs.writeFileSync(logsDir + filename, JSON.stringify(docs, null, 2));
                console.log(`Exported ${docs.length} documents from collection '${collection.id}' to ${filename}`);
            }
        } catch (error) {
            console.error('Error exporting collections:', error);
        }
    }

    exportAllCollections();
}