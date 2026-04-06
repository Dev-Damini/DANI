import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Model mapping
const MODEL_MAP: Record<string, string> = {
  'dani-5.0':    'google/gemini-2.5-flash-lite',
  'dani-1.15':   'google/gemini-2.5-flash-lite', // legacy alias
  'primis-1.20': 'google/gemini-3-flash-preview',
  'lumi-5.3':    'google/gemini-3-pro-preview',
};

const MODEL_COST: Record<string, number> = {
  'dani-5.0':    10,
  'dani-1.15':   10, // legacy alias
  'primis-1.20': 30,
  'lumi-5.3':    75,
};

const DAILY_COINS = 500;

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
    let dailyRefreshGranted = 0;

    if (userId) {
      // Fetch existing credits
      const { data: credits } = await supabaseAdmin
        .from('user_credits')
        .select('balance, total_spent, total_earned, last_daily_refresh')
        .eq('user_id', userId)
        .single();

      if (!credits) {
        // First time — give signup bonus (500 coins)
        await supabaseAdmin.from('user_credits').insert({
          user_id: userId,
          balance: DAILY_COINS,
          total_earned: DAILY_COINS,
          total_spent: 0,
          last_daily_refresh: new Date().toISOString(),
        });
        await supabaseAdmin.from('credit_transactions').insert({
          user_id: userId,
          amount: DAILY_COINS,
          type: 'signup_bonus',
          description: `Welcome bonus — ${DAILY_COINS} free coins`,
        });
      } else {
        // ── Daily refresh check ─────────────────────────────────────────────
        const lastRefresh = credits.last_daily_refresh ? new Date(credits.last_daily_refresh) : null;
        const now = new Date();
        const hoursSince = lastRefresh
          ? (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60)
          : 999;

        if (hoursSince >= 24) {
          // Top up to 500 if below, or add 500 if already at/above 500
          const topUp = credits.balance < DAILY_COINS
            ? DAILY_COINS - credits.balance
            : DAILY_COINS;

          await supabaseAdmin.from('user_credits').update({
            balance: credits.balance + topUp,
            total_earned: (credits.total_earned ?? 0) + topUp,
            last_daily_refresh: now.toISOString(),
            updated_at: now.toISOString(),
          }).eq('user_id', userId);

          await supabaseAdmin.from('credit_transactions').insert({
            user_id: userId,
            amount: topUp,
            type: 'daily_refresh',
            description: `Daily coin refresh — +${topUp} coins`,
          });

          dailyRefreshGranted = topUp;
          console.log(`Daily refresh: +${topUp} coins for user ${userId}`);
        }
      }

      // Re-fetch balance after any refresh
      const { data: freshCredits } = await supabaseAdmin
        .from('user_credits')
        .select('balance, total_spent')
        .eq('user_id', userId)
        .single();

      const balance = freshCredits?.balance ?? DAILY_COINS;

      if (balance < cost) {
        return new Response(
          JSON.stringify({
            error: `Insufficient coins. Need ${cost}, have ${balance}. Top up in Plans!`,
            code: 'insufficient_credits',
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct coins
      const newBalance = balance - cost;
      const newTotalSpent = (freshCredits?.total_spent ?? 0) + cost;
      await supabaseAdmin.from('user_credits').update({
        balance: newBalance,
        total_spent: newTotalSpent,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: userId,
        amount: -cost,
        type: 'generation',
        description: `Website generated with ${model} (${cost} coins)`,
      });

      console.log(`Deducted ${cost} coins from user ${userId}, model: ${model}, new balance: ${newBalance}`);
    }

    // ── Build prompt ──────────────────────────────────────────────────────────
    const aiModel = MODEL_MAP[model] ?? MODEL_MAP['dani-1.15'];
    const includeReact = techStack.includes('react');
    const includeTypeScript = techStack.includes('typescript');
    const includeVite = techStack.includes('vite');

    // Determine the stack label
    let stackLabel = 'HTML + CSS + JavaScript';
    if (includeReact && includeTypeScript) stackLabel = 'TypeScript + React + Vite';
    else if (includeReact) stackLabel = 'JavaScript + React + Vite';

    const systemPrompt = `You are an elite vibe-coding AI — like Cursor, Bolt, or v0. You generate complete, beautiful, production-ready websites and apps. Output ONLY valid JSON — no markdown fences, no explanations, no commentary outside the JSON.`;

    let fileSpec = '';
    if (includeReact && includeTypeScript) {
      fileSpec = `Return files for a TypeScript React Vite app:
- index.html (Vite entry)
- src/App.tsx (main React component with full UI)
- src/main.tsx (Vite entry point: ReactDOM.createRoot)
- src/index.css (global styles, animations)

Use: TypeScript, React hooks (useState, useEffect, useCallback), Tailwind or pure CSS.
No external CDN imports needed — write all CSS inline in index.css.`;
    } else if (includeReact) {
      fileSpec = `Return files for a JavaScript React Vite app:
- index.html (Vite entry)
- src/App.jsx (main React component with full UI)
- src/main.jsx (Vite entry: ReactDOM.createRoot)
- src/index.css (global styles)

Use modern React hooks, clean JSX, beautiful CSS.`;
    } else {
      fileSpec = `Return files for a vanilla HTML/CSS/JS website:
- index.html (complete, self-contained HTML with linked CSS/JS)
- styles.css (complete CSS with animations and responsive design)
- script.js (complete JavaScript with all interactivity)

All files must be complete and functional when opened together.`;
    }

    const userPrompt = `Build a complete, stunning app/website for this description:

"${description}"

Stack: ${stackLabel}

${fileSpec}

Design requirements:
- Beautiful, modern UI with smooth CSS animations and transitions
- Fully responsive (mobile-first, works on all screen sizes)
- Professional color scheme with gradients (pink/purple or brand-appropriate)
- Glassmorphism cards, smooth hover effects, micro-interactions
- Well-commented, production-quality code
- Complete implementation — no placeholder TODO comments, all features working

Return ONLY this exact JSON structure (no other text, no markdown):
{
  "projectName": "kebab-case-project-name",
  "files": [
    {"path": "index.html", "content": "...complete file content..."},
    {"path": "styles.css", "content": "...complete file content..."},
    {"path": "script.js", "content": "...complete file content..."}
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

    const aiData = await aiResponse.json();
    let aiText   = aiData.choices?.[0]?.message?.content ?? '';

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

    // Get final balance for response
    const { data: finalCredits } = userId
      ? await supabaseAdmin.from('user_credits').select('balance').eq('user_id', userId).single()
      : { data: null };

    return new Response(
      JSON.stringify({
        ...websiteData,
        model,
        cost,
        newBalance: finalCredits?.balance ?? null,
        dailyRefreshGranted,
      }),
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
  const includeTypeScript = techStack.includes('typescript');

  if (includeReact && includeTypeScript) {
    return {
      projectName: 'my-project',
      files: [
        { path: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My App</title>\n  <link rel="stylesheet" href="/src/index.css">\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>` },
        { path: 'src/main.tsx', content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);` },
        { path: 'src/App.tsx', content: `import React from 'react';\n\nexport default function App(): React.JSX.Element {\n  return (\n    <div className="app">\n      <header>\n        <h1>My App</h1>\n        <p>Built with DANI ✨</p>\n      </header>\n      <main>\n        <section className="hero">\n          <h2>${description}</h2>\n        </section>\n      </main>\n      <footer><p>Made with 💕 by DANI</p></footer>\n    </div>\n  );\n}` },
        { path: 'src/index.css', content: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fce4ec,#f3e5f5);min-height:100vh}header{background:linear-gradient(135deg,#ec4899,#a855f7);color:white;padding:3rem 2rem;text-align:center}main{padding:2rem;max-width:1200px;margin:0 auto}.hero{background:rgba(255,255,255,.7);backdrop-filter:blur(10px);padding:2rem;border-radius:20px;border:2px solid rgba(236,72,153,.2)}footer{background:linear-gradient(135deg,#a855f7,#ec4899);color:white;padding:2rem;text-align:center}` },
      ]
    };
  }

  if (includeReact) {
    return {
      projectName: 'my-project',
      files: [
        { path: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My App</title>\n  <link rel="stylesheet" href="/src/index.css">\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>` },
        { path: 'src/main.jsx', content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);` },
        { path: 'src/App.jsx', content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="app">\n      <header>\n        <h1>My App</h1>\n        <p>Built with DANI ✨</p>\n      </header>\n      <main>\n        <section className="hero">\n          <h2>${description}</h2>\n        </section>\n      </main>\n      <footer><p>Made with 💕 by DANI</p></footer>\n    </div>\n  );\n}` },
        { path: 'src/index.css', content: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fce4ec,#f3e5f5);min-height:100vh}header{background:linear-gradient(135deg,#ec4899,#a855f7);color:white;padding:3rem 2rem;text-align:center}main{padding:2rem;max-width:1200px;margin:0 auto}.hero{background:rgba(255,255,255,.7);backdrop-filter:blur(10px);padding:2rem;border-radius:20px;border:2px solid rgba(236,72,153,.2)}footer{background:linear-gradient(135deg,#a855f7,#ec4899);color:white;padding:2rem;text-align:center}` },
      ]
    };
  }

  return {
    projectName: 'my-project',
    files: [
      { path: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Website</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <header><h1>My Website</h1><p>Built with DANI ✨</p></header>\n  <main><section class="hero"><h2>${description}</h2></section></main>\n  <footer><p>Made with 💕 by DANI</p></footer>\n  <script src="script.js"></script>\n</body>\n</html>` },
      { path: 'styles.css', content: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fce4ec,#f3e5f5);min-height:100vh}header{background:linear-gradient(135deg,#ec4899,#a855f7);color:white;padding:3rem 2rem;text-align:center}main{padding:2rem;max-width:1200px;margin:0 auto}.hero{background:rgba(255,255,255,.7);backdrop-filter:blur(10px);padding:2rem;border-radius:20px;border:2px solid rgba(236,72,153,.2)}footer{background:linear-gradient(135deg,#a855f7,#ec4899);color:white;padding:2rem;text-align:center}` },
      { path: 'script.js', content: `document.addEventListener('DOMContentLoaded',()=>{ console.log('Ready! 💕'); });` },
    ]
  };
}
