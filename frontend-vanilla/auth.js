import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

let currentUser = null;

export function initAuth(onAuthChangeCallback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'ผู้ใช้งาน',
      };
    } else {
      currentUser = null;
    }
    if (onAuthChangeCallback) {
      onAuthChangeCallback(currentUser);
    }
  });
}

export function getCurrentUser() {
  return currentUser;
}

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const email = result.user.email;
    
    if (email && !email.endsWith('@kmitl.ac.th')) {
      await auth.signOut();
      throw new Error('กรุณาใช้อีเมลของสถาบัน (@kmitl.ac.th) ในการเข้าสู่ระบบเท่านั้น');
    }
    return result.user;
  } catch (error) {
    console.error('Auth error', error);
    throw error;
  }
}

export async function logoutUser() {
  return signOut(auth);
}
