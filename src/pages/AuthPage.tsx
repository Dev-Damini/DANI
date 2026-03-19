import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

export default function AuthPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedId, setGeneratedId] = useState('');

  const generateUserId = () => {
    const randomNum = Math.floor(Math.random() * 9000000) + 1000000; // 7-digit number
    return `#${randomNum}`;
  };

  const handleCreateAccount = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Generate unique ID
      const newUserId = generateUserId();
      const email = `${newUserId}@dani.app`; // Create fake email for Supabase

      console.log('Creating account with ID:', newUserId);

      // Create account with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: newUserId,
            display_id: newUserId
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Show generated ID to user
        setGeneratedId(newUserId);
        
        // Auto-login after signup
        setTimeout(() => {
          navigate('/chat');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!userId || !password) {
      setError('Please enter your ID and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const email = `${userId}@dani.app`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        navigate('/chat');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Invalid ID or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isLogin) {
        handleLogin();
      } else {
        handleCreateAccount();
      }
    }
  };

  if (generatedId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-12 border-2 border-white/30 max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Account Created! 🎉
          </h2>
          
          <p className="text-gray-700 mb-6">
            Save your ID to log in next time:
          </p>
          
          <div className="bg-white/60 rounded-2xl p-4 border-2 border-pink-300 mb-6">
            <p className="text-xs text-gray-500 mb-1">Your ID:</p>
            <p className="text-lg font-mono font-bold text-gray-800 break-all">
              {generatedId}
            </p>
          </div>
          
          <p className="text-sm text-gray-600">
            Redirecting you to DANI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 md:p-12 border-2 border-white/30 max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={daniLogo} alt="DANI" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {isLogin ? 'Welcome Back!' : 'Get Started'}
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Log in with your ID and password' : 'Create your account with just a password'}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 bg-white/60 p-1.5 rounded-full mb-6">
          <button
            onClick={() => {
              setIsLogin(false);
              setError('');
              setUserId('');
            }}
            className={`flex-1 px-4 py-2 rounded-full font-medium transition-all ${
              !isLogin
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-1" />
            Sign Up
          </button>
          <button
            onClick={() => {
              setIsLogin(true);
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            className={`flex-1 px-4 py-2 rounded-full font-medium transition-all ${
              isLogin
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-1" />
            Log In
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="#1234567"
                className="w-full px-4 py-3 glass rounded-2xl border-2 border-white/30 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 font-mono text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your password"
                className="w-full pl-12 pr-4 py-3 glass rounded-2xl border-2 border-white/30 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Confirm your password"
                  className="w-full pl-12 pr-4 py-3 glass rounded-2xl border-2 border-white/30 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!isLogin && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-3">
              <p className="text-xs text-purple-700">
                💡 A unique ID will be generated for you. Save it to log in later!
              </p>
            </div>
          )}

          <button
            onClick={isLogin ? handleLogin : handleCreateAccount}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isLogin ? 'Logging in...' : 'Creating...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {isLogin ? 'Log In' : 'Create Account'}
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Created by Damini Codesphere 💕
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Sponsored by Daniella
          </p>
        </div>
      </div>
    </div>
  );
}
