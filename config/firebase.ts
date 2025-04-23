// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSQjXgdCFfqZwimPp4DtuoHtesDkwuhyg",
  authDomain: "expense-tracker-app-dfdb1.firebaseapp.com",
  projectId: "expense-tracker-app-dfdb1",
  storageBucket: "expense-tracker-app-dfdb1.firebasestorage.app",
  messagingSenderId: "217224990189",
  appId: "1:217224990189:web:765dd19d9362fb88d72be4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// auth
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// db
export const firestore = getFirestore(app);
