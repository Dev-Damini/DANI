import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, Save, ArrowLeft,
  Sparkles, CheckCircle, Mic, MessageSquare, Palette,
  Camera, Upload, Brain, ChevronRight, Wand2, Stars,
  Loader2, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

const VOICE_OPTIONS = [
  { id: 'beatrice', name: 'Beatrice', description: 'DANI\'s signature warm voice', emoji: '🌸', isDefault: true },
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

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const AvatarPlaceholderSVG = ({ name }: { name: string }) => {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" fill="url(#avatarGrad)" />
      <text x="40" y="50" textAnchor="middle" fontSize="28" fontWeight="700" fill="white" fontFamily="system-ui">
        {initials}
      </text>
    </svg>
  );
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] = useState(
    () => localStorage.getItem('dani-style') || 'educational'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate('/auth'); return; }
      setEmail(user.email || '');
      setUsername(user.user_metadata?.username || user.email?.split('@')[0] || '');
      setAvatarUrl(user.user_metadata?.avatar_url || null);
      setIsLoading(false);
    });
  }, [navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return; }

    setIsUploadingAvatar(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName);
      const avatarWithTs = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarWithTs }
      });
      if (updateError) throw updateError;

      setAvatarUrl(avatarWithTs);
      setSuccess('Profile picture updated! 💕');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

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

        {/* ── Profile Picture Section ── */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Camera className="w-5 h-5 text-pink-500" /> Profile Picture
          </h2>

          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/50 shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <AvatarPlaceholderSVG name={username || 'DA'} />
                )}
              </div>
              {isUploadingAvatar && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm mb-1">{username}</p>
              <p className="text-xs text-gray-400 mb-3">JPG, PNG or WebP · Max 2MB</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-sm font-semibold shadow-md hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </button>
                {avatarUrl && (
                  <button
                    onClick={async () => {
                      await supabase.auth.updateUser({ data: { avatar_url: null } });
                      setAvatarUrl(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 glass border border-white/40 text-gray-600 rounded-xl text-sm font-semibold hover:bg-white/80 transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Account Info ── */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-pink-500" /> Account Info
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} disabled
                className="w-full px-4 py-3 glass rounded-2xl border border-white/40 text-gray-500 text-sm bg-white/30 cursor-not-allowed" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

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

        {/* ── Change Password ── */}
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

        {/* ── Response Style ── */}
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

        {/* ── DANI's Voice ── */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Mic className="w-5 h-5 text-green-500" /> DANI's Voice
          </h2>
          <p className="text-sm text-gray-500 mb-5">DANI speaks with her signature Beatrice voice</p>
          <div className="flex items-center gap-4 p-4 glass rounded-2xl border-2 border-pink-300/50 bg-pink-50/50">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
              {/* SVG mic icon */}
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-none stroke-current stroke-2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">Beatrice</p>
              <p className="text-xs text-gray-500">DANI's signature warm & expressive voice</p>
            </div>
            <CheckCircle className="w-5 h-5 text-pink-500 flex-shrink-0" />
          </div>
        </section>

        {/* ── AI Character Studio (Coming Soon) ── */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6 relative overflow-hidden">
          {/* Coming soon overlay */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 rounded-3xl flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-bold text-sm shadow-lg mb-2">
                <Stars className="w-4 h-4" />
                Coming Soon
              </div>
              <p className="text-xs text-gray-500">Character Studio is in development</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Character Studio</span>
          </h2>
          <p className="text-sm text-gray-500 mb-5">Create custom AI personas that DANI can roleplay as</p>

          {/* Preview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
            {[
              {
                name: 'Luna',
                role: 'Mystical storyteller',
                desc: 'Ancient wisdom, poetic speech, answers in riddles and metaphors',
                grad: 'from-indigo-400 to-purple-500',
                emoji: '🌙',
              },
              {
                name: 'Spark',
                role: 'Hype coach',
                desc: 'High energy, motivational, always pumping you up to achieve more',
                grad: 'from-yellow-400 to-orange-500',
                emoji: '⚡',
              },
            ].map(char => (
              <div key={char.name} className="flex items-start gap-3 p-4 glass rounded-2xl border border-white/40">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${char.grad} flex items-center justify-center text-lg flex-shrink-0`}>
                  {char.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">{char.name}</p>
                  <p className="text-[11px] font-semibold text-purple-500 mb-0.5">{char.role}</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">{char.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button disabled className="w-full mt-4 flex items-center justify-center gap-2 py-3 glass border border-white/40 text-gray-400 rounded-2xl text-sm font-semibold cursor-not-allowed opacity-60">
            <Wand2 className="w-4 h-4" /> Create New Character
          </button>

          <div className="mt-3 text-center">
            <p className="text-xs text-gray-400">
              Character Studio lets you craft custom personas — from a Shakespearean bard to a ruthless debate coach — and chat with DANI as that character. She'll fully embody their voice, tone, and worldview. 🌸
            </p>
          </div>
        </section>

        {/* ── Appearance ── */}
        <section className="glass rounded-3xl p-6 border border-white/30 mb-6 opacity-60">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Palette className="w-5 h-5 text-orange-400" /> Appearance
          </h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Theme customization — coming soon 🌸</p>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
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
