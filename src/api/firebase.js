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

// Interfaz que abstrae si estamos usando Firestore o LocalStorage
export const votesDB = {
  isActive: () => isFirebaseActive,

  subscribeToVotes: (roomId, callback) => {
    if (isFirebaseActive) {
      const roomRef = doc(db, "rooms", roomId);
      return onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        } else {
          callback({});
        }
      });
    } else {
      // LocalStorage mock
      const localData = JSON.parse(localStorage.getItem(`votes_${roomId}`) || '{}');
      callback(localData);
      
      // Simulador de realtime usando evento storage (para otras pestañas)
      const handleStorage = (e) => {
        if (e.key === `votes_${roomId}`) {
          callback(JSON.parse(e.newValue || '{}'));
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  },

  setVotes: async (roomId, data) => {
    if (isFirebaseActive) {
      const roomRef = doc(db, "rooms", roomId);
      await setDoc(roomRef, data, { merge: true });
    } else {
      // LocalStorage mock
      localStorage.setItem(`votes_${roomId}`, JSON.stringify(data));
      // Dispatch custom event to update same tab
      window.dispatchEvent(new StorageEvent('storage', {
        key: `votes_${roomId}`,
        newValue: JSON.stringify(data)
      }));
    }
  }
};
