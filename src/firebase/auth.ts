// /firebase/auth.ts
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, getFirestore, setDoc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./config";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export async function registerUser(email: string, password: string, name: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save to Firestore only once
    await setDoc(doc(db, "users", user.uid), {
      email,
      name,
      createdAt: new Date(),
    });

    return user;
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      throw new Error("This email is already registered. Please log in instead.");
    }
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    if (error.code === "auth/wrong-password") {
      throw new Error("Incorrect password. Please try again.");
    } else if (error.code === "auth/user-not-found") {
      throw new Error("No user found with this email. Please register first.");
    } else if (error.code === "auth/network-request-failed") {
      throw new Error("Network error. Please check your connection.");
    }
    throw error;
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user document exists, if not create it
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        email: user.email,
        name: user.displayName || "User",
        photoURL: user.photoURL || null,
        createdAt: new Date(),
      });
    }

    return user;
  } catch (error: any) {
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in cancelled. Please try again.");
    } else if (error.code === "auth/network-request-failed") {
      throw new Error("Network error. Please check your connection.");
    } else if (error.code === "auth/account-exists-with-different-credential") {
      throw new Error("An account already exists with this email using a different sign-in method.");
    }
    throw error;
  }
}
