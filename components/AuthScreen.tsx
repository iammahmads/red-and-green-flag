"use client";

import { useState } from 'react';
import { signupWithEmail, loginWithEmail, forgotPassword, signInWithGoogle, resendVerification, auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'verify';

interface AuthScreenProps {
  onSuccess: () => void;
  initialMode?: AuthMode;
  initialEmail?: string;
}

export default function AuthScreen({ onSuccess, initialMode = 'login', initialEmail = '' }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signupWithEmail(email, password, name);
      setMode('verify');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await loginWithEmail(email, password);
      if (!user.emailVerified) {
        setMode('verify');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      alert('Reset link sent! If you actually have an inbox... 💅');
      setMode('login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    setLoading(true);
    setError('');
    try {
      // We must reload the user to get the latest emailVerified status
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        onSuccess();
      } else {
        setError("You haven't clicked the link yet! Don't lie to me. 🙄");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    try {
      await resendVerification();
      alert('Sent again! Try checking your spam. 🙄');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full">
      <div className="w-full max-w-xl bg-white p-6 sm:p-10 rounded-3xl border-4 border-black shadow-[12px_12px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        {/* Meme Decor */}
        <div className="absolute -top-4 -right-4 text-4xl transform rotate-12">🚩</div>
        <div className="absolute -bottom-4 -left-4 text-4xl transform -rotate-12">🍏</div>

        <h2 className="text-4xl font-bangers text-center mb-8 uppercase">
          {mode === 'login' && 'SNEAK IN 🕵️'}
          {mode === 'signup' && 'JOIN THE ROAST 🔥'}
          {mode === 'forgot' && 'LOST YOUR MIND? 🧠'}
          {mode === 'verify' && 'VIBE CHECK 🛡️'}
        </h2>

        {error && (
          <motion.div 
            initial={{ x: -10 }} 
            animate={{ x: 0 }} 
            className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-lg mb-6 font-bold text-sm"
          >
            L + Ratio: {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'login' && (
            <motion.form 
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleLogin} 
              className="flex flex-col gap-4"
            >
              <input 
                required
                type="email" 
                placeholder="Email (don't use your finsta's)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-4 rounded-xl border-4 border-black font-bold focus:ring-4 focus:ring-yellow-400 outline-none"
              />
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 rounded-xl border-4 border-black font-bold focus:ring-4 focus:ring-yellow-400 outline-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/50 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
              <button 
                disabled={loading}
                className="bg-black text-white font-bangers text-2xl py-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_rgba(255,255,255,0.2)] hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {loading ? 'HACKING IN...' : 'LOG IN'}
              </button>
              <div className="flex justify-between text-sm font-bold underline">
                <button type="button" onClick={() => setMode('signup')}>CREATE ACCOUNT</button>
                <button type="button" onClick={() => setMode('forgot')}>FORGOT?</button>
              </div>
              <div className="relative my-4">
                <hr className="border-2 border-black" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 font-bold">OR</span>
              </div>
              <button 
                type="button"
                onClick={signInWithGoogle}
                className="bg-yellow-400 text-black font-bangers text-xl py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 transition-all"
              >
                GOOGLE (LAZY WAY) 🙄
              </button>
            </motion.form>
          )}

          {mode === 'signup' && (
            <motion.form 
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSignup} 
              className="flex flex-col gap-4"
            >
              <input 
                required
                type="text" 
                placeholder="Wanna-be Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="p-4 rounded-xl border-4 border-black font-bold outline-none"
              />
              <input 
                required
                type="email" 
                placeholder="Real Email (no fakes allowed)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-4 rounded-xl border-4 border-black font-bold outline-none"
              />
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password (not 'password123')"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 rounded-xl border-4 border-black font-bold outline-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/50 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
              <button 
                disabled={loading}
                className="bg-green-500 text-black font-bangers text-2xl py-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-green-400 transition-all disabled:opacity-50"
              >
                {loading ? 'SENDING LINK...' : 'SIGN UP'}
              </button>
              
              <div className="relative my-4">
                <hr className="border-2 border-black" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 font-bold text-xs">OR</span>
              </div>

              <button 
                type="button"
                onClick={signInWithGoogle}
                className="bg-yellow-400 text-black font-bangers text-xl py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 transition-all"
              >
                GOOGLE (LAZY WAY) 🙄
              </button>

              <button type="button" className="font-bold underline text-sm" onClick={() => setMode('login')}>ALREADY AN EX? LOG IN.</button>
            </motion.form>
          )}

          {mode === 'verify' && (
            <motion.div 
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-4 text-center"
            >
              <div className="text-6xl mb-4 animate-bounce">📧</div>
              <p className="font-bold text-lg">CHECK YOUR INBOX!</p>
              <p className="font-bold italic text-sm text-gray-600">
                We sent a verification link to {email}. <br/>
                Click it to prove you&apos;re not a bot (or worse, a dry texter 🚩).
              </p>
              
              <button 
                onClick={checkVerification}
                disabled={loading}
                className="bg-green-500 text-black font-bangers text-2xl py-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-green-400 transition-all disabled:opacity-50 mt-4"
              >
                {loading ? 'CHECKING...' : 'I VERIFIED! LET\'S GO 🍏'}
              </button>

              <button 
                type="button" 
                disabled={loading}
                onClick={handleResend}
                className="text-sm font-bold opacity-70 hover:opacity-100 underline"
              >
                SEND LINK AGAIN (IT&apos;S NOT THERE)
              </button>
              
              <button 
                type="button" 
                className="font-bold underline text-xs" 
                onClick={() => setMode('signup')}
              >
                TYPO IN EMAIL? START OVER.
              </button>
            </motion.div>
          )}

          {mode === 'forgot' && (
            <motion.form 
              key="forgot"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleForgot} 
              className="flex flex-col gap-4"
            >
              <p className="font-bold">Enter your email and we will help you recover (it happens to the best of us... mostly red flags though). 💅</p>
              <input 
                required
                type="email" 
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-4 rounded-xl border-4 border-black font-bold outline-none"
              />
              <button 
                disabled={loading}
                className="bg-blue-500 text-white font-bangers text-2xl py-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:bg-blue-400 transition-all disabled:opacity-50"
              >
                {loading ? 'SENDING HELP...' : 'RESET PASSWORD'}
              </button>
              <button type="button" className="font-bold underline" onClick={() => setMode('login')}>NVM, I REMEMBERED</button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
