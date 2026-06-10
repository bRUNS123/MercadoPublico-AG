import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, doc, onSnapshot, setDoc, deleteField } from "firebase/firestore";

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
    // persistentLocalCache: guarda en IndexedDB — sobrevive recargas de página
    db = initializeFirestore(app, {
      localCache: persistentLocalCache()
    });
    isFirebaseActive = true;
    console.log("🔥 Firebase inicializado con persistencia offline.");
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
  }
} else {
  console.log("📁 Firebase no configurado. Se usará LocalStorage.");
}

// Convierte recursivamente undefined → null para que Firestore no rechace el write
function sanitize(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, sanitize(v)])
  );
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

  // Escribe solo el delta { [key]: value } — usa merge para no pisar otras claves
  setVotes: async (roomId, data) => {
    if (isFirebaseActive) {
      await setDoc(doc(db, "rooms", roomId), sanitize(data), { merge: true });
    } else {
      const lsKey = `mp_db_${roomId}`;
      const existing = JSON.parse(localStorage.getItem(lsKey) || '{}');
      const merged = { ...existing, ...data };
      localStorage.setItem(lsKey, JSON.stringify(merged));
      window.dispatchEvent(new StorageEvent('storage', { key: lsKey, newValue: JSON.stringify(merged) }));
    }
  },

  // Reemplaza el documento completo — usar cuando hay borrados (favoritos, descartados)
  replaceVotes: async (roomId, data) => {
    if (isFirebaseActive) {
      await setDoc(doc(db, "rooms", roomId), sanitize(data));
    } else {
      const lsKey = `mp_db_${roomId}`;
      localStorage.setItem(lsKey, JSON.stringify(data));
      window.dispatchEvent(new StorageEvent('storage', { key: lsKey, newValue: JSON.stringify(data) }));
    }
  },

  // Elimina una clave del documento
  deleteVoteKey: async (roomId, key) => {
    if (isFirebaseActive) {
      await setDoc(doc(db, "rooms", roomId), { [key]: deleteField() }, { merge: true });
    } else {
      const lsKey = `mp_db_${roomId}`;
      const existing = JSON.parse(localStorage.getItem(lsKey) || '{}');
      delete existing[key];
      localStorage.setItem(lsKey, JSON.stringify(existing));
      window.dispatchEvent(new StorageEvent('storage', { key: lsKey, newValue: JSON.stringify(existing) }));
    }
  }
};
