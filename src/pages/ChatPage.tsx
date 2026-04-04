import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Code, LogOut, User, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';
import ChatTab from '@/components/features/ChatTab';
import ImageTab from '@/components/features/ImageTab';
import VoiceTab from '@/components/features/VoiceTab';
import WebsiteTab from '@/components/features/WebsiteTab';

export default function ChatPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'voice' | 'website'>('chat');
  const [username, setUsername] = useState<string | null>(null);
  const [responseStyle] = useState<string>(
    () => localStorage.getItem('dani-style') || 'educational'
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUsername(user.user_metadata?.username || user.email?.split('@')[0] || 'User');
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    const handleSwitchTab = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switch-tab', handleSwitchTab as EventListener);
    return () => window.removeEventListener('switch-tab', handleSwitchTab as EventListener);
  }, []);

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
              <button key={tab} onClick={() => setActiveTab(tab)}
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
            <button onClick={() => navigate('/profile')}
              className="p-2.5 glass rounded-full hover:bg-white/80 transition-all border border-white/30"
              aria-label="Profile settings" title="Profile & Settings">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={() => navigate('/')}
              className="p-2.5 glass rounded-full hover:bg-white/80 transition-all border border-white/30"
              aria-label="Go home">
              <Home className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={handleLogout}
              className="p-2.5 glass rounded-full hover:bg-red-50 transition-all border border-white/30"
              aria-label="Log out" title="Log out">
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
