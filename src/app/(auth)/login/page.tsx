'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { registerUser, loginUser, signInWithGoogle } from '@/firebase/auth'
import { useAuthContext } from '@/firebase/AuthContext'
import { Sparkles, Eye, EyeOff, Check, X, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  useEffect(() => {
    if (user) router.push('/dashboard')
  }, [user, router])

  // Password validation checks
  const passwordChecks = useMemo(() => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
  }), [password])

  const isPasswordValid = Object.values(passwordChecks).every(Boolean)
  const passedChecks = Object.values(passwordChecks).filter(Boolean).length
  const showPasswordHints = !isLogin && passwordTouched && !isPasswordValid && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await loginUser(email, password)
        router.push('/dashboard')
      } else {
        if (!isPasswordValid) {
          throw new Error('Please ensure your password meets all requirements.')
        }
        await registerUser(email, password, name)
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-20 w-72 h-72 bg-emerald-500 rounded-full blur-[100px] opacity-30"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-32 right-20 w-96 h-96 bg-teal-500 rounded-full blur-[120px] opacity-20"
            animate={{
              scale: [1, 1.1, 1],
              x: [0, -20, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500 rounded-full blur-[80px] opacity-20"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 40, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        {/* Floating Geometric Shapes */}
        <motion.div
          className="absolute top-32 right-32 w-16 h-16 border-2 border-emerald-400/30 rounded-lg"
          animate={{ rotate: 360, y: [0, -20, 0] }}
          transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        />
        <motion.div
          className="absolute bottom-40 left-32 w-12 h-12 border-2 border-teal-400/30 rounded-full"
          animate={{ rotate: -360, scale: [1, 1.2, 1] }}
          transition={{ rotate: { duration: 15, repeat: Infinity, ease: "linear" }, scale: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
        />
        <motion.div
          className="absolute top-1/2 right-1/4 w-8 h-8 bg-emerald-400/20 rounded-sm"
          animate={{ rotate: 180, y: [0, 30, 0] }}
          transition={{ rotate: { duration: 10, repeat: Infinity, ease: "linear" }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Logo */}
            <motion.div
              className="flex items-center gap-4 mb-12"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Sparkles className="text-white" size={28} />
              </div>
              <span className="text-3xl font-bold text-white">RehnumaAI</span>
            </motion.div>

            {/* Tagline */}
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Your Intelligent
              <span className="block text-gradient bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Learning Companion
              </span>
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed max-w-md mb-10">
              Experience personalized guidance powered by AI. Get instant answers, study support, and life coaching tailored just for you.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              {['Study Guide', 'Ethics Mentor', 'Life Coach', 'Career Rehnuma'].map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full text-sm text-slate-300"
                >
                  {feature}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent" />
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Sparkles className="text-white" size={32} />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-800">RehnumaAI</h1>
          </div>

          {/* Form Card */}
          <motion.div
            className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl shadow-emerald-500/5 border border-white/50"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  {isLogin ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-slate-500 mb-8">
                  {isLogin ? 'Sign in to continue your journey' : 'Start your learning journey today'}
                </p>

                {/* Google Sign In */}
                <motion.button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 rounded-xl text-slate-700 font-medium flex items-center justify-center gap-3 transition-all border border-slate-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </motion.button>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/80 text-slate-400">or continue with email</span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <AnimatePresence>
                    {!isLogin && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="input-modern"
                          placeholder="Enter your name"
                          required={!isLogin}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-modern"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setPasswordTouched(true)}
                        className="input-modern pr-12"
                        placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {!isLogin && password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3"
                      >
                        <div className="flex gap-1.5 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                                i < passedChecks
                                  ? passedChecks <= 2 ? 'bg-red-400'
                                    : passedChecks <= 4 ? 'bg-amber-400'
                                    : 'bg-emerald-500'
                                  : 'bg-slate-200'
                              }`}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ delay: i * 0.1 }}
                            />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${
                          passedChecks <= 2 ? 'text-red-500'
                            : passedChecks <= 4 ? 'text-amber-500'
                            : 'text-emerald-600'
                        }`}>
                          {passedChecks <= 2 ? 'Weak' : passedChecks <= 4 ? 'Good' : 'Strong'} password
                        </p>
                      </motion.div>
                    )}

                    {/* Password Requirements */}
                    <AnimatePresence>
                      {showPasswordHints && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
                        >
                          <p className="text-xs font-medium text-slate-600 mb-3">Password requirements:</p>
                          <ul className="space-y-2">
                            <PasswordCheck passed={passwordChecks.minLength} text="At least 8 characters" />
                            <PasswordCheck passed={passwordChecks.hasUppercase} text="One uppercase letter (A-Z)" />
                            <PasswordCheck passed={passwordChecks.hasLowercase} text="One lowercase letter (a-z)" />
                            <PasswordCheck passed={passwordChecks.hasNumber} text="One number (0-9)" />
                            <PasswordCheck passed={passwordChecks.hasSpecial} text="One special character (!@#$%^&*)" />
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-red-50 border border-red-100 rounded-xl"
                      >
                        <p className="text-red-600 text-sm">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading || googleLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {isLogin ? 'Sign In' : 'Create Account'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Toggle Auth Mode */}
                <p className="text-center text-sm text-slate-500 mt-8">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin)
                      setError('')
                      setPasswordTouched(false)
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

function PasswordCheck({ passed, text }: { passed: boolean; text: string }) {
  return (
    <motion.li
      className={`flex items-center gap-2.5 text-xs ${passed ? 'text-emerald-600' : 'text-slate-400'}`}
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      <motion.div
        initial={false}
        animate={{
          backgroundColor: passed ? '#10b981' : '#e2e8f0',
          scale: passed ? [1, 1.2, 1] : 1
        }}
        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
      >
        {passed ? (
          <Check size={10} className="text-white" />
        ) : (
          <X size={10} className="text-slate-400" />
        )}
      </motion.div>
      {text}
    </motion.li>
  )
}
