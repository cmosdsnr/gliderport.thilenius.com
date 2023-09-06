import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import dotenv from "dotenv"
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