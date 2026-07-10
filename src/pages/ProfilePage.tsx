import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, Save, ArrowLeft,
  CheckCircle, Mic, MessageSquare, Camera,
  Upload, Brain, ChevronRight, Stars,
  Loader2, X, Plus, Trash2, Moon, Sun,
  Zap, Bot
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';
import { useTheme } from '@/App';

const STYLE_OPTIONS = [
  { id: 'brief', name: 'Brief', description: 'Short, straight-to-the-point answers', emoji: '⚡', color: 'from-yellow-400 to-orange-500' },
  { id: 'educational', name: 'Educational', description: 'Detailed explanations with examples', emoji: '📚', color: 'from-blue-400 to-indigo-600' },
  { id: 'creative', name: 'Creative', description: 'Fun, imaginative, expressive responses', emoji: '🎨', color: 'from-pink-400 to-purple-600' },
];

interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  emoji: string;
  color: string;
}

const DEFAULT_CHARACTERS: Character[] = [
  { id: 'luna', name: 'Luna', role: 'Mystical Storyteller', description: 'Ancient wisdom, poetic speech, answers in riddles and metaphors.', emoji: '🌙', color: 'from-indigo-400 to-purple-500' },
  { id: 'spark', name: 'Spark', role: 'Hype Coach', description: 'High energy, motivational, always pumping you up.', emoji: '⚡', color: 'from-yellow-400 to-orange-500' },
  { id: 'sage', name: 'Sage', role: 'Philosopher', description: 'Deep thinker, Socratic questions, explores meaning.', emoji: '🧠', color: 'from-teal-400 to-cyan-500' },
  { id: 'nova', name: 'Nova', role: 'Sci-fi Expert', description: 'Space-obsessed AI from the future.', emoji: '🚀', color: 'from-blue-400 to-indigo-500' },
];

// WhatsApp SVG icon
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-green-500">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ProfilePage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

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
  const [selectedStyle, setSelectedStyle] = useState(() => localStorage.getItem('dani-style') || 'educational');

  const [characters, setCharacters] = useState<Character[]>(() => {
    try { return JSON.parse(localStorage.getItem('dani-characters') || 'null') || DEFAULT_CHARACTERS; } catch { return DEFAULT_CHARACTERS; }
  });
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(() => localStorage.getItem('dani-active-character'));
  const [showNewCharForm, setShowNewCharForm] = useState(false);
  const [newChar, setNewChar] = useState({ name: '', role: '', description: '', emoji: '✨', color: 'from-pink-400 to-purple-500' });

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

  const saveCharacters = (chars: Character[]) => {
    setCharacters(chars);
    localStorage.setItem('dani-characters', JSON.stringify(chars));
  };

  const activateCharacter = (id: string | null) => {
    setActiveCharacterId(id);
    if (id) localStorage.setItem('dani-active-character', id);
    else localStorage.removeItem('dani-active-character');
  };

  const addCharacter = () => {
    if (!newChar.name.trim() || !newChar.description.trim()) return;
    saveCharacters([...characters, { id: Date.now().toString(), ...newChar }]);
    setNewChar({ name: '', role: '', description: '', emoji: '✨', color: 'from-pink-400 to-purple-500' });
    setShowNewCharForm(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return; }
    setIsUploadingAvatar(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(fileName);
      const avatarWithTs = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: avatarWithTs } });
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
    setNewPassword(''); setConfirmPassword('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
  };

  const inputStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.95)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
    color: 'var(--text-primary)',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen surface-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: isDark ? 'rgba(7,7,15,0.9)' : 'rgba(255,255,255,0.9)', borderColor: 'var(--border-subtle)', backdropFilter: 'blur(20px)' }}>
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/chat')}
            className="p-2.5 rounded-xl hover:opacity-80 transition-all border flex-shrink-0"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={daniLogo} alt="DANI" className="h-8 w-auto" />
          <h1 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <div className="ml-auto">
            <button onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">

        {/* Profile Picture */}
        <section className="rounded-3xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Camera className="w-5 h-5 text-pink-500" /> Profile Picture
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2"
                style={{ borderColor: 'var(--border-normal)' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-black text-white"
                    style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                    {username.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              {isUploadingAvatar && (
                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{username}</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>JPG, PNG or WebP · Max 2MB</p>
              <div className="flex gap-2 flex-wrap">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold shadow-md transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </button>
                {avatarUrl && (
                  <button onClick={async () => { await supabase.auth.updateUser({ data: { avatar_url: null } }); setAvatarUrl(null); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border"
                    style={{ borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Account Info */}
        <section className="rounded-3xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User className="w-5 h-5 text-pink-500" /> Account Info
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input type="email" value={email} disabled
                className="w-full px-4 py-3 rounded-2xl text-sm opacity-50 cursor-not-allowed"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400/30 text-sm"
                  style={inputStyle} />
              </div>
            </div>
          </div>
        </section>

        {/* Change Password */}
        <section className="rounded-3xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Lock className="w-5 h-5 text-purple-500" /> Change Password
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type={showPassword ? 'text' : 'password'} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current"
                  className="w-full pl-11 pr-11 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400/30 text-sm"
                  style={inputStyle} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400/30 text-sm"
                  style={inputStyle} />
              </div>
            </div>
          </div>
        </section>

        {/* Response Style */}
        <section className="rounded-3xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <MessageSquare className="w-5 h-5 text-blue-500" /> Response Style
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Choose how DANI responds to you</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STYLE_OPTIONS.map(style => (
              <button key={style.id} onClick={() => setSelectedStyle(style.id)}
                className="p-4 rounded-2xl border-2 text-left transition-all"
                style={{
                  borderColor: selectedStyle === style.id ? '#ec4899' : 'var(--border-normal)',
                  background: selectedStyle === style.id ? 'rgba(236,72,153,0.08)' : 'var(--glass-bg)',
                }}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center mb-3 text-lg`}>{style.emoji}</div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{style.name}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{style.description}</p>
                {selectedStyle === style.id && <CheckCircle className="w-4 h-4 text-pink-500 mt-2" />}
              </button>
            ))}
          </div>
        </section>

        {/* DANI's Voice */}
        <section className="rounded-3xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Mic className="w-5 h-5 text-green-500" /> DANI's Voice
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Female voice powered by ElevenLabs</p>
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-pink-400/30"
            style={{ background: 'rgba(236,72,153,0.05)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Rachel — ElevenLabs</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Natural, warm female voice · Turbo quality</p>
            </div>
            <CheckCircle className="w-5 h-5 text-pink-500 flex-shrink-0" />
          </div>
        </section>

        {/* DANI Superagent (Coming Soon) */}
        <section className="rounded-3xl p-6 mb-6 relative overflow-hidden" style={cardStyle}>
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)' }} />
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Bot className="w-5 h-5 text-green-500" /> DANI Superagent
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Chat with DANI directly on WhatsApp</p>
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2"
            style={{ borderColor: 'rgba(37,211,102,0.3)', background: 'rgba(37,211,102,0.05)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#25d366' }}>
              <WhatsAppIcon />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>WhatsApp Integration</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>DANI on your phone, anytime, anywhere</p>
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.3)' }}>
              Coming Soon
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.15)' }}>
            <Zap className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Full DANI capabilities · Image gen · Voice · Vibe Code — all in WhatsApp
            </p>
          </div>
        </section>

        {/* Appearance / Theme */}
        <section className="rounded-3xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
            Appearance
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Choose your preferred theme</p>
          <div className="flex gap-3">
            {(['dark', 'light'] as const).map(t => (
              <button key={t} onClick={() => t !== theme && toggleTheme()}
                className="flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all"
                style={{
                  borderColor: theme === t ? '#ec4899' : 'var(--border-normal)',
                  background: theme === t ? 'rgba(236,72,153,0.08)' : 'var(--glass-bg)',
                }}>
                {t === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                <div className="text-left">
                  <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{t} Mode</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t === 'dark' ? 'Easy on the eyes' : 'Bright & clear'}</p>
                </div>
                {theme === t && <CheckCircle className="w-4 h-4 text-pink-500 ml-auto" />}
              </button>
            ))}
          </div>
        </section>

        {/* Character Studio */}
        <section className="rounded-3xl p-6 mb-6" style={cardStyle}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Brain className="w-5 h-5 text-purple-500" />
              <span className="shimmer-text">Character Studio</span>
            </h2>
            <div className="flex items-center gap-2">
              {activeCharacterId && (
                <button onClick={() => activateCharacter(null)}
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  Deactivate
                </button>
              )}
              <button onClick={() => setShowNewCharForm(true)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                <Plus className="w-3.5 h-3.5" /> Create
              </button>
            </div>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Give DANI a custom persona for roleplay 🌸</p>

          {activeCharacterId && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
              <Stars className="w-4 h-4 text-pink-500" />
              <p className="text-xs font-semibold text-pink-600">
                Active: {characters.find(c => c.id === activeCharacterId)?.name || 'Unknown'}
              </p>
            </div>
          )}

          {showNewCharForm && (
            <div className="mb-4 p-4 rounded-2xl border space-y-3 animate-fade-in"
              style={{ background: 'var(--glass-bg)', borderColor: 'rgba(236,72,153,0.2)' }}>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New Character</p>
              <div className="grid grid-cols-2 gap-3">
                <input value={newChar.emoji} onChange={e => setNewChar(p => ({ ...p, emoji: e.target.value }))}
                  placeholder="✨" maxLength={2}
                  className="px-3 py-2 rounded-xl text-center text-2xl focus:outline-none"
                  style={inputStyle} />
                <input value={newChar.name} onChange={e => setNewChar(p => ({ ...p, name: e.target.value }))}
                  placeholder="Name" className="px-3 py-2 rounded-xl text-sm focus:outline-none" style={inputStyle} />
              </div>
              <input value={newChar.role} onChange={e => setNewChar(p => ({ ...p, role: e.target.value }))}
                placeholder="Role (e.g. Mystical Storyteller)"
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none" style={inputStyle} />
              <textarea value={newChar.description} onChange={e => setNewChar(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe how they speak and behave..." rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none resize-none" style={inputStyle} />
              <div className="flex gap-2">
                <button onClick={addCharacter} disabled={!newChar.name.trim() || !newChar.description.trim()}
                  className="flex-1 py-2 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>Add Character</button>
                <button onClick={() => setShowNewCharForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border"
                  style={{ borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {characters.map(char => {
              const isActive = activeCharacterId === char.id;
              return (
                <div key={char.id}
                  className="relative flex items-start gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer"
                  style={{
                    borderColor: isActive ? '#ec4899' : 'var(--border-normal)',
                    background: isActive ? 'rgba(236,72,153,0.06)' : 'var(--glass-bg)',
                  }}
                  onClick={() => activateCharacter(isActive ? null : char.id)}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${char.color} flex items-center justify-center text-xl flex-shrink-0 shadow-md`}>
                    {char.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{char.name}</p>
                      {isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: '#ec4899' }}>Active</span>}
                    </div>
                    <p className="text-[11px] font-semibold text-purple-500 mb-0.5">{char.role}</p>
                    <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{char.description}</p>
                  </div>
                  {!DEFAULT_CHARACTERS.find(d => d.id === char.id) && (
                    <button onClick={e => { e.stopPropagation(); saveCharacters(characters.filter(c => c.id !== char.id)); if (activeCharacterId === char.id) activateCharacter(null); }}
                      className="absolute top-2 right-2 p-1 rounded-lg hover:text-red-400 transition-all"
                      style={{ color: 'var(--text-muted)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isActive && <div className="absolute top-2 right-2"><CheckCircle className="w-4 h-4 text-pink-500" /></div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Privacy */}
        <section className="rounded-3xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /> Privacy & Legal
          </h2>
          <div className="space-y-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Privacy Policy — Updated June 9, 2026</p>
            <p>DANI by Damini Codesphere collects: account information, conversation history, generated content, usage analytics, and credit transactions. All data is stored securely. We do not sell your data. You may request deletion at any time.</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>By using DANI, you agree to these terms. AI responses may occasionally be inaccurate.</p>
          </div>
        </section>

        {/* Feedback */}
        {error && (
          <div className="rounded-2xl px-4 py-3 mb-4 border"
            style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-2xl px-4 py-3 mb-4 border flex items-center gap-2"
            style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)' }}>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <button onClick={handleSaveProfile} disabled={isSaving}
          className="w-full py-4 text-white rounded-2xl font-bold text-base transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mb-8"
          style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
          {isSaving ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><Save className="w-5 h-5" />Save Changes</>}
        </button>
      </div>
    </div>
  );
}
