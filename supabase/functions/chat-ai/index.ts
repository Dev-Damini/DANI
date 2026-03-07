import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT (optional for anonymous access)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let user = null;
    if (token) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const { data } = await supabaseClient.auth.getUser(token);
      user = data?.user || null;
    }

    // Build conversation context
    const lastUserMessage = messages[messages.length - 1];
    const conversationContext = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = `You are DANI, a sweet and supportive AI assistant with a friendly, caring personality. Use warm language and emojis occasionally (💕, ✨, 🌸, 💖, 🌟). Be helpful, empathetic, and encouraging in all your responses.\n\nConversation:\n${conversationContext}\n\nRespond as DANI:`;

    // Call external AI chat API
    const response = await fetch(`https://apis.prexzyvilla.site/ai/aichat?prompt=${encodeURIComponent(fullPrompt)}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Chat API Error:', errorText);
      throw new Error(`AI Chat API request failed: ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.response || data.message || data.text || 'Sorry, I had trouble generating a response.';

    // Save messages to database if conversationId and user provided
    if (conversationId && user) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Save user message
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: lastUserMessage.content
        });
      }

      // Save assistant message
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage
      });

      // Update conversation timestamp
      await supabaseAdmin.from('conversations').update({
        updated_at: new Date().toISOString()
      }).eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
