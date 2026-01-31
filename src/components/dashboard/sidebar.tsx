// src/components/dashboard/sidebar.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  MessageSquarePlus,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  Check,
  X,
  User as UserIcon,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { auth, db } from '@/firebase';

interface SidebarProps {
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  onClose?: () => void;
  refreshTrigger?: boolean;
  onRefreshComplete?: () => void;
}

export function Sidebar({ currentChatId, setCurrentChatId, onClose, refreshTrigger, onRefreshComplete }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await loadChats(u.uid);
      else setChats([]);
    });
    return () => unsub();
  }, []);

  // Refresh chats when a new chat is created
  useEffect(() => {
    if (refreshTrigger && user) {
      loadChats(user.uid).then(() => {
        onRefreshComplete?.();
      });
    }
  }, [refreshTrigger, user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setOpenMenuId(null);
        setEditingChatId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadChats = async (uid: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, `users/${uid}/chats`), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setChats(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      console.error('Error loading chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!user) return;
    const ref = await addDoc(collection(db, `users/${user.uid}/chats`), {
      title: 'New Chat',
      createdAt: serverTimestamp(),
    });
    setCurrentChatId(ref.id);
    await loadChats(user.uid);
    onClose?.();
  };

  const handleSaveRename = async (chatId: string) => {
    if (!user) return;
    const newTitle = editTitle.trim();
    if (!newTitle) return alert('Chat title cannot be empty.');
    try {
      await updateDoc(doc(db, 'users', user.uid, 'chats', chatId), { title: newTitle });
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c)));
      setEditingChatId(null);
      setOpenMenuId(null);
    } catch (err) {
      console.error('Rename error:', err);
    }
  };

  const handleConfirmDelete = async (chatId: string) => {
    if (!user) return;
    try {
      const msgCol = collection(db, 'users', user.uid, 'chats', chatId, 'messages');
      const msgSnap = await getDocs(msgCol);
      if (!msgSnap.empty) {
        const batch = writeBatch(db);
        msgSnap.forEach((m) => batch.delete(m.ref));
        await batch.commit();
      }

      await deleteDoc(doc(db, 'users', user.uid, 'chats', chatId));

      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) setCurrentChatId(null);
      setOpenMenuId(null);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Delete failed. Check console for details.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    location.href = '/login';
  };

  const filteredChats = chats.filter(chat =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupChatsByDate = (chats: any[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { [key: string]: any[] } = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Older': [],
    };

    chats.forEach(chat => {
      const chatDate = chat.createdAt?.toDate?.() || new Date();
      if (chatDate.toDateString() === today.toDateString()) {
        groups['Today'].push(chat);
      } else if (chatDate.toDateString() === yesterday.toDateString()) {
        groups['Yesterday'].push(chat);
      } else if (chatDate >= lastWeek) {
        groups['Previous 7 Days'].push(chat);
      } else {
        groups['Older'].push(chat);
      }
    });

    return groups;
  };

  const chatGroups = groupChatsByDate(filteredChats);

  return (
    <aside
      ref={wrapperRef}
      className="flex w-full flex-col h-full bg-gray-900 text-white"
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-6 shadow-lg">
          <Link href={'/'}>
            <Sparkles className="text-white" size={16} />
          </Link>
        </div>
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition group"
        >
          <MessageSquarePlus size={18} className="text-gray-400 group-hover:text-white transition" />
          <span className="text-sm font-medium">New chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Chats */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {loading ? (
          <div className="px-3 py-2 text-sm text-gray-500">Loading chats...</div>
        ) : filteredChats.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">
            {searchQuery ? 'No chats found' : 'No chats yet'}
          </div>
        ) : (
          Object.entries(chatGroups).map(([groupName, groupChats]) =>
            groupChats.length > 0 && (
              <div key={groupName} className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {groupName}
                </div>
                {groupChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="relative group mb-1"
                  >
                    {editingChatId === chat.id ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(chat.id)}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(chat.id)}
                          className="p-1 text-green-400 hover:text-green-300"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingChatId(null)}
                          className="p-1 text-gray-400 hover:text-gray-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setCurrentChatId(chat.id);
                            setOpenMenuId(null);
                            onClose?.();
                          }}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                            ${currentChatId === chat.id
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-300 hover:bg-gray-800'
                            }
                          `}
                        >
                          <MessageSquarePlus size={16} className="flex-shrink-0 text-gray-500" />
                          <span className="flex-1 text-left truncate">
                            {chat.title || 'Untitled Chat'}
                          </span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === chat.id ? null : chat.id));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-700 transition"
                        >
                          <MoreHorizontal size={16} className="text-gray-400" />
                        </button>

                        {openMenuId === chat.id && (
                          <div
                            className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl bg-gray-800 border border-gray-700 shadow-xl py-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setEditingChatId(chat.id);
                                setEditTitle(chat.title || '');
                                setOpenMenuId(null);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm hover:bg-gray-700 transition text-gray-200"
                            >
                              <Edit2 size={14} /> Rename
                            </button>
                            <button
                              onClick={() => {
                                setConfirmDeleteId(chat.id);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm hover:bg-gray-700 transition text-red-400"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}

                        {confirmDeleteId === chat.id && (
                          <div
                            className="absolute right-0 top-full mt-2 z-50 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-sm text-gray-200 mb-3">Delete this chat?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmDelete(chat.id)}
                                className="flex-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )
          )
        )}
      </nav>

      {/* User Profile Footer */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer transition group">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId((prev) => (prev === 'user-menu' ? null : 'user-menu'));
            }}
            className="p-1 opacity-0 group-hover:opacity-100 transition"
          >
            <MoreHorizontal size={16} className="text-gray-400" />
          </button>
        </div>

        {openMenuId === 'user-menu' && (
          <div className="absolute bottom-16 left-3 right-3 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 z-50">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-700 transition text-gray-200"
              onClick={() => {
                setOpenMenuId(null);
                onClose?.();
              }}
            >
              <UserIcon size={16} /> Profile
            </Link>
            <hr className="my-1 border-gray-700" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm hover:bg-gray-700 transition text-red-400"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}