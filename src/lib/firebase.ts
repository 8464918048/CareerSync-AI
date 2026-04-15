import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Firestore Helpers
export const saveUserToFirestore = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      isProfileComplete: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
  } else {
    await setDoc(userRef, {
      lastLogin: serverTimestamp()
    }, { merge: true });
  }
};

export const getUserProfile = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

export const updateUserProfile = async (userId: string, data: any) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    ...data,
    lastUpdated: serverTimestamp()
  }, { merge: true });
};

export const saveAnalysisToHistory = async (userId: string, data: any) => {
  const historyRef = collection(db, 'users', userId, 'history');
  return await addDoc(historyRef, {
    ...data,
    userId,
    timestamp: serverTimestamp()
  });
};

export const getHistory = (userId: string, callback: (data: any[]) => void) => {
  const historyRef = collection(db, 'users', userId, 'history');
  const q = query(historyRef, orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(history);
  }, (error) => {
    console.error("Error fetching history:", error);
  });
};
