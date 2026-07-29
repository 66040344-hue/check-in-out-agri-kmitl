import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc, updateDoc, query, where, orderBy, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5spzGt60pBijyho2P-JR-wVr9CJRXcng",
  authDomain: "check-in---out-agri-kmitl.firebaseapp.com",
  projectId: "check-in---out-agri-kmitl",
  storageBucket: "check-in---out-agri-kmitl.firebasestorage.app",
  messagingSenderId: "462293060169",
  appId: "1:462293060169:web:934a0298c1e996a7cccd98",
  measurementId: "G-B3N7MD8060"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'kmitl.ac.th'
});

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  getDoc, 
  serverTimestamp
};
