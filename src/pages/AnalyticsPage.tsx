import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, MessageCircle, Image, Mic, Globe,
  TrendingUp, BarChart2, Calendar, Loader2, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import daniLogo from '@/assets/dani-logo.png';

const ADMIN_EMAIL = 'damibotzinc@gmail.com';

interface AnalyticsStat {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}

interface FeatureCount { feature: string; count: number; }
interface DailyCount { date: string; count: number; }

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStat[]>([]);
  const [featureCounts, setFeatureCounts] = useState<FeatureCount[]>([]);
  const [dailyUsers, setDailyUsers] = useState<DailyCount[]>([]);
  const [monthlyUsers, setMonthlyUsers] = useState<DailyCount[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [totalWebsites, setTotalWebsites] = useState(0);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);
    await loadAnalytics();
    setLoading(false);
  };

  const loadAnalytics = async () => {
    try {
      // Total users
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(userCount ?? 0);

      // Total conversations (chat)
      const { count: chatCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });
      setTotalChats(chatCount ?? 0);

      // Total generated images
      const { count: imgCount } = await supabase
        .from('generated_images')
        .select('*', { count: 'exact', head: true });
      setTotalImages(imgCount ?? 0);

      // Total websites (credit_transactions with type 'generation')
      const { count: siteCount } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'generation');
      setTotalWebsites(siteCount ?? 0);

      // Daily new users (last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const { data: dailyData } = await supabase
        .from('user_profiles')
        .select('id, created_at')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const dailyMap: Record<string, number> = {};
      (dailyData || []).forEach(u => {
        const d = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyMap[d] = (dailyMap[d] || 0) + 1;
      });
      setDailyUsers(Object.entries(dailyMap).map(([date, count]) => ({ date, count })));

      // Monthly users (last 12 months)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const { data: monthlyData } = await supabase
        .from('user_profiles')
        .select('id, created_at')
        .gte('created_at', oneYearAgo.toISOString())
        .order('created_at', { ascending: true });

      const monthlyMap: Record<string, number> = {};
      (monthlyData || []).forEach(u => {
        const m = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        monthlyMap[m] = (monthlyMap[m] || 0) + 1;
      });
      setMonthlyUsers(Object.entries(monthlyMap).map(([date, count]) => ({ date, count })));

      // Feature usage breakdown
      const features: FeatureCount[] = [
        { feature: 'Chat', count: chatCount ?? 0 },
        { feature: 'Images', count: imgCount ?? 0 },
        { feature: 'Websites', count: siteCount ?? 0 },
      ];
      setFeatureCounts(features);

      const totalFeatureCount = features.reduce((s, f) => s + f.count, 0) || 1;
      setStats([
        { label: 'Total Users', value: userCount ?? 0, icon: Users, color: 'from-pink-500 to-rose-500', sub: 'registered accounts' },
        { label: 'Chat Sessions', value: chatCount ?? 0, icon: MessageCircle, color: 'from-purple-500 to-indigo-500', sub: 'conversations started' },
        { label: 'Images Generated', value: imgCount ?? 0, icon: Image, color: 'from-blue-500 to-cyan-500', sub: 'AI images created' },
        { label: 'Websites Built', value: siteCount ?? 0, icon: Globe, color: 'from-green-500 to-emerald-500', sub: 'using Vibe Code tab' },
      ]);
    } catch (err) {
      console.error('Analytics load error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-10 border border-white/30 text-center max-w-sm">
          <ShieldAlert className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-6">Analytics are only available to admins.</p>
          <button onClick={() => navigate('/chat')}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const maxDaily = Math.max(...dailyUsers.map(d => d.count), 1);
  const maxMonthly = Math.max(...monthlyUsers.map(d => d.count), 1);
  const totalFeatureCount = featureCounts.reduce((s, f) => s + f.count, 0) || 1;

  const featureIcons: Record<string, React.ElementType> = {
    Chat: MessageCircle,
    Images: Image,
    Websites: Globe,
    Voice: Mic,
  };
  const featureColors: Record<string, string> = {
    Chat: 'from-purple-500 to-indigo-500',
    Images: 'from-blue-500 to-cyan-500',
    Websites: 'from-green-500 to-emerald-500',
    Voice: 'from-orange-500 to-amber-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/chat')}
            className="p-2.5 glass rounded-xl hover:bg-white/80 transition-all border border-white/30">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <img src={daniLogo} alt="DANI" className="h-8 w-auto" />
          <div>
            <h1 className="font-bold text-gray-800 text-lg leading-none">Analytics</h1>
            <p className="text-xs text-gray-400">Admin Dashboard · {ADMIN_EMAIL}</p>
          </div>
          <button onClick={() => { setLoading(true); checkAdminAndLoad(); }}
            className="ml-auto flex items-center gap-2 px-4 py-2 glass rounded-xl border border-white/30 hover:bg-white/80 transition-all text-sm font-medium text-gray-600">
            <TrendingUp className="w-4 h-4" /> Refresh
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="glass rounded-3xl p-5 border border-white/30">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-3xl font-black text-gray-800">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">{s.label}</p>
                {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Daily New Users */}
          <div className="glass rounded-3xl p-6 border border-white/30">
            <h2 className="font-bold text-gray-800 text-base mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-500" /> Daily New Users
            </h2>
            <p className="text-xs text-gray-400 mb-5">Last 14 days</p>
            {dailyUsers.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {dailyUsers.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 flex-shrink-0 text-right">{d.date}</span>
                    <div className="flex-1 h-6 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full transition-all duration-500 flex items-center pl-2"
                        style={{ width: `${Math.max((d.count / maxDaily) * 100, 4)}%` }}
                      >
                        {d.count > 0 && <span className="text-[10px] text-white font-bold">{d.count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Users */}
          <div className="glass rounded-3xl p-6 border border-white/30">
            <h2 className="font-bold text-gray-800 text-base mb-1 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-500" /> Monthly New Users
            </h2>
            <p className="text-xs text-gray-400 mb-5">Last 12 months</p>
            {monthlyUsers.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
            ) : (
              <div className="space-y-2">
                {monthlyUsers.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16 flex-shrink-0 text-right">{d.date}</span>
                    <div className="flex-1 h-6 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-500 flex items-center pl-2"
                        style={{ width: `${Math.max((d.count / maxMonthly) * 100, 4)}%` }}
                      >
                        {d.count > 0 && <span className="text-[10px] text-white font-bold">{d.count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feature Usage */}
        <div className="glass rounded-3xl p-6 border border-white/30">
          <h2 className="font-bold text-gray-800 text-base mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" /> Most Used Features
          </h2>
          <p className="text-xs text-gray-400 mb-6">All-time usage across DANI features</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {featureCounts.map((f, i) => {
              const Icon = featureIcons[f.feature] ?? MessageCircle;
              const color = featureColors[f.feature] ?? 'from-pink-500 to-purple-500';
              const pct = Math.round((f.count / totalFeatureCount) * 100);
              return (
                <div key={i} className="bg-white/50 rounded-2xl p-4 border border-white/40">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-gray-800 text-lg">{f.count.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 font-medium">{f.feature}</p>
                  <div className="mt-2 h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${color} rounded-full`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}% of all usage</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Summary */}
        <div className="glass rounded-3xl p-6 border border-white/30">
          <h2 className="font-bold text-gray-800 text-base mb-4">Platform Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Users (Total)', value: totalUsers, color: 'text-pink-600' },
              { label: 'Chats (Total)', value: totalChats, color: 'text-purple-600' },
              { label: 'Images (Total)', value: totalImages, color: 'text-blue-600' },
              { label: 'Websites (Total)', value: totalWebsites, color: 'text-green-600' },
            ].map((item, i) => (
              <div key={i} className="bg-white/40 rounded-2xl p-4">
                <p className={`text-2xl font-black ${item.color}`}>{item.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
