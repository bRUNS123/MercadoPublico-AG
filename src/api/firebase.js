import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let db = null;
let isFirebaseActive = false;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'tu-api-key') {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log("🔥 Firebase inicializado correctamente.");
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
  }
} else {
  console.log("📁 Firebase no configurado. Se usará LocalStorage para los favoritos.");
}

// Factory: crea una instancia de DB para un namespace (ej: 'votes', 'desc', 'cat')
export function createRoomDB(prefix) {
  return {
    isActive: () => isFirebaseActive,

    subscribeToVotes: (roomId, callback) => {
      const key = `${prefix}_${roomId}`;
      const lsKey = `ls_${key}`;
      if (isFirebaseActive) {
        const roomRef = doc(db, "rooms", key);
        return onSnapshot(roomRef, (snap) => callback(snap.exists() ? snap.data() : {}));
      } else {
        // Migración: si existe la clave legacy (votes_roomId) y no la nueva, moverla
        const legacy = localStorage.getItem(key);
        if (legacy && !localStorage.getItem(lsKey)) {
          localStorage.setItem(lsKey, legacy);
        }
        const localData = JSON.parse(localStorage.getItem(lsKey) || '{}');
        callback(localData);
        const handleStorage = (e) => {
          if (e.key === lsKey) callback(JSON.parse(e.newValue || '{}'));
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
      }
    },

    setVotes: async (roomId, data) => {
      const key = `${prefix}_${roomId}`;
      const lsKey = `ls_${key}`;
      if (isFirebaseActive) {
        await setDoc(doc(db, "rooms", key), data, { merge: true });
      } else {
        localStorage.setItem(lsKey, JSON.stringify(data));
        window.dispatchEvent(new StorageEvent('storage', { key: lsKey, newValue: JSON.stringify(data) }));
      }
    }
  };
}

export const votesDB = createRoomDB('votes');
