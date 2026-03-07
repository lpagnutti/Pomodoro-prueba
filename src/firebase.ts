import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app: any;
let dbInstance: any;
let authInstance: any;

function init() {
  if (app) return;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey || apiKey === 'dummy') return;

  const firebaseConfig = {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  app = initializeApp(firebaseConfig);
  dbInstance = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID);
  authInstance = getAuth(app);
}

export const getDb = () => {
  init();
  if (!dbInstance) throw new Error("Firebase not initialized. Check your environment variables.");
  return dbInstance;
};

export const getAuthInstance = () => {
  init();
  if (!authInstance) throw new Error("Firebase not initialized. Check your environment variables.");
  return authInstance;
};

export const db = new Proxy({}, {
  get: (target, prop, receiver) => {
    init();
    if (!dbInstance) throw new Error("Firebase not initialized. Check your environment variables.");
    return Reflect.get(dbInstance, prop, receiver);
  }
});

export const auth = new Proxy({}, {
  get: (target, prop, receiver) => {
    init();
    if (!authInstance) throw new Error("Firebase not initialized. Check your environment variables.");
    return Reflect.get(authInstance, prop, receiver);
  }
});
