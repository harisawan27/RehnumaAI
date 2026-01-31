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
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageCircle,
  Pin,
  PinOff,
} from 'lucide-react';
import { auth, db } from '@/firebase';

interface SidebarProps {
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  onClose?: () => void;
  refreshTrigger?: boolean;
  onRefreshComplete?: () => void;
}

// Highlight matching text in search results
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="bg-emerald-400/30 text-emerald-300 rounded px-0.5">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
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

  useEffect(() => {
    if (refreshTrigger && user) {
      loadChats(user.uid).then(() => onRefreshComplete?.());
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
      pinned: false,
    });
    setCurrentChatId(ref.id);
    await loadChats(user.uid);
    onClose?.();
  };

  const handleTogglePin = async (chatId: string, currentPinned: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'chats', chatId), { pinned: !currentPinned });
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinned: !currentPinned } : c)));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Pin toggle error:', err);
    }
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
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    location.href = '/login';
  };

  // Filter chats by search query
  const filteredChats = chats.filter(chat =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate pinned and unpinned chats
  const pinnedChats = filteredChats.filter(chat => chat.pinned);
  const unpinnedChats = filteredChats.filter(chat => !chat.pinned);

  // Group unpinned chats by date
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

  const chatGroups = groupChatsByDate(unpinnedChats);

  // Render a chat item
  const renderChatItem = (chat: any, index: number, showPinIcon = false) => (
    <motion.div
      key={chat.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
      className="relative group mb-1"
    >
      {editingChatId === chat.id ? (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/80 rounded-xl">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(chat.id)}
            className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            autoFocus
          />
          <button
            onClick={() => handleSaveRename(chat.id)}
            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => setEditingChatId(null)}
            className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition"
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
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative
              ${currentChatId === chat.id
                ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-white'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }
            `}
          >
            {/* Active indicator */}
            {currentChatId === chat.id && (
              <motion.div
                layoutId="activeChat"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-r-full"
              />
            )}

            {/* Pin icon for pinned chats */}
            {showPinIcon && chat.pinned && (
              <Pin size={14} className="flex-shrink-0 text-emerald-400" />
            )}

            {!showPinIcon && (
              <MessageCircle size={16} className={`flex-shrink-0 ${currentChatId === chat.id ? 'text-emerald-400' : 'text-slate-500'}`} />
            )}

            <span className="flex-1 text-left truncate">
              <HighlightText text={chat.title || 'Untitled Chat'} query={searchQuery} />
            </span>
          </button>

          {/* Menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId((prev) => (prev === chat.id ? null : chat.id));
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-700/50 transition opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={16} className="text-slate-400" />
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {openMenuId === chat.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl py-1.5 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Pin/Unpin option */}
                <button
                  onClick={() => handleTogglePin(chat.id, chat.pinned)}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-slate-200 hover:bg-slate-700/50 transition"
                >
                  {chat.pinned ? (
                    <>
                      <PinOff size={14} className="text-slate-400" /> Unpin
                    </>
                  ) : (
                    <>
                      <Pin size={14} className="text-slate-400" /> Pin to top
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingChatId(chat.id);
                    setEditTitle(chat.title || '');
                    setOpenMenuId(null);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-slate-200 hover:bg-slate-700/50 transition"
                >
                  <Edit2 size={14} className="text-slate-400" /> Rename
                </button>
                <button
                  onClick={() => {
                    setConfirmDeleteId(chat.id);
                    setOpenMenuId(null);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-red-400 hover:bg-red-500/10 transition"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete confirmation */}
          <AnimatePresence>
            {confirmDeleteId === chat.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 z-50 w-56 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm text-slate-200 mb-3">Delete this chat?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 px-3 py-2 text-sm bg-slate-700/50 text-slate-200 rounded-lg hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(chat.id)}
                    className="flex-1 px-3 py-2 text-sm bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );

  return (
    <aside
      ref={wrapperRef}
      className="flex w-full flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 mb-6 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow"
          >
            <Sparkles className="text-white" size={20} />
          </motion.div>
          <span className="text-lg font-semibold text-white">RehnumaAI</span>
        </Link>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/30 rounded-xl transition-all group"
        >
          <MessageSquarePlus size={18} className="text-emerald-400 group-hover:text-emerald-300 transition" />
          <span className="text-sm font-medium text-emerald-100">New chat</span>
        </motion.button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-white/5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-slate-500 mt-2">
            Found {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Chats List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={20} className="text-slate-500" />
            </div>
            <p className="text-sm text-slate-500">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {searchQuery ? 'Try a different search' : 'Start a new conversation'}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Pin size={12} />
                  Pinned
                </div>
                <AnimatePresence>
                  {pinnedChats.map((chat, index) => renderChatItem(chat, index, true))}
                </AnimatePresence>
              </div>
            )}

            {/* Regular Chats by Date */}
            {Object.entries(chatGroups).map(([groupName, groupChats]) =>
              groupChats.length > 0 && (
                <div key={groupName} className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {groupName}
                  </div>
                  <AnimatePresence>
                    {groupChats.map((chat, index) => renderChatItem(chat, index))}
                  </AnimatePresence>
                </div>
              )
            )}
          </>
        )}
      </nav>

      {/* User Profile Footer */}
      <div className="border-t border-white/5 p-3">
        <div
          onClick={() => setOpenMenuId((prev) => (prev === 'user-menu' ? null : 'user-menu'))}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-800/50 group relative"
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white text-sm font-semibold">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>

          <MoreHorizontal size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition" />
        </div>

        {/* User Menu */}
        <AnimatePresence>
          {openMenuId === 'user-menu' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 left-3 right-3 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl py-1.5 z-50"
            >
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 transition"
                onClick={() => {
                  setOpenMenuId(null);
                  onClose?.();
                }}
              >
                <UserIcon size={16} className="text-slate-400" /> Profile
              </Link>
              <hr className="my-1.5 border-slate-700/50" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut size={16} /> Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
