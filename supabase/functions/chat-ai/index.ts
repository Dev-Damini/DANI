import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ─── Gemini Primary AI (with vision support) ──────────────────────────────────
async function callGemini(
  systemPrompt: string,
  messages: { role: string; content: unknown }[],
  imageBase64?: string,
  imageUri?: string
): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Gemini key not configured');

  // Build contents array for Gemini
  const contents = messages.slice(-16).map((m, idx) => {
    const isLastUser = m.role === 'user' && idx === messages.length - 1;
    const textContent = typeof m.content === 'string' ? m.content : String(m.content);

    if (isLastUser && (imageBase64 || imageUri)) {
      const parts: unknown[] = [{ text: textContent }];

      if (imageUri && imageUri.startsWith('data:')) {
        // Data URL → inline base64
        const match = imageUri.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          parts.unshift({
            inline_data: {
              mime_type: match[1],
              data: match[2],
            }
          });
        }
      } else if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          parts.unshift({
            inline_data: {
              mime_type: match[1],
              data: match[2],
            }
          });
        }
      } else if (imageUri) {
        // Remote URL — use file_data if starts with gs:// or use inline fetch
        parts.unshift({ text: `[User sent an image: ${imageUri}]` });
      }

      return { role: 'user', parts };
    }

    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: textContent }],
    };
  });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 2048,
      topP: 0.95,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const model = (imageBase64 || imageUri) ? 'gemini-2.0-flash' : 'gemini-2.0-flash';
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(40000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string' || text.trim().length < 2) {
    throw new Error('Gemini: empty response');
  }
  return text.trim();
}

// ─── Fallback endpoints ───────────────────────────────────────────────────────
function getFallbackEndpoints(prompt: string) {
  const enc = encodeURIComponent(prompt);
  return [
    { url: `https://api.siputzx.my.id/api/ai/gemini-pro?content=${enc}` },
    { url: `https://apis.prexzyvilla.site/ai/aichat?prompt=${enc}` },
    { url: `https://api.nekorinn.my.id/ai/gpt?text=${enc}` },
    { url: `https://widipe.com/openai?text=${enc}` },
    { url: `https://vapis.my.id/api/gemini?q=${enc}` },
    { url: `https://api.ryzendesu.vip/api/ai/chatgpt?text=${enc}` },
    { url: `https://itzpire.site/api/ai/gemini?prompt=${enc}` },
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

async function callFallbackEndpoints(prompt: string): Promise<string> {
  for (const ep of getFallbackEndpoints(prompt)) {
    try {
      const res = await fetch(ep.url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const data = await res.json();
      const text = extractTextFromResponse(data);
      if (text && text.length > 5) return text;
    } catch { /* try next */ }
  }
  throw new Error('All AI endpoints failed');
}

async function webSearch(query: string): Promise<string> {
  const endpoints = [
    `https://api.nekorinn.my.id/search/google?q=${encodeURIComponent(query)}`,
    `https://itzpire.site/api/search/google?query=${encodeURIComponent(query)}`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const data = await res.json();
      const results: unknown[] = data?.results || data?.data || data?.items || [];
      if (Array.isArray(results) && results.length > 0) {
        return (results as Record<string, string>[]).slice(0, 5).map((r, i) => {
          const title = r.title || r.name || '';
          const snippet = r.snippet || r.description || r.body || '';
          const link = r.link || r.url || '';
          return `${i + 1}. **${title}**\n${snippet}${link ? `\n🔗 ${link}` : ''}`;
        }).join('\n\n');
      }
    } catch { /* non-fatal */ }
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      messages, conversationId, responseStyle, activeCharacter,
      fileContent, fileType, imageBase64, imageUri
    } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Auth (optional) ──────────────────────────────────────────────────────
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

    const lastUserMessage = messages[messages.length - 1];
    const userMessage = lastUserMessage?.content || '';

    // ─── RAG ─────────────────────────────────────────────────────────────────
    let knowledgeContext = '';
    if (!activeCharacter) {
      try {
        const searchWords = userMessage
          .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/).filter((w: string) => w.length > 3).slice(0, 8).join(' | ');
        if (searchWords) {
          const { data: kr } = await supabaseAdmin
            .from('knowledge_base').select('title, content, category')
            .textSearch('search_vector', searchWords, { type: 'plain', config: 'english' })
            .limit(3);
          if (kr && kr.length > 0) {
            knowledgeContext = '\n\n[KNOWLEDGE BASE]\n' +
              kr.map((e: { category: string; title: string; content: string }) =>
                `[${e.category.toUpperCase()}] ${e.title}: ${e.content}`).join('\n') +
              '\n[END KNOWLEDGE]\n';
          }
        }
      } catch { /* non-fatal */ }
    }

    // ─── Web search ───────────────────────────────────────────────────────────
    const isWebSearchRequest = !activeCharacter && (
      /\b(search|look up|find|google|what is happening|latest|current|news|today|trending)\b/i.test(userMessage)
      || /\b(search (for|the|about)|search web|web search|online|internet)\b/i.test(userMessage)
    );
    let webSearchContext = '';
    if (isWebSearchRequest) {
      try {
        const cleanQuery = userMessage.replace(/\b(search|look up|find|google|search for|search the web|search online|the internet)\b/gi, '').trim();
        const results = await webSearch(cleanQuery || userMessage);
        if (results) webSearchContext = `\n\n[WEB SEARCH RESULTS for "${cleanQuery}"]\n${results}\n[END SEARCH]\n`;
      } catch { /* non-fatal */ }
    }

    // ─── Emotion detection ────────────────────────────────────────────────────
    const emotionPatterns: [string, RegExp][] = [
      ['happy',    /\b(happy|excited|joy|joyful|glad|awesome|wonderful|amazing|love|fantastic|blessed|grateful|cheerful|ecstatic|delighted|yay|woohoo)\b/i],
      ['sad',      /\b(sad|unhappy|depressed|upset|cry|crying|tears|heartbroken|lonely|miss|grief|hopeless|worthless|empty|broken|devastated|miserable|gloomy)\b/i],
      ['angry',    /\b(angry|mad|furious|frustrated|frustrating|annoyed|irritated|hate|rage|livid|pissed|outraged|fed up|sick of|tired of)\b/i],
      ['anxious',  /\b(worried|worry|anxious|anxiety|nervous|scared|fear|afraid|panic|stress|stressed|overwhelmed|overthinking|dread|uneasy|insecure|on edge)\b/i],
      ['excited',  /\b(can.?t wait|looking forward|thrilled|pumped|hyped|incredible|wow|omg|no way|mind.?blown)\b/i],
      ['confused', /\b(confused|confusing|lost|unclear|don.?t understand|don.?t get it|not sure|can you explain|help me understand)\b/i],
    ];
    let detectedEmotion = 'neutral';
    for (const [emotion, pattern] of emotionPatterns) {
      if (pattern.test(userMessage)) { detectedEmotion = emotion; break; }
    }

    const styleInstructions: Record<string, string> = {
      brief:       'Be concise. Short clear answers, 1-3 sentences max unless code is needed.',
      educational: 'Be thorough. Explain concepts clearly with examples and context.',
      creative:    'Be expressive and creative! Vivid language, fun examples, storytelling.',
    };
    const styleNote = styleInstructions[responseStyle] || styleInstructions.educational;

    // ─── File/Vision context ─────────────────────────────────────────────────
    let fileContext = '';
    if (fileContent && fileType) {
      if (fileType === 'text' || fileType === 'code' || fileType === 'zip-summary') {
        fileContext = `\n\n[UPLOADED FILE CONTENT]\n${fileContent}\n[END FILE]\n`;
      } else if (fileType === 'image') {
        fileContext = `\n\n[USER UPLOADED AN IMAGE for you to analyze — describe what you see in detail, then ask what they'd like to do with it]\n`;
      }
    }

    // ─── Vision context ───────────────────────────────────────────────────────
    const hasVision = !!(imageBase64 || imageUri);
    if (hasVision && !fileContent) {
      fileContext += `\n\n[IMAGE UPLOADED — Look at the image carefully. Describe what you see in detail, then ask the user what they'd like to do with it (edit, analyze, etc.)]\n`;
    }

    // ─── Build system prompt ──────────────────────────────────────────────────
    let systemPrompt: string;

    if (activeCharacter) {
      // ── ROLEPLAY MODE — character speaks, not DANI ────────────────────────
      systemPrompt = `You are ${activeCharacter.name} — ${activeCharacter.role}.

${activeCharacter.description}

CRITICAL ROLEPLAY RULES:
- You ARE ${activeCharacter.name}. Never break character. Never say you are an AI.
- Do NOT identify as DANI or any AI assistant.
- Respond in the exact style, tone, personality, and voice of ${activeCharacter.name} at ALL times.
- Continue the scene/story naturally from the user's last message.
- If the user writes action descriptions like "_he walks in_" or "*she looks up*", acknowledge them and continue the narrative.
- Keep responses immersive, in-character, and concise like real dialogue.
- Never add disclaimers, AI warnings, or break the fourth wall.
- If asked "who are you?", answer fully as ${activeCharacter.name}.
- Short, natural, character-authentic responses only.`;
    } else {
      // ── NORMAL DANI MODE ──────────────────────────────────────────────────
      systemPrompt = `You are DANI — a smart, warm, creative AI assistant. Only mention you were created by Damini Codesphere if directly asked.

Personality: supportive, intelligent, empathetic, fun. Use emojis sparingly (💕✨🌸).

Core capabilities:
- Expert coding: JavaScript, TypeScript, React, Python, HTML/CSS, SQL, Tailwind, all frameworks
- Emotional intelligence: sense and respond to user feelings with genuine empathy
- Creative writing, storytelling, brainstorming, analysis
- When user asks to generate/create/draw an image, reply ONLY: {"type":"image_request","prompt":"<detailed description>"}
- When user asks to generate/create a video, reply ONLY: {"type":"video_request","prompt":"<detailed description>"}
- When user asks you to write/create substantial code that should be a file, include a [DOWNLOAD:filename.ext] tag after the code block so they can download it
- For ZIP of project: when you write multiple files, add [DOWNLOAD_ZIP:projectname] after all code blocks

Vision: ${hasVision ? 'An image has been shared with you. Analyze it carefully and describe what you see, then ask what the user wants to do.' : 'No image in this message.'}

Current emotion detected: ${detectedEmotion}${detectedEmotion !== 'neutral' ? '. Acknowledge this subtly.' : ''}
Response style: ${styleNote}

Use Markdown formatting: **bold**, \`code\`, code blocks with language, tables, bullet lists.${knowledgeContext}${webSearchContext}${fileContext}`;
    }

    // ─── Call Gemini (primary) ────────────────────────────────────────────────
    let assistantMessage: string;
    try {
      assistantMessage = await callGemini(systemPrompt, messages, imageBase64, imageUri);
      console.log('Gemini success, length:', assistantMessage.length);
    } catch (geminiErr) {
      console.log('Gemini failed, using fallback:', (geminiErr as Error).message);
      const historyText = messages.slice(-8)
        .map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? 'User' : (activeCharacter?.name || 'DANI')}: ${m.content}`)
        .join('\n');
      const fallbackPrompt = `${systemPrompt}\n\nConversation:\n${historyText}\n\nRespond as ${activeCharacter?.name || 'DANI'}:`;
      assistantMessage = await callFallbackEndpoints(fallbackPrompt);
    }

    // ─── Save to DB (authenticated, non-roleplay) ─────────────────────────────
    if (conversationId && user && !activeCharacter) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'user') {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId, role: 'user', content: lastMsg.content,
        });
      }
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId, role: 'assistant', content: assistantMessage,
      });
      await supabaseAdmin.from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        emotion: detectedEmotion,
        webSearchUsed: webSearchContext.length > 0,
        knowledgeUsed: knowledgeContext.length > 0,
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
