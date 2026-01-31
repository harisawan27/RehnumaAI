'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { ArrowLeft, User, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { updateProfile } from 'firebase/auth';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // ✅ Keep auth state synced
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const userRef = useMemo(
    () => (currentUser ? doc(db, 'users', currentUser.uid) : null),
    [currentUser]
  );

  const { data: userData, isLoading } = useDoc(userRef);

  useEffect(() => {
    if (userData?.name || currentUser?.displayName) {
      setName(userData?.name || currentUser?.displayName || '');
    }
  }, [userData, currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Not logged in</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name?: string) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase() : 'U';

  // ✅ Update Firestore + Auth safely
  async function handleSave() {
    if (!userRef || !name.trim()) return;
    setSaving(true);
    setSavedMessage('');

    try {
      await updateDoc(userRef, { name: name.trim() });

      // ✅ Check before updating Auth
      if (currentUser) {
        await updateProfile(currentUser, { displayName: name.trim() });
      }

      setSavedMessage('✅ Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setSavedMessage('❌ Failed to update profile.');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMessage(''), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
              <p className="text-sm text-gray-500">Manage your account information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          {/* Avatar */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold">
                  {getInitials(name || currentUser?.displayName || 'U')}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {name || currentUser?.displayName || 'User'}
              </h2>
              <p className="text-gray-500">{userData?.email || currentUser?.email || ''}</p>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <User size={18} className="text-gray-700" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                />
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <Mail size={18} className="text-gray-700" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={userData?.email || currentUser?.email || ''}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setName(userData?.name || currentUser?.displayName || '')}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
          </div>

          {savedMessage && (
            <p
              className={`text-sm mt-3 text-center ${
                savedMessage.includes('✅') ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {savedMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
