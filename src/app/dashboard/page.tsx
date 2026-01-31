// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Send, Menu, Copy, Edit2, Trash2, Check, X, Sparkles, ChevronUp, ChevronDown, Paperclip, FileText, Image as ImageIcon, File, XCircle, Camera } from 'lucide-react';


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
  const [selectedAgent, setSelectedAgent] = useState<string>('📘 Study Guide');
  const [chatCreated, setChatCreated] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]); // ✅ Added
  const fileInputRef = useRef<HTMLInputElement>(null); // ✅ Added
  const cameraInputRef = useRef<HTMLInputElement>(null); // ✅ Added for camera
  const [showCameraModal, setShowCameraModal] = useState(false); // ✅ Camera modal state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);


  // subscribe to Firestore messages — while streaming the lib will append the temp message
  useEffect(() => {
    if (!currentChatId) {
      // 🧠 don’t reset messages if a new chat is being created
      if (!isCreatingChat) setMessages([]);
      return;
    }
    const unsubscribe = subscribeToMessages(currentChatId, setMessages);
    return () => unsubscribe();
  }, [currentChatId, isCreatingChat]);  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
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

    setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ✅ Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (file.size > maxSize) {
        alert(`Photo too large (max 10MB): ${file.name}`);
        return false;
      }
      return true;
    });

    setAttachedFiles((prev) => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  // ✅ Open camera modal and start webcam
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
      setShowCameraModal(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error('Camera access error:', err);
      
      // Show user-friendly error messages
      if (err.name === 'NotAllowedError') {
        alert('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        alert('No camera found. Would you like to upload an image instead?');
        cameraInputRef.current?.click();
      } else {
        // For other errors, fallback to file input
        console.log('Falling back to file input');
        cameraInputRef.current?.click();
      }
    }
  };

  // ✅ Close camera and stop stream
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  // ✅ Capture photo from webcam
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
            const fileName = `camera-${Date.now()}.jpg`;
            // Create a File object from Blob
            const file = Object.assign(blob, {
              name: fileName,
              lastModified: Date.now(),
            }) as File;
            
            setAttachedFiles((prev) => [...prev, file].slice(0, 5));
            closeCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // ✅ Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // ✅ Remove attached file
  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Get file icon based on type
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon size={16} />;
    if (type === 'application/pdf') return <FileText size={16} />;
    return <File size={16} />;
  };

  // ✅ FIXED handleSend (no undefined Firestore fields)
  async function handleSend() {
    if ((!message.trim() && attachedFiles.length === 0) || sending) return;
  
    const userInput = message.trim() || '📎 [Attached files]';
    const filesToSend = [...attachedFiles];
    setMessage('');
    setAttachedFiles([]);
    setSending(true);
  
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please log in first');
        setSending(false);
        return;
      }
  
      let chatId = currentChatId;
  
      // ✅ Create chat quietly (don’t switch yet)
      let newChatRef = null;
      if (!chatId || chatId.startsWith('temp-')) {
        newChatRef = await addDoc(collection(db, `users/${user.uid}/chats`), {
          title: userInput.slice(0, 30) + (userInput.length > 30 ? '...' : ''),
          createdAt: serverTimestamp(),
        });
        chatId = newChatRef.id;
      }
  
      // ✅ Show user message immediately
      const tempMsg = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userInput,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMsg]);
  
      // ✅ If files attached, show uploading notice
      if (filesToSend.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `upload-${Date.now()}`,
            role: 'assistant',
            content: '📤 Uploading files, please wait...',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
  
      // ✅ Send to API and wait until Firestore message exists
      await sendMessageToApi(
        chatId,
        userInput,
        setMessages,
        selectedAgent,
        filesToSend.length > 0 ? filesToSend : undefined
      );
  
      // ✅ Only now that message exists → switch chatId
      if (newChatRef) {
        setCurrentChatId(chatId);
        setChatCreated(true);
      }
    } catch (err) {
      console.error('sendMessageToApi error:', err);
    } finally {
      setSending(false);
    }
  }      
  
  const handleCopy = (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedText('Copied!');
      setTimeout(() => setCopiedText(null), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
      setCopiedText('Copy failed');
      setTimeout(() => setCopiedText(null), 1500);
    }
  };

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

      if (aiMsgRef && nextMsg.role === 'assistant') {
        await deleteDoc(aiMsgRef);
      }

      await setDoc(msgRef, {
        ...editedMsg,
        content: updatedText,
        role: 'user',
        createdAt: editedMsg.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, content: updatedText }
            : m.id === aiMsgId
              ? { ...m, content: 'Regenerating...' }
              : m
        )
      );

      setEditingMsgId(null);

      // stream new assistant reply and save final
      await sendMessageToApi(currentChatId, updatedText, setMessages, selectedAgent, undefined);
    } catch (error) {
      console.error('Edit replace error:', error);
      alert('Failed to update message.');
    }
  };

  const handleDeleteMessage = (id: string) => {
    setConfirmDelete({ id, show: true });
  };

  const confirmDeleteMessage = async () => {
    const id = confirmDelete.id;
    const user = auth.currentUser;
    if (!user || !currentChatId) return;
    try {
      const msgIndex = messages.findIndex((m) => m.id === id);
      const nextMsg = messages[msgIndex + 1];
      const msgRef = doc(db, 'users', user.uid, 'chats', currentChatId, 'messages', id);

      await deleteDoc(msgRef);

      if (nextMsg && nextMsg.role === 'assistant') {
        const nextRef = doc(db, 'users', user.uid, 'chats', currentChatId, 'messages', nextMsg.id);
        await deleteDoc(nextRef);
      }

      setMessages((prev) =>
        prev.filter(
          (m, i) =>
            i !== msgIndex && !(i === msgIndex + 1 && messages[i].role === 'assistant')
        )
      );
      setConfirmDelete({ id: '', show: false });
    } catch (err) {
      console.error('Delete failed:', err);
      setConfirmDelete({ id: '', show: false });
    }
  };

    return (
      <div className="flex h-screen w-full bg-gray-50 text-gray-800">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
    
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out w-72 bg-white border-r border-gray-200 ${
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
        </div>
    
        <div className="flex flex-1 flex-col w-full h-screen">
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              RehnumaAI
            </h1>
          </div>
    
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Sparkles className="text-white" size={32} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-500 max-w-md">
                  Start a new conversation with RehnumaAI.
                </p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                {messages.map((msg) => (
                  <div key={msg.id} className="group relative">
                    <div
                      className={`flex gap-3 sm:gap-4 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm self-start">
                          <Sparkles className="text-white" size={16} />
                        </div>
                      )}
    
                      <div
                        className={`flex-grow-0 max-w-[90%] sm:max-w-[80%] ${
                          msg.role === 'user' ? 'order-1' : 'order-2'
                        }`}
                      >
                        {editingMsgId === msg.id ? (
                          <div className="flex flex-col gap-2 bg-white rounded-2xl p-3 border border-gray-200 shadow-sm">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                              rows={4}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleSaveEdit(msg.id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-1.5"
                              >
                                <Check size={14} /> Save
                              </button>
                              <button
                                onClick={() => setEditingMsgId(null)}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium flex items-center gap-1"
                              >
                                <X size={14} /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-stretch">
                            {/* Message bubble */}
                            <div
                              className={`${
                                msg.role === 'user'
                                  ? 'bg-green-600 text-white rounded-2xl rounded-br-lg'
                                  : 'bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-lg'
                              } px-4 py-3 shadow-sm`}
                            >
                              <ReactMarkdown
                                components={{
                                  p: ({ node, ...props }) => (
                                    <p className="my-0" {...props} />
                                  ),
                                }}
                              >
                                {typeof msg.content === 'string'
                                  ? msg.content
                                  : ''}
                              </ReactMarkdown>

                              {/* ✅ Display attached files */}
                              {msg.files && msg.files.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {msg.files.map((file: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      {file.type.startsWith('image/') ? (
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block max-w-xs"
                                        >
                                          <img
                                            src={file.url}
                                            alt={file.name}
                                            className="rounded-lg max-h-48 object-cover border border-gray-300"
                                          />
                                        </a>
                                      ) : (
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                            msg.role === 'user'
                                              ? 'bg-green-700 border-green-500'
                                              : 'bg-gray-50 border-gray-300'
                                          } hover:opacity-80 transition`}
                                        >
                                          {file.type === 'application/pdf' ? (
                                            <FileText size={16} />
                                          ) : (
                                            <File size={16} />
                                          )}
                                          <span className="text-sm truncate max-w-[200px]">
                                            {file.name}
                                          </span>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
    
                            {/* Buttons BELOW message */}
                            <div
                              className={`mt-2 flex gap-2 ${
                                msg.role === 'user'
                                  ? 'justify-end'
                                  : 'justify-start'
                              }`}
                            >
                              <button
                                onClick={() => handleCopy(msg.content)}
                                className="p-1.5 hover:bg-gray-100 rounded transition text-gray-600 hover:text-gray-900"
                                title="Copy"
                              >
                                <Copy size={14} />
                              </button>
                              {msg.role === 'user' && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1.5 hover:bg-red-50 rounded transition text-gray-600 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
    
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm self-start order-1">
                          <span className="text-white text-sm font-medium">
                            {auth.currentUser?.displayName?.[0]?.toUpperCase() ||
                              'U'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
    
          {/* Input Section */}
          <div className="border-t border-gray-200 p-4 bg-gradient-to-t from-white/80 via-white/60 to-transparent backdrop-blur-md">
            <div className="max-w-4xl mx-auto">
              {/* ✅ File preview section */}
              {attachedFiles.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600 font-medium">
                      Attached Files ({attachedFiles.length}/5)
                    </span>
                    <span className="text-xs text-gray-500">
                      Max 10MB per file
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm"
                      >
                        <div className="text-green-600">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700 truncate max-w-[150px]">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-500 hover:text-red-600 transition"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative bg-white/70 border border-gray-200 rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-green-500 transition p-2 backdrop-blur-sm">
                <div className="w-full mb-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message RehnumaAI..."
                    className="w-full bg-transparent resize-none focus:outline-none text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2 max-h-32 overflow-y-auto transition-all duration-200"
                    rows={1}
                    disabled={sending}
                    style={{
                      minHeight: '40px',
                      height: 'auto',
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height =
                        Math.min(target.scrollHeight, 128) + 'px';
                    }}
                  />
                </div>
    
                <div className="flex items-center justify-between gap-2">
                  {/* ✅ File upload button */}
                  {/* ✅ File upload and camera buttons */}
                  <div className="flex items-center gap-2">
                    {/* Regular file upload */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || attachedFiles.length >= 5}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed relative group"
                      title="Attach files (Max 5 files, 10MB each)"
                    >
                      <Paperclip size={20} />
                      {/* ✅ Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform translate-y-1/2 ml-4 mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10">
                        <div className="font-semibold mb-1">Upload Limits:</div>
                        <ul className="space-y-0.5 text-left">
                          <li>• Max 5 files per message</li>
                          <li>• Max 10MB per file</li>
                          <li>• JPG, PNG, PDF, TXT, DOC</li>
                        </ul>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </button>

                    {/* Camera capture (mobile & desktop with webcam) */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraCapture}
                      className="hidden"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        openCamera();
                      }}
                      disabled={sending || attachedFiles.length >= 5}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="appearance-none text-sm bg-white/80 border border-gray-300 text-gray-700 rounded-lg pl-3 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer shadow-sm hover:bg-white transition"
                      >
                        <option>📘 Study Guide</option>
                        <option>🌙 Ethics Mentor</option>
                        <option>💬 Life Coach</option>
                        <option>🕋 History Scholar</option>
                        <option>💼 Career Rehnuma</option>
                      </select>
      
                      <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-gray-500">
                        <ChevronDown size={16} />
                      </div>
                    </div>
      
                    <button
                      onClick={handleSend}
                      disabled={sending || (!message.trim() && attachedFiles.length === 0)}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md flex-shrink-0"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
    
              <p className="text-xs text-gray-500 text-center mt-3 px-4">
                RehnumaAI can make mistakes. Consider checking important
                information.
              </p>
            </div>
          </div>
        </div>
    
        {copiedText && (
          <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl text-sm animate-fade-in z-50">
            {copiedText}
          </div>
        )}
    
        {confirmDelete.show && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete message?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                This will permanently delete the message and its response.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete({ id: '', show: false })}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMessage}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Camera Modal */}
        {showCameraModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Camera size={20} />
                  Take a Photo
                </h3>
                <button
                  onClick={closeCamera}
                  className="text-white hover:bg-white/20 rounded-lg p-1.5 transition"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="p-6 flex gap-3">
                <button
                  onClick={closeCamera}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  Capture Photo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
);
}