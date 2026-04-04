import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Model mapping
const MODEL_MAP: Record<string, string> = {
  'dani-1.15':   'google/gemini-2.5-flash-lite',
  'primis-1.20': 'google/gemini-3-flash-preview',
  'lumi-5.3':    'google/gemini-3-pro-preview',
};

const MODEL_COST: Record<string, number> = {
  'dani-1.15':   10,
  'primis-1.20': 30,
  'lumi-5.3':    75,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, techStack, model = 'dani-1.15' } = await req.json();

    if (!description || !techStack || techStack.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Description and techStack are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey  = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) throw new Error('OnSpace AI not configured');

    // ── Auth + credit deduction ───────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    let userId: string | null = null;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (token) {
      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      const { data } = await supabaseAnon.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    const cost = MODEL_COST[model] ?? 10;

    if (userId) {
      // Ensure credits row exists (upsert with signup bonus)
      const { data: credits } = await supabaseAdmin
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (!credits) {
        // First time — give signup bonus
        await supabaseAdmin.from('user_credits').insert({
          user_id: userId,
          balance: 100,
          total_earned: 100,
          total_spent: 0,
        });
        await supabaseAdmin.from('credit_transactions').insert({
          user_id: userId,
          amount: 100,
          type: 'signup_bonus',
          description: 'Welcome bonus — 100 free coins',
        });
      }

      const balance = credits?.balance ?? 100;
      if (balance < cost) {
        return new Response(
          JSON.stringify({ error: `Insufficient coins. Need ${cost}, have ${balance}. Top up in Plans!`, code: 'insufficient_credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct coins
      await supabaseAdmin.from('user_credits')
        .update({ balance: balance - cost, total_spent: (await supabaseAdmin.from('user_credits').select('total_spent').eq('user_id', userId).single()).data?.total_spent ?? 0 + cost, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: userId,
        amount: -cost,
        type: 'generation',
        description: `Website generated with ${model} (${cost} coins)`,
      });

      console.log(`Deducted ${cost} coins from user ${userId}, model: ${model}`);
    }

    // ── Build prompt ──────────────────────────────────────────────────────────
    const aiModel = MODEL_MAP[model] ?? MODEL_MAP['dani-1.15'];
    const techList = techStack.join(', ');
    const includeReact = techStack.includes('react');
    const includeTypeScript = techStack.includes('typescript');

    const systemPrompt = `You are an elite vibe-coding AI that generates complete, production-ready websites. Output ONLY valid JSON — no markdown fences, no explanations, nothing else.`;

    const userPrompt = `Create a complete, modern website for this description:

"${description}"

Technologies: ${techList}
${includeReact ? 'Framework: React with hooks, functional components' : 'Vanilla HTML/CSS/JS'}
${includeTypeScript ? 'Language: TypeScript' : 'Language: JavaScript'}

Requirements:
- Beautiful, modern UI with smooth animations
- Fully responsive (mobile-first)
- Pink and purple gradient color scheme
- Well-structured, commented code
- Production-ready quality
- Use glassmorphism where appropriate
${includeReact ? '- Separate component files\n- Modern React patterns' : '- All interactivity in script.js'}

Return ONLY this JSON structure (no other text):
{
  "projectName": "kebab-case-name",
  "files": [
    {"path": "index.html", "content": "...complete file..."},
    {"path": "styles.css", "content": "...complete file..."},
    {"path": "script.js", "content": "...complete file..."}
  ]
}`;

    console.log(`Generating with model: ${aiModel} (${model})`);

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OnSpace AI error:', errText);
      throw new Error(`AI: ${errText}`);
    }

    const aiData   = await aiResponse.json();
    let aiText     = aiData.choices?.[0]?.message?.content ?? '';

    console.log('AI response length:', aiText.length);

    // Strip markdown fences if present
    aiText = aiText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let websiteData;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) websiteData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON parse error:', e);
    }

    if (!websiteData?.files?.length) {
      console.log('Falling back to template generator');
      websiteData = createFallbackWebsite(description, techStack);
    }

    return new Response(
      JSON.stringify({ ...websiteData, model, cost, newBalance: userId ? ((await supabaseAdmin.from('user_credits').select('balance').eq('user_id', userId).single()).data?.balance ?? 0) : null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('create-website error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function createFallbackWebsite(description: string, techStack: string[]) {
  const includeReact = techStack.includes('react');

  if (includeReact) {
    return {
      projectName: 'my-website',
      files: [
        { path: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Website</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="App.jsx"></script>\n</body>\n</html>` },
        { path: 'App.jsx', content: `import React, { useState } from 'react';\nimport './styles.css';\n\nexport default function App() {\n  return (\n    <div className="app">\n      <header className="header">\n        <h1>My Website</h1>\n        <p>Built with DANI ✨</p>\n      </header>\n      <main className="main">\n        <section className="hero">\n          <h2>${description}</h2>\n        </section>\n      </main>\n      <footer><p>Made with 💕 by DANI</p></footer>\n    </div>\n  );\n}` },
        { path: 'styles.css', content: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fce4ec,#f3e5f5);min-height:100vh}.header{background:linear-gradient(135deg,#ec4899,#a855f7);color:white;padding:3rem 2rem;text-align:center}.main{padding:2rem;max-width:1200px;margin:0 auto}.hero{background:rgba(255,255,255,.7);backdrop-filter:blur(10px);padding:2rem;border-radius:20px;border:2px solid rgba(236,72,153,.2)}footer{background:linear-gradient(135deg,#a855f7,#ec4899);color:white;padding:2rem;text-align:center}` },
      ]
    };
  }

  return {
    projectName: 'my-website',
    files: [
      { path: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Website</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <header class="header"><h1>My Website</h1><p>Built with DANI ✨</p></header>\n  <main class="main"><section class="hero"><h2>${description}</h2></section></main>\n  <footer><p>Made with 💕 by DANI</p></footer>\n  <script src="script.js"></script>\n</body>\n</html>` },
      { path: 'styles.css', content: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fce4ec,#f3e5f5);min-height:100vh}.header{background:linear-gradient(135deg,#ec4899,#a855f7);color:white;padding:3rem 2rem;text-align:center}.main{padding:2rem;max-width:1200px;margin:0 auto}.hero{background:rgba(255,255,255,.7);backdrop-filter:blur(10px);padding:2rem;border-radius:20px;border:2px solid rgba(236,72,153,.2)}footer{background:linear-gradient(135deg,#a855f7,#ec4899);color:white;padding:2rem;text-align:center}` },
      { path: 'script.js', content: `document.addEventListener('DOMContentLoaded',()=>{ console.log('Website ready! 💕'); });` },
    ]
  };
}
