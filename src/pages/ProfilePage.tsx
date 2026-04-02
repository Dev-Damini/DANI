import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, Save, ArrowLeft,
  Sparkles, CheckCircle, Mic, MessageSquare, Palette
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

const VOICE_OPTIONS = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Warm & friendly young female', emoji: '🌸' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm & professional', emoji: '💼' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong & confident', emoji: '⚡' },
  { id: 'MF3mGyEYCl7XYWbV9V9ub', name: 'Elli', description: 'Soft & gentle', emoji: '🌙' },
];

const STYLE_OPTIONS = [
  {
    id: 'brief',
    name: 'Brief',
    description: 'Short, straight-to-the-point answers',
    emoji: '⚡',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Detailed explanations with examples and context',
    emoji: '📚',
    color: 'from-blue-400 to-indigo-600',
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Fun, imaginative, and expressive responses',
    emoji: '🎨',
    color: 'from-pink-400 to-purple-600',
  },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedVoice, setSelectedVoice] = useState(
    () => localStorage.getItem('dani-voice') || 'EXAVITQu4vr4xnSDxMaL'
  );
  const [selectedStyle, setSelectedStyle] = useState(
    () => localStorage.getItem('dani-style') || 'educational'
  );

  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/auth'); return; }
      setEmail(user.email || '');
      setUsername(user.user_metadata?.username || user.email?.split('@')[0] || '');
      setIsLoading(false);
    });
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!username.trim()) { setError('Username cannot be empty'); return; }
    setIsSaving(true); setError(''); setSuccess('');

    const updates: Record<string, unknown> = { data: { username: username.trim() } };
    if (newPassword) {
      if (newPassword.length < 6) { setError('Password must be at least 6 characters'); setIsSaving(false); return; }
      if (newPassword !== confirmPassword) { setError('Passwords do not match'); setIsSaving(false); return; }
      updates.password = newPassword;
    }

    const { error: updateError } = await supabase.auth.updateUser(updates);
    setIsSaving(false);

    if (updateError) { setError(updateError.message); return; }

    // Save preferences to localStorage
    localStorage.setItem('dani-voice', selectedVoice);
    localStorage.setItem('dani-style', selectedStyle);

    setSuccess('Profile saved! 💕');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/chat')}
            className="p-2.5 glass rounded-xl hover:bg-white/80 transition-all border border-white/30 flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <img src={daniLogo} alt="DANI" className="h-8 w-auto" />
          <h1 className="font-bold text-gray-800 text-lg">Profile Settings</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">

        {/* Account Info */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-pink-500" /> Account Info
          </h2>

          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} disabled
                className="w-full px-4 py-3 glass rounded-2xl border border-white/40 text-gray-500 text-sm bg-white/30 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Your display name"
                  className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm" />
              </div>
            </div>
          </div>
        </section>

        {/* Change Password */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-500" /> Change Password
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full pl-11 pr-11 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-11 pr-4 py-3 glass rounded-2xl border border-white/40 focus:border-pink-400 focus:outline-none text-gray-800 placeholder-gray-400 text-sm" />
              </div>
            </div>
          </div>
        </section>

        {/* Response Style */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" /> Response Style
          </h2>
          <p className="text-sm text-gray-500 mb-5">Choose how DANI responds to you</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STYLE_OPTIONS.map(style => (
              <button key={style.id} onClick={() => setSelectedStyle(style.id)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedStyle === style.id
                    ? 'border-pink-400 bg-pink-50 shadow-md'
                    : 'border-white/40 glass hover:border-pink-200'
                }`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center mb-3 text-lg`}>
                  {style.emoji}
                </div>
                <p className="font-semibold text-gray-800 text-sm">{style.name}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{style.description}</p>
                {selectedStyle === style.id && (
                  <div className="mt-2">
                    <CheckCircle className="w-4 h-4 text-pink-500" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Voice Selection */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Mic className="w-5 h-5 text-green-500" /> DANI's Voice
          </h2>
          <p className="text-sm text-gray-500 mb-5">Choose the voice DANI uses when speaking</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VOICE_OPTIONS.map(voice => (
              <button key={voice.id} onClick={() => setSelectedVoice(voice.id)}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  selectedVoice === voice.id
                    ? 'border-pink-400 bg-pink-50 shadow-md'
                    : 'border-white/40 glass hover:border-pink-200'
                }`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-lg flex-shrink-0">
                  {voice.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{voice.name}</p>
                  <p className="text-xs text-gray-500 truncate">{voice.description}</p>
                </div>
                {selectedVoice === voice.id && (
                  <CheckCircle className="w-4 h-4 text-pink-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Appearance hint */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6 opacity-60">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Palette className="w-5 h-5 text-orange-400" /> Appearance
          </h2>
          <p className="text-sm text-gray-500">Theme customization — coming soon 🌸</p>
        </section>

        {/* Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Save Button */}
        <button onClick={handleSaveProfile} disabled={isSaving}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-base hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mb-8">
          {isSaving
            ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
            : <><Save className="w-5 h-5" /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}
