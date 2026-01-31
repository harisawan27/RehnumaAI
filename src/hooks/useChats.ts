import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export function useChats() {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChats(chatData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { chats, loading };
}
