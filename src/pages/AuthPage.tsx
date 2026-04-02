import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Sparkles, X, FileText, Eye, EyeOff,
  ArrowLeft, CheckCircle, KeyRound
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

type Mode = 'login' | 'signup' | 'otp' | 'forgot' | 'forgot-sent';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');

  // Shared fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  // OTP verification
  const [otpCode, setOtpCode] = useState('');

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('');

  const resetForm = () => {
    setError('');
    setOtpCode('');
    setShowPassword(false);
  };

  const switchToLogin = () => { setMode('login'); resetForm(); };
  const switchToSignup = () => { setMode('signup'); resetForm(); };

  // ─── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please fill in all fields'); return; }
    setIsLoading(true); setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        // Resend OTP and prompt user to verify
        await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
        setIsLoading(false);
        setMode('otp');
        setError('Your email is not verified. We sent a new code — enter it below.');
        return;
      }
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Incorrect email or password'
          : signInError.message
      );
      setIsLoading(false);
      return;
    }

    if (data.session) navigate('/chat');
    setIsLoading(false);
  };

  // ─── Signup Step 1: Create account + send OTP ──────────────────────────────
  const handleSignup = async () => {
    if (!email.trim() || !username.trim() || !password) { setError('Please fill in all fields'); return; }
    if (username.trim().length < 2) { setError('Username must be at least 2 characters'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address'); return; }

    setIsLoading(true); setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { username: username.trim() },
        emailRedirectTo: undefined,
      },
    });

    setIsLoading(false);

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setError('This email is already registered. Please log in instead.');
        return;
      }
      setError(signUpError.message);
      return;
    }

    // Move to OTP step
    setMode('otp');
  };

  // ─── Signup Step 2: Verify OTP ─────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 4) { setError('Please enter the full verification code'); return; }
    setIsLoading(true); setError('');

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otpCode.trim(),
      type: 'signup',
    });

    if (verifyError) {
      // Also try 'email' type in case it's a magic link OTP
      const { data: data2, error: verifyError2 } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'email',
      });
      if (verifyError2) {
        setError('Invalid or expired code. Please check your email and try again.');
        setIsLoading(false);
        return;
      }
      if (data2.session) { navigate('/chat'); return; }
    }

    if (data?.session) {
      navigate('/chat');
      return;
    }

    // If no session but no error — try signing in with password
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setIsLoading(false);
    if (signInErr) {
      setError('Verified! Please log in with your credentials.');
      setMode('login');
      return;
    }
    if (signInData.session) navigate('/chat');
  };

  // ─── Resend OTP ────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setError('');
    await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    setError('A new code has been sent to your email 💕');
  };

  // ─── Forgot Password ───────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setError('Please enter your email'); return; }
    setIsLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: window.location.origin + '/reset-password',
    });
    setIsLoading(false);
    if (error) { setError(error.message); return; }
    setMode('forgot-sent');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 md:p-10 border-2 border-white/30 max-w-md w-full shadow-2xl">

        {/* Logo */}
        <div className="text-center mb-7">
          <img src={daniLogo} alt="DANI" className="h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {mode === 'login' ? 'Welcome back 💕' :
             mode === 'signup' ? 'Join DANI' :
             mode === 'otp' ? 'Verify Your Email' :
             mode === 'forgot' ? 'Reset Password' :
             'Check Your Inbox'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Log in to continue your conversations' :
             mode === 'signup' ? 'Create your account to get started' :
             mode === 'otp' ? `We sent a 4-digit code to ${email}` :
             mode === 'forgot' ? "We'll send a reset link to your email" :
             'Reset link sent — check your inbox'}
          </p>
        </div>

        {/* ── Login / Signup Toggle ── */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="flex bg-white/50 rounded-2xl p-1 mb-6 border border-white/40">
            <button onClick={switchToLogin}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${mode === 'login' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
              Log In
            </button>
            <button onClick={switchToSignup}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${mode === 'signup' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
              Sign Up
            </button>
          </div>
        )}

        {/* ── OTP Verification ── */}
        {mode === 'otp' && (
          <div className="space-y-5">
            <div className="bg-pink-50 border border-pink-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <KeyRound className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-pink-700">Enter the 4-digit code sent to your email. Check your spam folder if you don't see it.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                placeholder="Enter code"
                className="w-full px-5 py-4 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-2xl tracking-widest text-center font-bold"
              />
            </div>

            {error && (
              <div className={`border rounded-2xl px-4 py-3 ${error.includes('sent') || error.includes('💕') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm ${error.includes('sent') || error.includes('💕') ? 'text-green-700' : 'text-red-600'}`}>{error}</p>
              </div>
            )}

            <button onClick={handleVerifyOtp} disabled={isLoading || otpCode.length < 4}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                : <><CheckCircle className="w-5 h-5" /> Verify & Continue</>}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button onClick={handleResendOtp} className="text-pink-600 font-semibold hover:underline">
                Resend code
              </button>
              <button onClick={() => { setMode('login'); resetForm(); }} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            </div>
          </div>
        )}

        {/* ── Forgot Password ── */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={forgotEmail}
                  onChange={e => { setForgotEmail(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm" />
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            <button onClick={handleForgotPassword} disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</> : <><Sparkles className="w-5 h-5" /> Send Reset Link</>}
            </button>
            <button onClick={switchToLogin} className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 py-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </button>
          </div>
        )}

        {/* ── Forgot Sent ── */}
        {mode === 'forgot-sent' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-gray-700 font-semibold">Reset email sent! 💕</p>
            <p className="text-sm text-gray-500">Check your inbox and click the link to reset your password.</p>
            <button onClick={switchToLogin} className="text-pink-600 font-semibold text-sm hover:underline">Back to Login</button>
          </div>
        )}

        {/* ── Login / Signup Form ── */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm" />
              </div>
            </div>

            {/* Username (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={username}
                    onChange={e => { setUsername(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSignup()}
                    placeholder="Your display name"
                    className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm" />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                  className="w-full pl-11 pr-11 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot link */}
            {mode === 'login' && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => { setMode('forgot'); setForgotEmail(email); resetForm(); }}
                  className="text-xs text-pink-600 font-semibold hover:underline">
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
            <button onClick={mode === 'login' ? handleLogin : handleSignup} disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
              {isLoading
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{mode === 'login' ? 'Logging in...' : 'Creating account...'}</>
                : <><Sparkles className="w-5 h-5" />{mode === 'login' ? 'Log In' : 'Create Account'}</>}
            </button>

            {/* Terms note */}
            {mode === 'signup' && (
              <p className="text-xs text-gray-500 text-center">
                By signing up you agree to our{' '}
                <button type="button" onClick={() => setShowTerms(true)}
                  className="text-pink-600 font-semibold hover:underline">
                  Terms of Service
                </button>
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        {mode !== 'otp' && (
          <div className="mt-6 text-center border-t border-white/30 pt-5">
            <p className="text-xs text-gray-500">
              Created by <span className="text-pink-600 font-semibold">Damini Codesphere</span>
              {' · '}Inspired by <span className="text-purple-600 font-semibold">Daniella</span>
            </p>
          </div>
        )}
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
              <button onClick={() => setShowTerms(false)}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold transition-all">
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
