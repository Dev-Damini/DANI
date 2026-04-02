import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Supabase fires SIGNED_IN with type=recovery when user clicks the link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasSession(true);
      }
    });

    // Also check existing session (in case user is already signed in via recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!password) { setError('Please enter a new password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setIsLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/chat'), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 md:p-10 border-2 border-white/30 max-w-md w-full shadow-2xl">

        <div className="text-center mb-7">
          <img src={daniLogo} alt="DANI" className="h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Reset Your Password
          </h1>
          <p className="text-sm text-gray-500 mt-1">Enter your new password below</p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-gray-700 font-semibold">Password updated! 💕</p>
            <p className="text-sm text-gray-500">Redirecting you to DANI...</p>
          </div>
        ) : !hasSession ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-gray-600 text-sm">Verifying your reset link...</p>
            <div className="flex justify-center gap-1.5">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <p className="text-xs text-gray-400">If nothing happens, try clicking the link in your email again.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-11 pr-11 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  placeholder="Re-enter new password"
                  className="w-full pl-11 pr-11 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleReset}
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Update Password</>
              )}
            </button>

            <button
              onClick={() => navigate('/auth')}
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
