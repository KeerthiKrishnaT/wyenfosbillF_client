import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB4fWFiG-XH7zUDS6Od4EtceQU787p3ryU",
  authDomain: "wyenfosbills.firebaseapp.com",
  projectId: "wyenfosbills",
  storageBucket: "wyenfosbills.firebasestorage.app",
  messagingSenderId: "615596991593",
  appId: "1:615596991593:web:f4c77bdd0f3eccd8812ef8",
  measurementId: "G-5QQWG5QH9K"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);
export const messaging = getMessaging(app);

const useEmulators = process.env.REACT_APP_USE_EMULATORS === 'true';
if (useEmulators) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectFunctionsEmulator(functions, "localhost", 5000);
  } catch (error) {

  }
}


(async () => {
  try {
    await auth.setPersistence(browserLocalPersistence);
  } catch (error) {
    console.error("Error setting auth persistence:", error);
  }
})();

// Messaging setup
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
      });
      return token;
    }
  } catch (error) {
    console.error("Error getting notification permission:", error);
  }
  return null;
};

// Handle foreground messages
onMessage(messaging, (payload) => {
  
  // Handle foreground messages here
});

export default app;