import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Conversation } from '@/types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
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

  const createConversation = async (title: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single();

      if (error) throw error;
      setConversations(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  };

  return {
    conversations,
    loading,
    createConversation,
    deleteConversation,
    refreshConversations: fetchConversations
  };
}
