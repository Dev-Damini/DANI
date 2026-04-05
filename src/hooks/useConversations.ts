import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Conversation } from '@/types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately on mount using existing session (handles refresh)
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchConversations();
    }

    // Re-fetch when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchConversations();
      } else if (event === 'SIGNED_OUT') {
        setConversations([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createConversation = async (title: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: session.user.id, title })
      .select()
      .single();

    if (error) throw error;
    setConversations(prev => [data, ...prev]);
    return data;
  };

  const deleteConversation = async (id: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  return {
    conversations,
    loading,
    createConversation,
    deleteConversation,
    refreshConversations: fetchConversations,
  };
}
