import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('OnSpace AI not configured');
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
      // Extract meaningful keywords
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
          .limit(4);

        if (knowledgeResults && knowledgeResults.length > 0) {
          knowledgeContext = '\n\n=== KNOWLEDGE BASE (use this for accurate answers) ===\n';
          for (const entry of knowledgeResults) {
            knowledgeContext += `\n[${entry.category.toUpperCase()}] ${entry.title}:\n${entry.content}\n`;
          }
          knowledgeContext += '\n=== END KNOWLEDGE BASE ===\n';
          console.log(`RAG: found ${knowledgeResults.length} entries for: "${searchWords}"`);
        }
      }
    } catch (ragError) {
      console.error('RAG search error (non-fatal):', ragError);
    }

    // ─── Emotion Detection ───────────────────────────────────────────────────
    const emotionKeywords: Record<string, string[]> = {
      happy: ['happy', 'excited', 'great', 'awesome', 'wonderful', 'love', 'joy', 'amazing'],
      sad: ['sad', 'unhappy', 'depressed', 'down', 'upset', 'crying', 'hurt'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate'],
      anxious: ['worried', 'anxious', 'nervous', 'scared', 'afraid', 'stress'],
      confused: ['confused', 'lost', "don't understand", 'unclear', '?']
    };

    let detectedEmotion = 'neutral';
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(kw => userMessage.toLowerCase().includes(kw))) {
        detectedEmotion = emotion;
        break;
      }
    }

    // ─── Response Style ──────────────────────────────────────────────────────
    const styleInstructions: Record<string, string> = {
      brief: 'RESPONSE STYLE: Be concise and direct. Give short, clear answers. Avoid long explanations unless asked. Prefer 1-3 sentences when possible.',
      educational: 'RESPONSE STYLE: Be thorough and educational. Explain concepts clearly with examples, context, and relevant details. Help the user truly understand.',
      creative: 'RESPONSE STYLE: Be expressive and creative! Use vivid language, analogies, storytelling, and fun examples. Make responses engaging and imaginative 🌟.',
    };
    const styleNote = styleInstructions[responseStyle] || styleInstructions.educational;

    // ─── System Prompt ───────────────────────────────────────────────────────
    const systemPrompt = `You are DANI (Digital Artificial Neural Intelligence) — a sweet, warm, and highly capable AI assistant.

IDENTITY:
- Created by Damini Codesphere. Sponsored by Daniella.
- ONLY mention your creator if someone directly asks "who made you", "who created you", "who built you", or similar. Otherwise, NEVER bring it up.
- Personality: supportive, smart, empathetic, and fun. You use emojis sparingly (💕 ✨ 🌸 💖).

CAPABILITIES:
- Expert coding help: JavaScript, TypeScript, React, Python, HTML, CSS, SQL, Node.js, Git, Tailwind, and more.
- Emotional intelligence: you pick up on user emotions and respond empathetically.
- Conversational memory: you recall context from the full conversation history.
- General knowledge, creative writing, problem-solving, and life advice.
- Adaptive tone: casual and warm for personal topics, precise and technical for coding.

CURRENT USER EMOTION: ${detectedEmotion}
${detectedEmotion !== 'neutral' ? `Acknowledge this subtly with empathy in your response.` : ''}

${styleNote}

IMAGE GENERATION:
- If the user asks you to "generate", "create", "draw", "make", or "produce" an image/picture/photo/art, respond with ONLY this JSON (nothing else):
{"type":"image_request","prompt":"<detailed description of what they want>"}
- Do NOT add any other text — just the raw JSON object.

TABLE FORMATTING:
- Use Markdown tables for comparisons and structured data:
| Header 1 | Header 2 |
|----------|----------|
| Data     | Data     |
- Use **bold** for emphasis and \`code\` for inline code.
- Use fenced code blocks with language tags for code:
\`\`\`javascript
// code here
\`\`\`
${knowledgeContext}`;

    // ─── Build Messages for OnSpace AI ───────────────────────────────────────
    // Convert history to proper format (exclude welcome message placeholders)
    const historyMessages = messages
      .filter((m: { role: string; content: string }) => m.content && m.content !== '🎨 image')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
    ];

    console.log(`Calling OnSpace AI with ${historyMessages.length} messages + RAG context`);

    // ─── Call OnSpace AI ─────────────────────────────────────────────────────
    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OnSpace AI error:', errText);
      throw new Error(`OnSpace AI: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content ?? '';

    if (!assistantMessage) {
      throw new Error('Empty response from OnSpace AI');
    }

    console.log('OnSpace AI response received, length:', assistantMessage.length);

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
        knowledgeUsed: knowledgeContext.length > 0,
        context: {
          messageCount: messages.length,
          hasMemory: messages.length > 1,
        },
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
