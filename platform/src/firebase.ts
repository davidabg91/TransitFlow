import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

// TransitFlow platform project (europe-west3). These values are public by
// design — they identify the project, they do not grant access. Access is
// controlled by Firestore/Storage rules and the tenant claim on the auth token.
const firebaseConfig = {
  apiKey: "AIzaSyDNTbG7gTCRNGP9_fF4Rohl7vR83mKL5ug",
  authDomain: "pokanipro.firebaseapp.com",
  projectId: "pokanipro",
  storageBucket: "pokanipro.firebasestorage.app",
  messagingSenderId: "1043317640536",
  appId: "1:1043317640536:web:9f73bcb50ff3503e4e692d",
  measurementId: "G-FNJN48QFKS"
};

const app = initializeApp(firebaseConfig);
// Where the signed-in account is kept, said out loud rather than left to the
// default. A terminal on a bus signs in once, with a code somebody types in by
// hand; if that were ever to land in memory only, switching the device off would
// throw it out of the system and the driver could not work until an
// administrator was found. IndexedDB survives a restart in the Android WebView;
// localStorage is the fallback for anything that has no IndexedDB.
export const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

import { persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
// Enabling persistence for INSTANT sub-second loading on myPOS terminals
// Using multipleTabManager to avoid lock contention during reloads/updates
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const storage = getStorage(app);

let messagingInstance: Messaging | null = null;
export const getSafeMessaging = async (): Promise<Messaging | null> => {
    if (messagingInstance) return messagingInstance;
    if (typeof window !== 'undefined' && await isSupported()) {
        messagingInstance = getMessaging(app);
        return messagingInstance;
    }
    return null;
};

export default app;
