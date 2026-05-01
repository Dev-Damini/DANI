import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ─── External AI Endpoints (with fallbacks) ───────────────────────────────────
function getChatEndpoints(prompt: string) {
  const enc = encodeURIComponent(prompt);
  return [
    { method: 'get', url: `https://api.siputzx.my.id/api/ai/gemini-pro?content=${enc}`, key: ['data', 'message', 'result', 'response', 'text', 'answer'] },
    { method: 'get', url: `https://apis.prexzyvilla.site/ai/aichat?prompt=${enc}`, key: ['data', 'message', 'result', 'response', 'text', 'answer'] },
    { method: 'get', url: `https://api.nekorinn.my.id/ai/gpt?text=${enc}`, key: ['data', 'message', 'result', 'response', 'text', 'answer'] },
    { method: 'get', url: `https://widipe.com/openai?text=${enc}`, key: ['data', 'message', 'result', 'response', 'text', 'answer'] },
    { method: 'get', url: `https://vapis.my.id/api/gemini?q=${enc}`, key: ['data', 'message', 'result', 'response', 'text', 'answer'] },
    { method: 'get', url: `https://api.ryzendesu.vip/api/ai/chatgpt?text=${enc}`, key: ['data', 'message', 'result', 'response', 'text', 'answer'] },
    { method: 'get', url: `https://itzpire.site/api/ai/gemini?prompt=${enc}`, key: ['data', 'message', 'result', 'response', 'text', 'answer'] },
    { method: 'get', url: `https://zellapi.autos/ai/chatbot?text=${enc}`, key: ['data', 'message', 'result', 'response', 'text', 'answer'] },
  ];
}

function getWebSearchEndpoints(query: string) {
  const enc = encodeURIComponent(query);
  return [
    { url: `https://api.nekorinn.my.id/search/google?q=${enc}` },
    { url: `https://itzpire.site/api/search/google?query=${enc}` },
  ];
}

function extractTextFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const keys = ['message', 'result', 'response', 'text', 'answer', 'reply', 'output', 'content', 'data'];
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 5) return val.trim();
    if (val && typeof val === 'object') {
      const nested = extractTextFromResponse(val);
      if (nested) return nested;
    }
  }
  return null;
}

async function callWithFallback(prompt: string): Promise<string> {
  const endpoints = getChatEndpoints(prompt);
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const data = await res.json();
      const text = extractTextFromResponse(data);
      if (text && text.length > 5) {
        console.log('Chat success from:', ep.url.split('?')[0]);
        return text;
      }
    } catch (e) {
      console.log('Endpoint failed:', ep.url.split('?')[0], (e as Error).message);
    }
  }
  throw new Error('All AI endpoints failed');
}

async function webSearch(query: string): Promise<string> {
  const endpoints = getWebSearchEndpoints(query);
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json();
      // Try to extract search results
      const results: unknown[] = data?.results || data?.data || data?.items || [];
      if (Array.isArray(results) && results.length > 0) {
        const formatted = (results as Record<string, string>[]).slice(0, 5).map((r, i) => {
          const title = r.title || r.name || '';
          const snippet = r.snippet || r.description || r.body || '';
          const link = r.link || r.url || '';
          return `${i + 1}. **${title}**\n${snippet}\n${link ? `🔗 ${link}` : ''}`;
        }).join('\n\n');
        return formatted;
      }
    } catch (e) {
      console.log('Search endpoint failed:', ep.url.split('?')[0]);
    }
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, responseStyle } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Get User (optional) ─────────────────────────────────────────────────
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ─── RAG: Knowledge Base Search ──────────────────────────────────────────
    const lastUserMessage = messages[messages.length - 1];
    const userMessage = lastUserMessage?.content || '';
    let knowledgeContext = '';

    try {
      const searchWords = userMessage
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 8)
        .join(' | ');

      if (searchWords) {
        const { data: knowledgeResults } = await supabaseAdmin
          .from('knowledge_base')
          .select('title, content, category')
          .textSearch('search_vector', searchWords, { type: 'plain', config: 'english' })
          .limit(3);

        if (knowledgeResults && knowledgeResults.length > 0) {
          knowledgeContext = '\n\n[KNOWLEDGE BASE]\n';
          for (const entry of knowledgeResults) {
            knowledgeContext += `[${entry.category.toUpperCase()}] ${entry.title}: ${entry.content}\n`;
          }
          knowledgeContext += '[END KNOWLEDGE]\n';
        }
      }
    } catch { /* non-fatal */ }

    // ─── Web Search Detection ─────────────────────────────────────────────────
    const isWebSearchRequest = /\b(search|look up|find|google|what is happening|latest|current|news|today|trending)\b/i.test(userMessage)
      || /\b(search (for|the|about)|search web|web search|online|internet)\b/i.test(userMessage);

    let webSearchContext = '';
    if (isWebSearchRequest) {
      try {
        const cleanQuery = userMessage
          .replace(/\b(search|look up|find|google|search for|search the web|search online|the internet)\b/gi, '')
          .trim();
        const results = await webSearch(cleanQuery || userMessage);
        if (results) {
          webSearchContext = `\n\n[WEB SEARCH RESULTS for "${cleanQuery}"]\n${results}\n[END SEARCH]\n`;
          console.log('Web search completed for:', cleanQuery);
        }
      } catch { /* non-fatal */ }
    }

    // ─── Emotion Detection ────────────────────────────────────────────────────
    const msgLower = userMessage.toLowerCase();

    const emotionPatterns: [string, RegExp][] = [
      ['happy',   /\b(happy|happiness|excited|thrilled|joy|joyful|glad|awesome|wonderful|amazing|love|fantastic|blessed|grateful|cheerful|ecstatic|delighted|stoked|pumped|yay|woohoo)\b/i],
      ['sad',     /\b(sad|unhappy|depressed|depression|upset|cry|crying|tears|heartbroken|lonely|miss|grief|hopeless|worthless|empty|numb|broken|devastated|miserable|gloomy)\b/i],
      ['angry',   /\b(angry|anger|mad|furious|frustrated|frustrating|annoyed|irritated|hate|rage|livid|pissed|outraged|fed up|sick of|tired of)\b/i],
      ['anxious', /\b(worried|worry|anxious|anxiety|nervous|scared|fear|afraid|panic|stress|stressed|overwhelmed|overthinking|dread|uneasy|insecure|on edge|apprehensive|tense)\b/i],
      ['excited', /\b(can.?t wait|looking forward|thrilled|pumped|hyped|incredible|wow|omg|no way|mind.?blown)\b/i],
      ['confused', /\b(confused|confusing|lost|unclear|don.?t understand|don.?t get it|not sure|can you explain|help me understand)\b/i],
    ];

    let detectedEmotion = 'neutral';
    for (const [emotion, pattern] of emotionPatterns) {
      if (pattern.test(userMessage)) { detectedEmotion = emotion; break; }
    }
    if (detectedEmotion === 'neutral') {
      if (/not (ok|okay|fine|good|great|well)/i.test(msgLower)) detectedEmotion = 'sad';
      if (/feeling (bad|terrible|awful|horrible)/i.test(msgLower)) detectedEmotion = 'sad';
      if (/i hate/i.test(msgLower)) detectedEmotion = 'angry';
      if (/can.?t take (it|this)/i.test(msgLower)) detectedEmotion = 'anxious';
    }

    // ─── Response Style ───────────────────────────────────────────────────────
    const styleInstructions: Record<string, string> = {
      brief: 'Be concise. Short clear answers, 1-3 sentences max unless code is needed.',
      educational: 'Be thorough. Explain concepts clearly with examples and context.',
      creative: 'Be expressive and creative! Vivid language, fun examples, storytelling.',
    };
    const styleNote = styleInstructions[responseStyle] || styleInstructions.educational;

    // ─── Build the full prompt to send to external AI ─────────────────────────
    const historyText = messages
      .filter((m: { role: string; content: string }) => m.content && m.content !== '🎨 image' && m.content !== '🎬 video')
      .slice(-10) // keep last 10 messages for context
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'DANI'}: ${m.content}`)
      .join('\n');

    const imageInstruction = `If the user asks to generate/create/draw/make an image or photo, respond with ONLY this JSON: {"type":"image_request","prompt":"<detailed description>"}`;

    const fullPrompt = `You are DANI (Digital Artificial Neural Intelligence) — a sweet, warm, capable AI assistant. Created by Damini Codesphere. Only mention creator if directly asked.

Personality: supportive, smart, empathetic, fun. Emojis sparingly (💕✨🌸💖).

Capabilities: expert coding (JS, TS, React, Python, HTML, CSS, SQL, Node.js, Git, Tailwind), emotional intelligence, conversational memory, general knowledge, creative writing.

Current user emotion: ${detectedEmotion}${detectedEmotion !== 'neutral' ? '. Acknowledge subtly with empathy.' : ''}

Style: ${styleNote}

${imageInstruction}

Use Markdown for formatting: **bold**, \`code\`, tables (| col |), code blocks (\`\`\`lang).

${knowledgeContext}${webSearchContext}${webSearchContext ? 'Use the web search results above to answer accurately and mention sources.' : ''}

Conversation history:
${historyText}

Now respond to the latest message from User. Be DANI — helpful, warm, and smart:`;

    // ─── Call external AI with fallbacks ─────────────────────────────────────
    const assistantMessage = await callWithFallback(fullPrompt);

    // ─── Save to DB ───────────────────────────────────────────────────────────
    if (conversationId && user) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'user') {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: lastMsg.content,
        });
      }
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
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
        webSearchUsed: webSearchContext.length > 0,
        knowledgeUsed: knowledgeContext.length > 0,
        context: { messageCount: messages.length, hasMemory: messages.length > 1 },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('chat-ai error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
