import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGE_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_API_KEY

    // apiKey: "AIzaSyDPOOdfatZIzOZe7RT-s_aUnG11sste6xk",
    // authDomain: "netninja-game-guidez-1d8c2.firebaseapp.com",
    // projectId: "netninja-game-guidez-1d8c2",
    // storageBucket: "netninja-game-guidez-1d8c2.appspot.com",
    // messagingSenderId: "553078821803",
    // appId: "1:553078821803:web:28eb58796f56fc4ab8f8ee",
    // measurementId: "G-CM7SJ8PMS0"
})

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app