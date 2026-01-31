// src/lib/firebase/chat.ts
'use client';

import { db, auth, storage } from '@/firebase'; // ✅ Added storage
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // ✅ Added

const streamingMap = new Map<string, { tempId: string; partial: string }>();

export function subscribeToMessages(chatId: string, setMessages: (msgs: any[]) => void) {
  const user = auth.currentUser;
  if (!user || !chatId) return () => {};

  const messagesRef = collection(db, 'users', user.uid, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const streamState = streamingMap.get(chatId);

    if (streamState) {
      const exists = msgs.some((m) => m.id === streamState.tempId);
      if (!exists) {
        msgs.push({
          id: streamState.tempId,
          role: 'assistant',
          content: streamState.partial,
          createdAt: new Date().toISOString(),
          __isTemp: true,
        });
      } else {
        for (let i = 0; i < msgs.length; i++) {
          if (msgs[i].id === streamState.tempId) {
            msgs[i].content = streamState.partial;
            break;
          }
        }
      }
    }

    setMessages(msgs);
  });

  return unsubscribe;
}

// ✅ Helper: fetch recent messages for memory context
async function fetchLastMessages(chatId: string, limitCount = 6) {
  const user = auth.currentUser;
  if (!user || !chatId) return [];

  const messagesRef = collection(db, 'users', user.uid, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);

  // return oldest first
  const msgs = snapshot.docs.map((doc) => doc.data()).reverse();
  return msgs.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
}

// ✅ Helper: Upload file to Firebase Storage
async function uploadFileToStorage(file: File, chatId: string): Promise<{ url: string; name: string; type: string; size: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const storageRef = ref(storage, `users/${user.uid}/chats/${chatId}/files/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return {
    url: downloadURL,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

// ✅ Helper: Convert file to base64 for Gemini API
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ✅ Helper: Extract text from PDF using FileReader
async function extractTextFromPDF(file: File): Promise<string> {
  // For PDFs, we'll read them as text and include a note
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(`[PDF Document: ${file.name} - ${(file.size / 1024).toFixed(2)}KB attached]`);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export async function sendMessageToApi(
  chatId: string,
  userInput: string,
  setMessages: (updater: (prev: any[]) => any[]) => void,
  selectedAgent: string,
  attachedFiles?: File[]
) {
  const user = auth.currentUser;
  if (!user) throw new Error('User not signed in');
  if (!chatId) throw new Error('Chat ID missing');

  const messagesRef = collection(db, 'users', user.uid, 'chats', chatId, 'messages');

  // ✅ Upload files (if any)
  const uploadedFiles = [];
  if (attachedFiles?.length) {
    for (const file of attachedFiles) {
      const fileData = await uploadFileToStorage(file, chatId);
      uploadedFiles.push(fileData);
    }
  }

  // ✅ Add user message
  const msg: any = {
    role: 'user',
    content: userInput,
    createdAt: serverTimestamp(),
  };
  if (uploadedFiles.length) msg.files = uploadedFiles;
  await addDoc(messagesRef, msg);

  // ✅ Prepare streaming placeholder
  const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  streamingMap.set(chatId, { tempId, partial: '' });

  setMessages((prev: any[]) => [
    ...prev,
    {
      id: tempId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      __isTemp: true,
    },
  ]);

  // ✅ Context for continuity
  const contextMessages = await fetchLastMessages(chatId);
  const contextString = contextMessages.join('\n');

  // ✅ Prompts by agent
  const agentPrompts: Record<string, string> = {
    '📘 Study Guide':
      "You are Rehnuma AI by Muhammad Haris Awan, a patient study guide helping students learn clearly.",
    '🌙 Ethics Mentor':
      "You are Rehnuma AI by Muhammad Haris Awan, a moral mentor teaching ethics from Islamic and Pakistani culture.",
    '💬 Life Coach':
      "You are Rehnuma AI by Muhammad Haris Awan, a practical life coach for focus and discipline.",
    '🕋 History Scholar':
      "You are Rehnuma AI by Muhammad Haris Awan, a historian explaining Islamic and Pakistani history vividly.",
    '💼 Career Rehnuma':
      "You are Rehnuma AI by Muhammad Haris Awan, a mentor guiding realistic career and mindset growth.",
  };
  const systemPrompt =
    agentPrompts[selectedAgent] ||
    "You are Rehnuma AI created by Muhammad Haris Awan — a polite, accurate educational assistant.";

  // ✅ Prepare files for API
  const filesForApi = [];
  let fileDescriptions = '';
  if (attachedFiles?.length) {
    for (const f of attachedFiles) {
      const base64 = await fileToBase64(f);
      filesForApi.push({ mimeType: f.type, data: base64 });
      fileDescriptions += `\n\n[Attached file: ${f.name}]`;
    }
  }

  // ✅ Stream from API
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `${userInput}${fileDescriptions}\n\nContext:\n${contextString}`,
      instructions: `${systemPrompt} Analyze attachments if any before responding.`,
      files: filesForApi.length ? filesForApi : undefined,
    }),
  });

  if (!res.body) {
    streamingMap.delete(chatId);
    return chatId;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.replace(/^data: /, '').trim();
        if (data === '[DONE]') continue;

        let txt = '';
        try {
          const parsed = JSON.parse(data);
          txt = parsed.text ?? parsed.content ?? '';
        } catch {
          txt = data;
        }

        if (txt) {
          full += txt;
          const entry = streamingMap.get(chatId);
          if (entry) {
            entry.partial = full;
            streamingMap.set(chatId, entry);
          }
          setMessages((prev: any[]) =>
            prev.map((m) => (m.id === tempId ? { ...m, content: full } : m))
          );
        }
      }
    }
  } catch (err) {
    console.error('Streaming error:', err);
  }

  if (full.trim()) {
    await addDoc(messagesRef, {
      role: 'assistant',
      content: full,
      createdAt: serverTimestamp(),
    });
  }

  streamingMap.delete(chatId);
  return chatId;
}
