import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, LogOut, Settings, Sparkles, BarChart2, FolderOpen,
  Music, Ghost, MessageCircle, ImagePlus, Mic, Users,
  Menu, X, ChevronRight, PanelLeft, Film, Moon, Sun
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';
import ChatTab from '@/components/features/ChatTab';
import ImageTab from '@/components/features/ImageTab';
import VoiceTab from '@/components/features/VoiceTab';
import WebsiteTab from '@/components/features/WebsiteTab';
import MusicTab from '@/components/features/MusicTab';
import VideoTab from '@/components/features/VideoTab';
import { useTheme } from '@/App';

const ADMIN_EMAIL = 'damibotzinc@gmail.com';
type TabId = 'chat' | 'image' | 'video' | 'voice' | 'music' | 'website';

const TABS = [
  { id: 'chat' as TabId, label: 'Chat', Icon: MessageCircle, desc: 'AI Assistant', color: 'text-pink-400' },
  { id: 'image' as TabId, label: 'Image / Edit', Icon: ImagePlus, desc: 'Generate & Edit', color: 'text-purple-400' },
  { id: 'video' as TabId, label: 'Video', Icon: Film, desc: 'AI Video Gen', color: 'text-blue-400' },
  { id: 'voice' as TabId, label: 'Voice', Icon: Mic, desc: 'Speak to DANI', color: 'text-green-400' },
  { id: 'music' as TabId, label: 'Music', Icon: Music, desc: 'AI Composer', color: 'text-cyan-400' },
  { id: 'website' as TabId, label: 'Vibe Code', Icon: Sparkles, desc: 'Build Apps', color: 'text-orange-400' },
];

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [username, setUsername] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [responseStyle] = useState<string>(() => localStorage.getItem('dani-style') || 'educational');

  useEffect(() => {
    const state = location.state as { openVibeCode?: boolean } | null;
    if (state?.openVibeCode) setActiveTab('website');
  }, [location.state]);

  useEffect(() => {
    const guestMode = localStorage.getItem('dani-guest-mode') === 'true';
    if (guestMode) {
      setIsGuest(true);
      setUsername('Guest');
      setAuthChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User');
        setUserEmail(session.user.email || null);
        setAvatarUrl(session.user.user_metadata?.avatar_url || null);
        setIsGuest(false);
      } else {
        navigate('/auth', { replace: true });
      }
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        const gm = localStorage.getItem('dani-guest-mode') === 'true';
        if (!gm) navigate('/auth', { replace: true });
      } else if (session?.user) {
        setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User');
        setUserEmail(session.user.email || null);
        setAvatarUrl(session.user.user_metadata?.avatar_url || null);
        setIsGuest(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    if (isGuest) { localStorage.removeItem('dani-guest-mode'); navigate('/', { replace: true }); }
    else { await supabase.auth.signOut(); navigate('/', { replace: true }); }
  };

  useEffect(() => {
    const handleSwitchTab = (e: CustomEvent) => setActiveTab(e.detail);
    window.addEventListener('switch-tab', handleSwitchTab as EventListener);
    return () => window.removeEventListener('switch-tab', handleSwitchTab as EventListener);
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    if (!isGuest) supabase.from('analytics_events').insert({ feature: tab }).then(() => {});
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading DANI...</p>
        </div>
      </div>
    );
  }

  const activeTabData = TABS.find(t => t.id === activeTab)!;
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex surface-0 overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── Mobile Overlay ── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`
        fixed lg:relative top-0 left-0 h-full z-50 lg:z-auto
        flex flex-col transition-all duration-300 ease-in-out
        border-r
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-[${sidebarCollapsed ? "68px" : "220px"}]'}
        ${sidebarCollapsed ? 'lg:w-[68px]' : 'w-[220px]'}
      `} style={{ background: isDark ? '#0c0c18' : '#ffffff', borderColor: 'var(--border-subtle)' }}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b flex-shrink-0 ${sidebarCollapsed ? 'justify-center' : ''}`}
          style={{ borderColor: 'var(--border-subtle)' }}>
          <img src={daniLogo} alt="DANI" className="h-7 w-auto flex-shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>DANI</p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>v2.5 Pro Suite</p>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg transition-all flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}>
            <PanelLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                title={sidebarCollapsed ? tab.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                  active ? 'nav-item-active' : ''
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                style={!active ? { color: 'var(--text-muted)' } : {}}>
                <tab.Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${active ? tab.color : ''}`} />
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: active ? 'var(--text-primary)' : undefined }}>{tab.label}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{tab.desc}</p>
                  </div>
                )}
                {active && !sidebarCollapsed && (
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0" />
                )}
              </button>
            );
          })}

          <div className="h-px my-2 mx-1" style={{ background: 'var(--border-subtle)' }} />

          <button onClick={() => navigate('/characters')}
            title={sidebarCollapsed ? 'Characters' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ color: 'var(--text-muted)' }}>
            <Users className="w-4 h-4 flex-shrink-0 group-hover:text-purple-400" />
            {!sidebarCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold truncate">Characters</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>Studio & Roleplay</p>
              </div>
            )}
          </button>
        </nav>

        {/* Bottom */}
        <div className={`flex-shrink-0 border-t p-3 space-y-1 ${sidebarCollapsed ? 'items-center flex flex-col' : ''}`}
          style={{ borderColor: 'var(--border-subtle)' }}>

          {isGuest && !sidebarCollapsed && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1"
              style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <Ghost className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              <p className="text-[11px] text-yellow-500 flex-1 truncate">Guest mode</p>
              <button onClick={() => navigate('/auth')} className="text-[10px] text-pink-400 font-bold hover:underline">
                Sign up
              </button>
            </div>
          )}

          {/* User profile row */}
          {!isGuest && !sidebarCollapsed && username && (
            <button onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:opacity-80"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-subtle)' }}>
              {/* Avatar */}
              {avatarUrl ? (
                <img src={avatarUrl} alt={username}
                  className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-white/20" />
              ) : (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  {username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{username}</p>
                {userEmail === ADMIN_EMAIL && <p className="text-[10px] text-pink-400">Admin</p>}
              </div>
            </button>
          )}

          {/* Collapsed avatar */}
          {!isGuest && sidebarCollapsed && (
            <button onClick={() => navigate('/profile')} title="Profile"
              className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 mx-auto">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  {username?.slice(0, 2).toUpperCase() || 'ME'}
                </div>
              )}
            </button>
          )}

          <div className={`flex gap-1 ${sidebarCollapsed ? 'flex-col items-center' : ''}`}>
            {/* Theme toggle */}
            <button onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}
              className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-all text-[11px] font-medium"
              style={{ color: 'var(--text-muted)' }}>
              {isDark ? <Sun className="w-3.5 h-3.5 flex-shrink-0" /> : <Moon className="w-3.5 h-3.5 flex-shrink-0" />}
              {!sidebarCollapsed && (isDark ? 'Light' : 'Dark')}
            </button>
            {!isGuest && (
              <>
                {userEmail === ADMIN_EMAIL && (
                  <button onClick={() => navigate('/analytics')} title="Analytics"
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-all text-[11px] font-medium"
                    style={{ color: 'var(--text-muted)' }}>
                    <BarChart2 className="w-3.5 h-3.5 flex-shrink-0" />
                    {!sidebarCollapsed && 'Stats'}
                  </button>
                )}
                <button onClick={() => navigate('/projects')} title="Projects"
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-all text-[11px] font-medium"
                  style={{ color: 'var(--text-muted)' }}>
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  {!sidebarCollapsed && 'Projects'}
                </button>
                <button onClick={() => navigate('/profile')} title="Settings"
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-all text-[11px] font-medium"
                  style={{ color: 'var(--text-muted)' }}>
                  <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                  {!sidebarCollapsed && 'Settings'}
                </button>
              </>
            )}
            <button onClick={() => navigate('/')} title="Home"
              className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-all text-[11px] font-medium"
              style={{ color: 'var(--text-muted)' }}>
              <Home className="w-3.5 h-3.5 flex-shrink-0" />
              {!sidebarCollapsed && 'Home'}
            </button>
            <button onClick={handleLogout} title={isGuest ? 'Exit' : 'Logout'}
              className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg transition-all text-[11px] font-medium"
              style={{ color: 'var(--text-muted)' }}>
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              {!sidebarCollapsed && 'Logout'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header */}
        <header className="lg:hidden flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
          style={{ background: isDark ? '#0c0c18' : '#ffffff', borderColor: 'var(--border-subtle)' }}>
          <button onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl border transition-all"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <img src={daniLogo} alt="DANI" className="h-7 w-auto" />
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)' }}>
            <activeTabData.Icon className={`w-4 h-4 ${activeTabData.color} flex-shrink-0`} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{activeTabData.label}</span>
          </div>
          {/* Theme toggle mobile */}
          <button onClick={toggleTheme} className="p-2 rounded-xl border transition-all"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-normal)', color: 'var(--text-secondary)' }}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {isGuest ? (
            <button onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
              Sign Up
            </button>
          ) : (
            <button onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border"
              style={{ borderColor: 'var(--border-normal)' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={username || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)' }}>
                  {username?.slice(0, 2).toUpperCase() || 'ME'}
                </div>
              )}
            </button>
          )}
        </header>

        {/* Guest banner */}
        {isGuest && (
          <div className="flex-shrink-0 flex items-center justify-center gap-3 px-4 py-2 border-b"
            style={{ background: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.1)' }}>
            <Ghost className="w-3.5 h-3.5 text-yellow-500/70" />
            <p className="text-xs text-yellow-600">Guest mode — conversations not saved.</p>
            <button onClick={() => navigate('/auth')}
              className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1">
              Create Free Account <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'chat' && <ChatTab responseStyle={responseStyle} isGuest={isGuest} username={username} />}
          {activeTab === 'image' && <ImageTab />}
          {activeTab === 'voice' && <VoiceTab />}
          {activeTab === 'video' && <VideoTab />}
          {activeTab === 'music' && <MusicTab />}
          {activeTab === 'website' && <WebsiteTab />}
        </div>
      </div>
    </div>
  );
}
