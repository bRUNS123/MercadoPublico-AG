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
  console.log("📁 Firebase no configurado. Se usará LocalStorage.");
}

// Interfaz única — abstrae Firestore o LocalStorage.
// roomId es la clave de partición: 'public', 'cat_public', 'desc_public', etc.
// Cada namespace usa un roomId distinto para no colisionar en el mismo doc de Firestore.
export const votesDB = {
  isActive: () => isFirebaseActive,

  subscribeToVotes: (roomId, callback) => {
    if (isFirebaseActive) {
      const roomRef = doc(db, "rooms", roomId);
      return onSnapshot(roomRef, (snap) => callback(snap.exists() ? snap.data() : {}));
    } else {
      const lsKey = `mp_db_${roomId}`;
      // Migración de claves legacy (votes_roomId → mp_db_roomId)
      const legacy = localStorage.getItem(`votes_${roomId}`);
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
    if (isFirebaseActive) {
      await setDoc(doc(db, "rooms", roomId), data, { merge: true });
    } else {
      const lsKey = `mp_db_${roomId}`;
      localStorage.setItem(lsKey, JSON.stringify(data));
      window.dispatchEvent(new StorageEvent('storage', { key: lsKey, newValue: JSON.stringify(data) }));
    }
  }
};
