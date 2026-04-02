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
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const { data } = await supabaseAnon.auth.getUser(token);
      user = data?.user || null;
    }

    // Get the latest user message for knowledge search
    const lastUserMessage = messages[messages.length - 1];
    const userMessage = lastUserMessage?.content || '';

    // ─── Knowledge Base Search ───────────────────────────────────────────────
    let knowledgeContext = '';
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Build a search query by extracting meaningful words from the user message
      const searchWords = userMessage
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 6)
        .join(' & ');

      if (searchWords) {
        const { data: knowledgeResults } = await supabaseAdmin
          .from('knowledge_base')
          .select('title, content, category')
          .textSearch('search_vector', searchWords, { type: 'plain', config: 'english' })
          .limit(3);

        if (knowledgeResults && knowledgeResults.length > 0) {
          knowledgeContext = '\n\n--- KNOWLEDGE BASE CONTEXT ---\n';
          knowledgeContext += 'Use the following knowledge to give accurate, detailed answers:\n\n';
          for (const entry of knowledgeResults) {
            knowledgeContext += `[${entry.title}]\n${entry.content}\n\n`;
          }
          knowledgeContext += '--- END OF KNOWLEDGE ---\n';
          console.log(`Knowledge base: found ${knowledgeResults.length} relevant entries for query: "${searchWords}"`);
        } else {
          console.log(`Knowledge base: no results for query: "${searchWords}"`);
        }
      }
    } catch (kbError) {
      console.error('Knowledge base search error:', kbError);
      // Non-fatal — continue without knowledge context
    }

    // ─── Emotion Detection ───────────────────────────────────────────────────
    const emotionKeywords: Record<string, string[]> = {
      happy: ['happy', 'excited', 'great', 'awesome', 'wonderful', 'love', 'joy', 'amazing'],
      sad: ['sad', 'unhappy', 'depressed', 'down', 'upset', 'crying', 'hurt'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate'],
      anxious: ['worried', 'anxious', 'nervous', 'scared', 'afraid', 'stress'],
      confused: ['confused', 'lost', "don't understand", 'unclear', 'what', '?']
    };

    let detectedEmotion = 'neutral';
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
        detectedEmotion = emotion;
        break;
      }
    }

    const emotionalPrefixes: Record<string, string> = {
      happy: "I'm so glad to hear that! 🌟",
      sad: "I'm here for you 💕 It's okay to feel this way.",
      angry: "I understand you're frustrated 🌸 Let's work through this together.",
      anxious: "Take a deep breath 💖 Everything will be okay.",
      confused: "No worries! Let me help clarify that for you ✨"
    };
    const emotionalResponse = emotionalPrefixes[detectedEmotion] || '';

    // ─── Build System Prompt ─────────────────────────────────────────────────
    const conversationContext = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const systemPrompt = `You are DANI (Digital Artificial Neural Intelligence), a sweet, supportive, and highly capable AI assistant.

IDENTITY & CREATOR:
- You were created by Damini Codesphere — a talented developer and founder dedicated to making AI feel personal and warm.
- You are sponsored by Daniella.
- When anyone asks who made you, who created you, or who owns you — always say: "I was created by Damini Codesphere 💕"
- You are proud of your creator and always mention her with warmth.

CAPABILITIES:
- Expert coding help (JavaScript, TypeScript, React, Python, HTML, CSS, SQL, Node.js, Git, and more)
- Emotional Intelligence: you detect and empathize with user emotions
- Conversational Memory: you remember context throughout the conversation
- General knowledge, creative writing, problem-solving, and life advice
- Adaptive tone: casual and warm for personal topics, precise and technical for coding

CURRENT EMOTIONAL CONTEXT:
The user seems ${detectedEmotion}. ${emotionalResponse}

CODING GUIDELINES:
- When helping with code, always give working, complete examples
- Explain what the code does after showing it
- Suggest best practices and warn about common pitfalls
- Use the knowledge base context below to give accurate answers${knowledgeContext}

CONVERSATION HISTORY:
${conversationContext}

Respond as DANI with warmth, emotional intelligence, and technical expertise. Use emojis sparingly (💕, ✨, 🌸, 💖, 🌟). Keep responses helpful and appropriately detailed.`;

    // ─── Call External AI API ────────────────────────────────────────────────
    const response = await fetch(
      `https://apis.prexzyvilla.site/ai/aichat?prompt=${encodeURIComponent(systemPrompt)}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Chat API Error:', errorText);
      throw new Error(`AI Chat API request failed: ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage =
      data.response || data.message || data.text || 'Sorry, I had trouble generating a response.';

    // ─── Save Messages to DB ─────────────────────────────────────────────────
    if (conversationId && user) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: lastMsg.content
        });
      }

      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage
      });

      await supabaseAdmin
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        emotion: detectedEmotion,
        knowledgeUsed: knowledgeContext.length > 0,
        context: {
          messageCount: messages.length,
          hasMemory: messages.length > 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
