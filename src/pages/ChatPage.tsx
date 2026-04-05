import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, LogOut, User, Settings, Sparkles, BarChart2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';
import ChatTab from '@/components/features/ChatTab';
import ImageTab from '@/components/features/ImageTab';
import VoiceTab from '@/components/features/VoiceTab';
import WebsiteTab from '@/components/features/WebsiteTab';

const ADMIN_EMAIL = 'damibotzinc@gmail.com';

export default function ChatPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'voice' | 'website'>('chat');
  const [username, setUsername] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [responseStyle] = useState<string>(
    () => localStorage.getItem('dani-style') || 'educational'
  );

  useEffect(() => {
    // Check existing session first (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User');
        setUserEmail(session.user.email || null);
      } else {
        // No session — redirect to auth
        navigate('/auth', { replace: true });
      }
      setAuthChecked(true);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth', { replace: true });
      } else if (session?.user) {
        setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User');
        setUserEmail(session.user.email || null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const handleSwitchTab = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switch-tab', handleSwitchTab as EventListener);
    return () => window.removeEventListener('switch-tab', handleSwitchTab as EventListener);
  }, []);

  // Track tab switch for analytics
  const handleTabChange = async (tab: 'chat' | 'image' | 'voice' | 'website') => {
    setActiveTab(tab);
    // Fire-and-forget analytics event
    const featureMap = { chat: 'chat', image: 'image', voice: 'voice', website: 'website' };
    supabase.from('analytics_events').insert({ feature: featureMap[tab] }).then(() => {});
  };

  // Don't render until auth is verified (prevents flash)
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading DANI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={daniLogo} alt="DANI" className="h-8 w-auto" />
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 bg-white/60 backdrop-blur-sm p-1.5 rounded-full border border-pink-200">
            {(['chat', 'image', 'voice', 'website'] as const).map(tab => (
              <button key={tab} onClick={() => handleTabChange(tab)}
                className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-all text-sm ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800'
                }`}>
                {tab === 'website' ? <><Sparkles className="w-4 h-4 inline mr-1" />Vibe Code</> : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {username && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 glass rounded-full border border-white/30">
                <User className="w-4 h-4 text-pink-500" />
                <span className="text-sm font-medium text-gray-700">{username}</span>
              </div>
            )}
            {userEmail === ADMIN_EMAIL && (
              <button onClick={() => navigate('/analytics')}
                className="p-2.5 glass rounded-full hover:bg-purple-50 transition-all border border-white/30"
                title="Analytics">
                <BarChart2 className="w-5 h-5 text-purple-600" />
              </button>
            )}
            <button onClick={() => navigate('/profile')}
              className="p-2.5 glass rounded-full hover:bg-white/80 transition-all border border-white/30"
              title="Profile & Settings">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={() => navigate('/')}
              className="p-2.5 glass rounded-full hover:bg-white/80 transition-all border border-white/30">
              <Home className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={handleLogout}
              className="p-2.5 glass rounded-full hover:bg-red-50 transition-all border border-white/30"
              title="Log out">
              <LogOut className="w-5 h-5 text-gray-500 hover:text-red-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' && <ChatTab responseStyle={responseStyle} />}
        {activeTab === 'image' && <ImageTab />}
        {activeTab === 'voice' && <VoiceTab />}
        {activeTab === 'website' && <WebsiteTab />}
      </div>
    </div>
  );
}
