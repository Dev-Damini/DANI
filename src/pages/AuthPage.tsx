import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Sparkles, X, FileText, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import daniLogo from '@/assets/dani-logo.png';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const resetForm = () => {
    setEmail(''); setUsername(''); setPassword(''); setError(''); setShowPassword(false);
    setForgotEmail(''); setForgotError(''); setForgotSent(false);
  };

  const switchMode = (m: Mode) => { setMode(m); resetForm(); };

  // ─── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please fill in all fields'); return; }
    setIsLoading(true); setError('');
    try {
      let { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      // Auto-fix: if email not confirmed, confirm silently and retry
      if (error && error.message.toLowerCase().includes('email not confirmed')) {
        console.log('Email not confirmed — auto-confirming...');
        await supabase.functions.invoke('signup', { body: { email: email.trim(), confirmOnly: true } });
        await new Promise(r => setTimeout(r, 400));
        const retry = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        data = retry.data; error = retry.error;
      }

      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password' : error.message);
        setIsLoading(false); return;
      }
      if (data.session) navigate('/chat');
    } catch (err: any) {
      setError(err.message || 'Login failed'); setIsLoading(false);
    }
  };

  // ─── Forgot Password ──────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setForgotError('Please enter your email'); return; }
    setForgotLoading(true); setForgotError('');
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: window.location.origin + '/reset-password',
    });
    setForgotLoading(false);
    if (error) { setForgotError(error.message); return; }
    setForgotSent(true);
  };

  // ─── Signup ───────────────────────────────────────────────────────────────
  const handleSignup = async () => {
    if (!email.trim() || !username.trim() || !password) { setError('Please fill in all fields'); return; }
    if (username.trim().length < 2) { setError('Username must be at least 2 characters'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address'); return; }

    setIsLoading(true); setError('');
    try {
      const { data, error } = await supabase.functions.invoke('signup', {
        body: { email: email.trim(), username: username.trim(), password }
      });

      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const text = await error.context?.text(); if (text) { const p = JSON.parse(text); msg = p.error || msg; } } catch { /* ignore */ }
        }
        setError(msg); setIsLoading(false); return;
      }

      if (data?.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionError) { setError('Account created! Please log in.'); setIsLoading(false); switchMode('login'); return; }
        navigate('/chat');
      } else {
        setError('Account created! Please log in.'); setIsLoading(false); switchMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed'); setIsLoading(false);
    }
  };

  const handleSubmit = () => mode === 'login' ? handleLogin() : mode === 'signup' ? handleSignup() : handleForgotPassword();
  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit(); };

  const cardTitle = mode === 'login' ? 'Welcome back 💕' : mode === 'signup' ? 'Join DANI' : 'Reset Password';
  const cardSub = mode === 'login' ? 'Log in to continue your conversations' : mode === 'signup' ? 'Create your account to get started' : 'We\'ll send a reset link to your email';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 md:p-10 border-2 border-white/30 max-w-md w-full shadow-2xl">

        {/* Logo */}
        <div className="text-center mb-7">
          <img src={daniLogo} alt="DANI" className="h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {cardTitle}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{cardSub}</p>
        </div>

        {/* Mode Toggle (only for login/signup) */}
        {mode !== 'forgot' && (
          <div className="flex bg-white/50 rounded-2xl p-1 mb-6 border border-white/40">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${mode === 'login' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >Log In</button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${mode === 'signup' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >Sign Up</button>
          </div>
        )}

        {/* ── Forgot Password form ── */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {forgotSent ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-gray-700 font-semibold">Reset email sent! 💕</p>
                <p className="text-sm text-gray-500">Check your inbox and click the link to reset your password.</p>
                <button onClick={() => switchMode('login')} className="text-pink-600 font-semibold text-sm hover:underline">
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleForgotPassword()}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
                    />
                  </div>
                </div>
                {forgotError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    <p className="text-sm text-red-600">{forgotError}</p>
                  </div>
                )}
                <button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {forgotLoading
                    ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                    : <><Sparkles className="w-5 h-5" /> Send Reset Link</>}
                </button>
                <button onClick={() => switchMode('login')} className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Login / Signup form ── */}
        {mode !== 'forgot' && (
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyPress={handleKeyPress}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
                />
              </div>
            </div>

            {/* Username (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={username} onChange={e => setUsername(e.target.value)} onKeyPress={handleKeyPress}
                    placeholder="Your display name"
                    className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} onKeyPress={handleKeyPress}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                  className="w-full pl-11 pr-11 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password link (login only) */}
            {mode === 'login' && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-pink-600 font-semibold hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit} disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{mode === 'login' ? 'Logging in...' : 'Creating account...'}</>
                : <><Sparkles className="w-5 h-5" />{mode === 'login' ? 'Log In' : 'Create Account'}</>}
            </button>

            {/* Terms note for signup */}
            {mode === 'signup' && (
              <p className="text-xs text-gray-500 text-center">
                By signing up you agree to our{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-pink-600 font-semibold hover:underline">
                  Terms of Service
                </button>
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center border-t border-white/30 pt-5">
          <p className="text-xs text-gray-500">
            Created by <span className="text-pink-600 font-semibold">Damini Codesphere</span>
            {' · '}Inspired by <span className="text-purple-600 font-semibold">Daniella</span>
          </p>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-3xl p-8 border-2 border-white/30 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-600" /> Terms of Service
              </h2>
              <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-white/60 rounded-full transition-all">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="text-gray-700 space-y-4 text-sm leading-relaxed">
              <p><strong>Last Updated:</strong> April 2, 2026</p>
              <h3 className="font-bold text-base mt-4">1. Acceptance of Terms</h3>
              <p>By using DANI, you agree to these Terms of Service.</p>
              <h3 className="font-bold text-base mt-4">2. Description of Service</h3>
              <p>DANI is an AI assistant providing chat, image generation, voice interaction, and website creation features.</p>
              <h3 className="font-bold text-base mt-4">3. User Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>You must be at least 13 years old to use DANI</li>
                <li>Keep your password secure and confidential</li>
                <li>Do not use DANI for illegal or harmful purposes</li>
                <li>Respect intellectual property rights in generated content</li>
              </ul>
              <h3 className="font-bold text-base mt-4">4. Privacy</h3>
              <p>We process your data to provide our services. Please do not share sensitive personal information in chats.</p>
              <h3 className="font-bold text-base mt-4">5. Limitations of Liability</h3>
              <p>DANI is provided "as is" without warranties. We are not liable for AI-generated content errors or service interruptions.</p>
              <h3 className="font-bold text-base mt-4">6. Contact</h3>
              <p>Questions? <strong>contact@damicodesphere.com</strong></p>
            </div>
            <div className="mt-6">
              <button onClick={() => setShowTerms(false)} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold transition-all">
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
