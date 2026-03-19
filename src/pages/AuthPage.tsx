import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, X, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

export default function AuthPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);



  const handleCreateAccount = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the Terms of Service to continue');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Creating account...');

      // Create account via Edge Function
      const { data, error } = await supabase.functions.invoke('signup', {
        body: { password }
      });

      console.log('Signup response:', { data, error });

      if (error) {
        console.error('Signup function error:', error);
        setError('Unable to create account. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data && data.session) {
        console.log('Account created successfully, logging in...');
        navigate('/chat');
      } else {
        setError('Account created but unable to log in automatically. Please refresh the page.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };



  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateAccount();
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-8 md:p-12 border-2 border-white/30 max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={daniLogo} alt="DANI" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Get Started
          </h1>
          <p className="text-gray-600">
            Create your account in seconds
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
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

          {/* Terms of Service */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 accent-pink-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-pink-600 font-semibold hover:text-pink-700 underline"
              >
                Terms of Service
              </button>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleCreateAccount}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Create Account
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

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-3xl p-8 border-2 border-white/30 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <FileText className="w-6 h-6 text-pink-600" />
                Terms of Service
              </h2>
              <button
                onClick={() => setShowTerms(false)}
                className="p-2 hover:bg-white/60 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
              <p className="text-sm">
                <strong>Last Updated:</strong> March 19, 2026
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">1. Acceptance of Terms</h3>
              <p>
                By using DANI, you agree to these Terms of Service. If you do not agree, please do not use our service.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">2. Description of Service</h3>
              <p>
                DANI is an AI assistant providing chat, image generation, voice interaction, and website creation features. We strive to provide accurate and helpful responses, but results may vary.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">3. User Responsibilities</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least 13 years old to use DANI</li>
                <li>Keep your password secure and confidential</li>
                <li>Do not use DANI for illegal or harmful purposes</li>
                <li>Do not attempt to abuse, hack, or disrupt our service</li>
                <li>Respect intellectual property rights in generated content</li>
              </ul>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">4. Content and Privacy</h3>
              <p>
                Generated images, websites, and conversations are processed through our AI systems. We do not claim ownership of your content, but we may process it to provide our services. Please do not share sensitive personal information.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">5. Limitations of Liability</h3>
              <p>
                DANI is provided "as is" without warranties. We are not liable for any damages resulting from use of our service, including but not limited to AI-generated content errors or service interruptions.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">6. Changes to Terms</h3>
              <p>
                We may update these terms at any time. Continued use of DANI after changes constitutes acceptance of new terms.
              </p>
              
              <h3 className="text-lg font-bold text-gray-800 mt-6">7. Contact</h3>
              <p>
                For questions or concerns, please contact: <strong>contact@damicodesphere.com</strong>
              </p>
            </div>
            
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTerms(false);
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg"
              >
                Accept Terms
              </button>
              <button
                onClick={() => setShowTerms(false)}
                className="px-6 py-3 glass rounded-2xl font-medium text-gray-700 hover:bg-white/60 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
