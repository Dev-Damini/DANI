import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, Globe, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SharedWebsitePage() {
  const [params] = useSearchParams();
  const shareId = params.get('id');
  const [html, setHtml] = useState('');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shareId) { setError('Invalid share link'); setLoading(false); return; }
    supabase
      .from('shared_websites')
      .select('html_content, project_name')
      .eq('id', shareId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setError('This shared website was not found or has been removed.'); }
        else { setHtml(data.html_content); setProjectName(data.project_name); }
        setLoading(false);
      });
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          <p className="text-gray-500 text-sm">Loading shared website...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-10 border border-white/30 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Not Found</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Mini header */}
      <div className="bg-gray-900 border-b border-white/10 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-400">
          <Globe className="w-3 h-3" />
          <span className="font-mono truncate">{projectName}</span>
        </div>
        <a href="https://daniai.vercel.app" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-pink-400 font-semibold hover:text-pink-300 transition-colors whitespace-nowrap">
          Built with DANI <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      {/* Full preview */}
      <iframe
        srcDoc={html}
        className="flex-1 w-full border-0 bg-white"
        title={projectName}
        sandbox="allow-scripts allow-forms"
      />
    </div>
  );
}
