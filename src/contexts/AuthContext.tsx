'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
        return;
      }
      setUserProfile(null);
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        throw new Error(
          'Firestore rechazo leer el perfil de usuario. Revisa las reglas para permitir read/write en users/{uid} al usuario autenticado.'
        );
      }
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await fetchUserProfile(firebaseUser.uid);
        } catch (error) {
          console.error(error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(newUser, { displayName: name });
    const userDoc: UserProfile = {
      uid: newUser.uid,
      email: newUser.email || email,
      name,
      businesses: [],
    };
    try {
      await setDoc(doc(db, 'users', newUser.uid), userDoc);
    } catch (error) {
      await deleteUser(newUser).catch(() => undefined);
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        throw new Error(
          'Firestore no permite crear users/{uid}. Ajusta las reglas para permitir write del propio usuario y vuelve a registrarte.'
        );
      }
      throw error;
    }
    setUserProfile(userDoc);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user: googleUser } = await signInWithPopup(auth, provider);
    const docRef = doc(db, 'users', googleUser.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const userDoc: UserProfile = {
        uid: googleUser.uid,
        email: googleUser.email || '',
        name: googleUser.displayName || '',
        businesses: [],
      };
      try {
        await setDoc(docRef, userDoc);
      } catch (error) {
        if (error instanceof FirebaseError && error.code === 'permission-denied') {
          throw new Error(
            'Firestore no permite crear users/{uid} para Google Sign-In. Ajusta reglas de Firestore y reintenta.'
          );
        }
        throw error;
      }
      setUserProfile(userDoc);
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signIn, signUp, signInWithGoogle, logOut, refreshUserProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
