// /firebase/auth.ts
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getFirestore, setDoc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./config"; // or wherever your config is

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
