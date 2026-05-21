// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBBx5ZJqt6Zfpo3y-3DeVd99Bqio4T6ScA",
    authDomain: "laftel-5fafa.firebaseapp.com",
    projectId: "laftel-5fafa",
    storageBucket: "laftel-5fafa.firebasestorage.app",
    messagingSenderId: "940672283842",
    appId: "1:940672283842:web:3e7fa95e996bf1f9d4b75b",
    measurementId: "G-V2NVPG76W6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();