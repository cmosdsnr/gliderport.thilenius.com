import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import dotenv from "dotenv"
dotenv.config()
console.log("TEST: " + process.env.FIREBASE_API_KEY)
// const app = initializeApp({
//     apiKey: process.env.FIREBASE_API_KEY,
//     authDomain: process.env.FIREBASE_AUTH_DOMAIN,
//     projectId: process.env.PROJECT_ID,
//     storageBucket: process.env.STORAGE_BUCKET,
//     messagingSenderId: process.env.MESSAGE_SENDER_ID,
//     appId: process.env.APP_ID,
//     measurementId: process.env.FIREBASE_API_KEY
// })
const app = initializeApp({
    apiKey: "AIzaSyDPOOdfatZIzOZe7RT-s_aUnG11sste6xk",
    authDomain: "netninja-game-guidez-1d8c2.firebaseapp.com",
    projectId: "netninja-game-guidez-1d8c2",
    storageBucket: "netninja-game-guidez-1d8c2.appspot.com",
    messagingSenderId: "553078821803",
    appId: "1:553078821803:web:28eb58796f56fc4ab8f8ee",
    measurementId: "G-CM7SJ8PMS0"
})

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app 