'use client';

import { auth, db } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// ✅ Register a new user
export async function registerUser(email: string, password: string, name: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      name,
      email,
      createdAt: serverTimestamp(),
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// ✅ Log in an existing user
export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    // If the user exists in Auth but not in Firestore → create it
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        name: user.displayName || 'Anonymous',
        email: user.email || '',
        createdAt: serverTimestamp(),
      });
    }

    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
