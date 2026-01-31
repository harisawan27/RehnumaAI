// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { subscribeToMessages, sendMessageToApi } from '@/lib/firebase/chat';
import { db, auth } from '@/firebase';
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  addDoc,
} from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Menu, Copy, Trash2, Check, X, Sparkles, ChevronDown, Paperclip, FileText, Image as ImageIcon, File, XCircle, Camera, CheckCheck, Clock } from 'lucide-react';

// Typing Indicator Component
function TypingIndicator() {
  return (
    <div className="flex gap-3 sm:gap-4 justify-start">
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20"
      >
        <Sparkles className="text-white" size={16} />
      </motion.div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md shadow-md shadow-slate-200/50 px-5 py-4">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-2 h-2 bg-emerald-500 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-emerald-500 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-emerald-500 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
          <span className="ml-2 text-sm text-slate-500">RehnumaAI is thinking...</span>
        </div>
      </div>
    </div>
  );
}

// Code Block with Copy Button
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const handleCopy = () => {
    const code = codeRef.current?.textContent || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract language from className (e.g., "language-javascript")
  const language = className?.replace('language-', '') || '';

  return (
    <div className="relative group my-3">
      {/* Language badge & copy button */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-slate-800 rounded-t-xl border-b border-slate-700">
        <span className="text-xs text-slate-400 font-medium uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
        >
          {copied ? (
            <>
              <Check size={12} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-xl pt-12 pb-4 px-4 overflow-x-auto text-sm">
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </pre>
    </div>
  );
}

// Inline Code
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-slate-100 text-emerald-700 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  );
}

// Format timestamp
function formatTime(timestamp: any): string {
  if (!timestamp) return '';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // If less than 24 hours, show time
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  // If less than 7 days, show day name
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  // Otherwise show date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}


export default function DashboardPage() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; show: boolean }>({ id: '', show: false });
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('Study Guide');
  const [chatCreated, setChatCreated] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);


  // subscribe to Firestore messages
  useEffect(() => {
    if (!currentChatId) {
      if (!isCreatingChat) setMessages([]);
      return;
    }
    const unsubscribe = subscribeToMessages(currentChatId, setMessages);
    return () => unsubscribe();
  }, [currentChatId, isCreatingChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const maxSize = 10 * 1024 * 1024;

      if (!validTypes.includes(file.type)) {
        alert(`File type not supported: ${file.name}`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`File too large (max 10MB): ${file.name}`);
        return false;
      }
      return true;
    });

    setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Photo too large (max 10MB): ${file.name}`);
        return false;
      }
      return true;
    });

    setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Open camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setShowCameraModal(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        alert('Camera access denied.');
      } else {
        cameraInputRef.current?.click();
      }
    }
  };

  const closeCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    setCameraStream(null);
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = Object.assign(blob, { name: `camera-${Date.now()}.jpg`, lastModified: Date.now() }) as File;
            setAttachedFiles((prev) => [...prev, file].slice(0, 5));
            closeCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach(track => track.stop()); };
  }, [cameraStream]);

  const removeFile = (index: number) => setAttachedFiles((prev) => prev.filter((_, i) => i !== index));

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon size={16} />;
    if (type === 'application/pdf') return <FileText size={16} />;
    return <File size={16} />;
  };

  // Handle send message
  async function handleSend() {
    if ((!message.trim() && attachedFiles.length === 0) || sending) return;

    const userInput = message.trim() || '[Attached files]';
    const filesToSend = [...attachedFiles];
    setMessage('');
    setAttachedFiles([]);
    setSending(true);
    setIsTyping(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please log in first');
        setSending(false);
        setIsTyping(false);
        return;
      }

      let chatId = currentChatId;
      let newChatRef = null;

      if (!chatId || chatId.startsWith('temp-')) {
        newChatRef = await addDoc(collection(db, `users/${user.uid}/chats`), {
          title: userInput.slice(0, 30) + (userInput.length > 30 ? '...' : ''),
          createdAt: serverTimestamp(),
        });
        chatId = newChatRef.id;
      }

      // Show user message immediately
      const tempMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userInput,
        createdAt: new Date().toISOString(),
        status: 'sent',
      };
      setMessages((prev) => [...prev, tempMsg]);

      // Send to API
      await sendMessageToApi(
        chatId,
        userInput,
        setMessages,
        selectedAgent,
        filesToSend.length > 0 ? filesToSend : undefined
      );

      if (newChatRef) {
        setCurrentChatId(chatId);
        setChatCreated(true);
      }
    } catch (err) {
      console.error('sendMessageToApi error:', err);
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  }

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText('Copied!');
    setTimeout(() => setCopiedText(null), 1500);
  }, []);

  const handleSaveEdit = async (id: string) => {
    const user = auth.currentUser;
    if (!user || !currentChatId) return alert('Not logged in or no chat selected.');

    const editedMsg = messages.find((m) => m.id === id);
    if (!editedMsg) return;

    const updatedText = editContent.trim();
    if (!updatedText) return alert('Message cannot be empty.');

    try {
      const userMsgIndex = messages.findIndex((m) => m.id === id);
      const nextMsg = messages[userMsgIndex + 1];
      const aiMsgId = nextMsg?.id;

      const msgRef = doc(db, 'users', user.uid, 'chats', currentChatId, 'messages', id);
      const aiMsgRef = aiMsgId && doc(db, 'users', user.uid, 'chats', currentChatId, 'messages', aiMsgId);

      if (aiMsgRef && nextMsg.role === 'assistant') await deleteDoc(aiMsgRef);

      await setDoc(msgRef, {
        ...editedMsg,
        content: updatedText,
        role: 'user',
        createdAt: editedMsg.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: updatedText } : m.id === aiMsgId ? { ...m, content: 'Regenerating...' } : m
        )
      );

      setEditingMsgId(null);
      setIsTyping(true);
      await sendMessageToApi(currentChatId, updatedText, setMessages, selectedAgent, undefined);
      setIsTyping(false);
    } catch (error) {
      console.error('Edit replace error:', error);
      setIsTyping(false);
    }
  };

  const handleDeleteMessage = (id: string) => setConfirmDelete({ id, show: true });

  const confirmDeleteMessage = async () => {
    const id = confirmDelete.id;
    const user = auth.currentUser;
    if (!user || !currentChatId) return;
    try {
      const msgIndex = messages.findIndex((m) => m.id === id);
      const nextMsg = messages[msgIndex + 1];
      await deleteDoc(doc(db, 'users', user.uid, 'chats', currentChatId, 'messages', id));
      if (nextMsg?.role === 'assistant') {
        await deleteDoc(doc(db, 'users', user.uid, 'chats', currentChatId, 'messages', nextMsg.id));
      }
      setMessages((prev) => prev.filter((m, i) => i !== msgIndex && !(i === msgIndex + 1 && messages[i].role === 'assistant')));
      setConfirmDelete({ id: '', show: false });
    } catch (err) {
      console.error('Delete failed:', err);
      setConfirmDelete({ id: '', show: false });
    }
  };

  const agentOptions = [
    { value: 'Study Guide', emoji: '📘' },
    { value: 'Ethics Mentor', emoji: '🌙' },
    { value: 'Life Coach', emoji: '💬' },
    { value: 'History Scholar', emoji: '🕋' },
    { value: 'Career Rehnuma', emoji: '💼' },
  ];

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          onClose={() => setSidebarOpen(false)}
          refreshTrigger={chatCreated}
          onRefreshComplete={() => setChatCreated(false)}
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col w-full h-screen overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">RehnumaAI</h1>
                <p className="text-xs text-slate-500">Your intelligent companion</p>
              </div>
            </div>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            {messages.length === 0 && !isTyping ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-full p-4 text-center"
              >
                <motion.div
                  className="relative mb-8"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <motion.div
                    className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="text-white" size={36} />
                  </motion.div>
                  <div className="absolute inset-0 w-20 h-20 bg-emerald-400 rounded-3xl blur-2xl opacity-30 -z-10" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3"
                >
                  How can I help you today?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-slate-500 max-w-md mb-8"
                >
                  Start a conversation with RehnumaAI and discover personalized guidance.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-3 max-w-lg"
                >
                  {['Help me study', 'Life advice', 'Career guidance', 'Explain a topic'].map((suggestion, index) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMessage(suggestion)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all shadow-sm"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
              >
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    className="group"
                  >
                    <div className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {/* AI Avatar */}
                      {msg.role === 'assistant' && (
                        <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                          <Sparkles className="text-white" size={16} />
                        </div>
                      )}

                      {/* Message Content */}
                      <div className={`flex-grow-0 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                        {editingMsgId === msg.id ? (
                          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-lg">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                              rows={4}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end mt-3">
                              <button
                                onClick={() => handleSaveEdit(msg.id)}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                              >
                                <Check size={14} /> Save
                              </button>
                              <button
                                onClick={() => setEditingMsgId(null)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium flex items-center gap-2"
                              >
                                <X size={14} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {/* Message bubble */}
                            <div
                              className={`${
                                msg.role === 'user'
                                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-emerald-500/20'
                                  : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-md shadow-md shadow-slate-200/50'
                              } px-5 py-3.5`}
                            >
                              <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                                  pre: ({ children }) => <>{children}</>,
                                  code: ({ className, children, ...props }) => {
                                    const isBlock = className?.includes('language-');
                                    if (isBlock) {
                                      return <CodeBlock className={className}>{children}</CodeBlock>;
                                    }
                                    return msg.role === 'user'
                                      ? <code className="bg-white/20 px-1.5 py-0.5 rounded text-sm">{children}</code>
                                      : <InlineCode>{children}</InlineCode>;
                                  },
                                  ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1">{children}</h3>,
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-emerald-500 pl-4 my-2 italic text-slate-600">{children}</blockquote>
                                  ),
                                  a: ({ href, children }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">{children}</a>
                                  ),
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto my-3">
                                      <table className="min-w-full border border-slate-200 rounded-lg">{children}</table>
                                    </div>
                                  ),
                                  th: ({ children }) => <th className="px-3 py-2 bg-slate-100 text-left text-sm font-semibold border-b">{children}</th>,
                                  td: ({ children }) => <td className="px-3 py-2 text-sm border-b border-slate-100">{children}</td>,
                                }}
                              >
                                {typeof msg.content === 'string' ? msg.content : ''}
                              </ReactMarkdown>
                              </div>

                              {/* Attached files */}
                              {msg.files && msg.files.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {msg.files.map((file: any, idx: number) => (
                                    <div key={idx}>
                                      {file.type?.startsWith('image/') ? (
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
                                          <img src={file.url} alt={file.name} className="rounded-xl max-h-48 object-cover border-2 border-white/20" />
                                        </a>
                                      ) : (
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                            msg.role === 'user' ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200'
                                          } hover:opacity-80 transition`}
                                        >
                                          {file.type === 'application/pdf' ? <FileText size={16} /> : <File size={16} />}
                                          <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Timestamp and status */}
                            <div className={`mt-1.5 flex items-center gap-2 text-xs text-slate-400 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatTime(msg.createdAt)}
                              </span>
                              {msg.role === 'user' && (
                                <span className="flex items-center text-emerald-500" title="Delivered">
                                  <CheckCheck size={14} />
                                </span>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className={`mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <button
                                onClick={() => handleCopy(msg.content)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600"
                                title="Copy message"
                              >
                                <Copy size={14} />
                              </button>
                              {msg.role === 'user' && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-2 hover:bg-red-50 rounded-lg transition text-slate-400 hover:text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {msg.role === 'user' && (
                        <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg order-2">
                          <span className="text-white text-sm font-medium">
                            {auth.currentUser?.displayName?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isTyping && <TypingIndicator />}

                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Section */}
        <div className="border-t border-slate-100 bg-white/80 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            {/* File preview */}
            <AnimatePresence>
              {attachedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-600 font-medium">Attached Files ({attachedFiles.length}/5)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm"
                      >
                        <div className="text-emerald-600">{getFileIcon(file.type)}</div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700 truncate max-w-[150px]">{file.name}</span>
                          <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500 transition">
                          <XCircle size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/50 p-3 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50 transition-all">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message RehnumaAI..."
                className="w-full bg-transparent resize-none focus:outline-none text-slate-800 placeholder-slate-400 px-2 py-1 max-h-32 overflow-y-auto"
                rows={1}
                disabled={sending}
                style={{ minHeight: '40px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf,text/plain,.doc,.docx" onChange={handleFileSelect} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || attachedFiles.length >= 5}
                    className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50"
                    title="Attach files"
                  >
                    <Paperclip size={20} />
                  </button>

                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" />
                  <button
                    onClick={openCamera}
                    disabled={sending || attachedFiles.length >= 5}
                    className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-50"
                    title="Take a photo"
                    type="button"
                  >
                    <Camera size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="appearance-none text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer hover:bg-slate-100 transition-all"
                    >
                      {agentOptions.map(agent => (
                        <option key={agent.value} value={agent.value}>{agent.emoji} {agent.value}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={sending || (!message.trim() && attachedFiles.length === 0)}
                    className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none transition-all"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center mt-3">
              RehnumaAI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>

      {/* Toasts & Modals */}
      <AnimatePresence>
        {copiedText && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-4 sm:bottom-28 sm:right-8 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 z-50"
          >
            <Check size={16} className="text-emerald-400" />
            {copiedText}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center"
            >
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Delete message?</h3>
              <p className="text-sm text-slate-500 mb-6">This will permanently delete the message and its response.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete({ id: '', show: false })}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMessage}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCameraModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Camera size={20} /> Take a Photo
                </h3>
                <button onClick={closeCamera} className="text-white hover:bg-white/20 rounded-xl p-2 transition">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto max-h-[60vh] object-contain" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="p-6 flex gap-3">
                <button onClick={closeCamera} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium">
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg transition font-medium flex items-center justify-center gap-2"
                >
                  <Camera size={18} /> Capture
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
