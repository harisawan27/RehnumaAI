// src/app/chat/[chatId]/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { auth, db } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams } from 'next/navigation';
import { sendMessageToApi } from '@/lib/firebase/chat';

export default function ChatPage() {
  const params = useParams() as { chatId?: string | string[] | undefined };
  const rawChatId = params?.chatId;
  const chatId: string | null = Array.isArray(rawChatId) ? rawChatId[0] ?? null : rawChatId ?? null;

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('📘 Study Guide'); // ✅ default agent
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Track auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserId(u ? u.uid : null);
    });
    return () => unsub();
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (unsubRef.current) {
      try {
        unsubRef.current();
      } catch {}
      unsubRef.current = null;
    }

    if (!userId || !chatId) {
      setMessages([]);
      return;
    }

    try {
      const messagesRef = collection(db, 'users', userId, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const msgs = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as any;
            return { id: docSnap.id, ...data };
          });
          setMessages(msgs);
        },
        (err) => {
          console.error('Firestore onSnapshot error:', err);
        }
      );

      unsubRef.current = unsubscribe;
    } catch (err) {
      console.error('Subscribe to messages failed:', err);
      setMessages([]);
    }

    return () => {
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {}
        unsubRef.current = null;
      }
    };
  }, [userId, chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !userId || !chatId || sending) return;

    const text = input.trim();
    setInput('');
    setSending(true);

    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() },
    ]);

    try {
      await sendMessageToApi(chatId, text, setMessages, selectedAgent); // ✅ pass agent
    } catch (err) {
      console.error('sendMessageToApi error:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        {!chatId ? (
          <p className="text-gray-500 text-sm text-center mt-10">No chat selected.</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center mt-10">No messages yet. Start chatting!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`p-3 rounded-lg max-w-[75%] break-words ${m.role === 'user' ? 'bg-green-100 ml-auto' : 'bg-white mr-auto border'}`}>
              <div>{m.content}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ✅ Input + Agent Selector */}
      <div className="fixed left-64 right-0 bottom-0 bg-white border-t border-gray-200 p-3 flex items-center gap-3">
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          className="border rounded px-2 py-2 text-sm bg-green-50 text-gray-800"
        >
          <option>📘 Study Guide</option>
          <option>🌙 Ethics Mentor</option>
          <option>🕋 History Scholar</option>
          <option>💼 Career Rehnuma</option>
        </select>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={chatId ? 'Type a message...' : 'Open or create a chat first'}
          disabled={!chatId || !userId || sending}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleSend}
          disabled={!chatId || !userId || sending || !input.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
