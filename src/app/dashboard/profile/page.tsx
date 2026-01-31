'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { ArrowLeft, User, Mail, Sparkles, Shield, Check } from 'lucide-react';
import Link from 'next/link';
import { updateProfile } from 'firebase/auth';

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Keep auth state synced
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
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Not logged in</p>
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 text-sm mt-2 inline-block">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name?: string) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  // Update Firestore + Auth
  async function handleSave() {
    if (!userRef || !name.trim()) return;
    setSaving(true);
    setSavedMessage('');

    try {
      await updateDoc(userRef, { name: name.trim() });

      if (currentUser) {
        await updateProfile(currentUser, { displayName: name.trim() });
      }

      setSavedMessage('success');
    } catch (error) {
      console.error('Error updating profile:', error);
      setSavedMessage('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMessage(''), 3000);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <ArrowLeft size={22} className="text-slate-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
              <p className="text-sm text-slate-500">Manage your account information</p>
            </div>
          </div>
        </div>
        {/* Gradient accent */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {getInitials(name || currentUser?.displayName || 'U')}
                  </span>
                </div>
                {/* Badge */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-3 border-white flex items-center justify-center shadow-md">
                  <Sparkles size={12} className="text-white" />
                </div>
              </div>

              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold text-slate-800 mb-1">
                  {name || currentUser?.displayName || 'User'}
                </h2>
                <p className="text-slate-500 text-sm">{userData?.email || currentUser?.email || ''}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                  Active User
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Display Name */}
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userData?.email || currentUser?.email || ''}
                    disabled
                    className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                    <Shield size={10} />
                    Email cannot be changed
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                onClick={() => setName(userData?.name || currentUser?.displayName || '')}
                className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium"
              >
                Cancel
              </button>
            </div>

            {/* Success/Error Message */}
            {savedMessage && (
              <div
                className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${
                  savedMessage === 'success'
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  savedMessage === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                  {savedMessage === 'success' ? (
                    <Check size={12} className="text-white" />
                  ) : (
                    <span className="text-white text-xs">!</span>
                  )}
                </div>
                <p className={`text-sm font-medium ${
                  savedMessage === 'success' ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {savedMessage === 'success' ? 'Profile updated successfully!' : 'Failed to update profile.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
