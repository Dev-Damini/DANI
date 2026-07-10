import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const OMEGATECH_BASE = 'https://omegatech-api.dixonomega.tech/api/ai';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const MODEL_COST: Record<string, number> = {
  'dani-aq': 10,
};

const DAILY_COINS = 500;

// ─── Gemini website generator ──────────────────────────────────────────────────
async function generateWithGemini(prompt: string, techStack: string[]): Promise<{
  projectName: string;
  files: { path: string; content: string }[];
}> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Gemini key not configured');

  const includeReact = techStack.includes('react');
  const includeTypeScript = techStack.includes('typescript');

  let stackLabel = 'HTML + CSS + JavaScript';
  if (includeReact && includeTypeScript) stackLabel = 'TypeScript + React (using CDN, no build tool)';
  else if (includeReact) stackLabel = 'JavaScript + React (using CDN, no build tool)';

  const fileStructure = includeReact ? `
Return these files:
- index.html (includes React CDN scripts + Babel standalone for JSX)
- src/App.jsx or src/App.tsx (main React component — full implementation)
- src/index.css (complete CSS)

IMPORTANT for React: The index.html must include:
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
And the main script tag must have type="text/babel"` : `
Return these files:
- index.html (complete self-contained HTML with embedded CSS and JS)
- styles.css (complete CSS)
- script.js (complete JavaScript)`;

  const sysPrompt = `You are an expert web developer. Build a complete, production-ready, FULLY FUNCTIONAL web application.

CRITICAL RULES:
1. Write COMPLETE, working code — no placeholders, no TODOs, no "add your content here"
2. Make it visually stunning with real content relevant to the request
3. Include all features described in the request, fully implemented
4. Use modern CSS: gradients, animations, glassmorphism, shadows, hover effects
5. Make it mobile-responsive
6. Include real sample data/content (not Lorem Ipsum)
7. ALL JavaScript must be functional — buttons work, forms submit, interactions animate

Stack: ${stackLabel}
${fileStructure}

Return ONLY valid JSON (no markdown, no extra text):
{"projectName":"kebab-case-name","files":[{"path":"...","content":"...full code here..."}]}`;

  const userPrompt = `Build this web app: ${prompt}

Make it complete, polished, and fully functional with real content. Every feature must work.`;

  const body = {
    system_instruction: { parts: [{ text: sysPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      topP: 0.95,
    },
  };

  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(110000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawContent: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!rawContent) throw new Error('Gemini: empty response');

  let cleaned = rawContent.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.files?.length) return parsed;
    }
  } catch (e) {
    console.error('JSON parse error:', (e as Error).message, 'content:', cleaned.slice(0, 200));
  }

  // Try LlamaCoder as fallback
  console.log('Gemini JSON parse failed, trying LlamaCoder fallback...');
  return await llamaCoderGenerate(prompt, techStack);
}

// ─── LlamaCoder fallback ──────────────────────────────────────────────────────
async function llamaCoderGenerate(
  prompt: string,
  techStack: string[]
): Promise<{ projectName: string; files: { path: string; content: string }[] }> {
  const params = new URLSearchParams({ action: 'create', quality: 'high' });
  const body = { message: prompt, sessionId: crypto.randomUUID() };

  try {
    const res = await fetch(`${OMEGATECH_BASE}/llamacoder?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });

    if (res.ok) {
      const data = await res.json();
      const rawContent: string = data?.message || data?.response || data?.content || data?.code || '';
      if (rawContent) {
        let cleaned = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        try {
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed?.files?.length) return parsed;
          }
        } catch { /* fall through */ }
      }
    }
  } catch (e) {
    console.log('LlamaCoder failed:', (e as Error).message);
  }

  return createFallbackWebsite(prompt, techStack);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, techStack, model = 'dani-aq', sessionId } = await req.json();

    if (!description || !techStack || techStack.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Description and techStack are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      const { data: credits } = await supabaseAdmin
        .from('user_credits')
        .select('balance, total_spent, total_earned, last_daily_refresh')
        .eq('user_id', userId)
        .single();

      if (!credits) {
        await supabaseAdmin.from('user_credits').insert({
          user_id: userId, balance: DAILY_COINS, total_earned: DAILY_COINS,
          total_spent: 0, last_daily_refresh: new Date().toISOString(),
        });
      } else {
        const lastRefresh = credits.last_daily_refresh ? new Date(credits.last_daily_refresh) : null;
        const now = new Date();
        const hoursSince = lastRefresh ? (now.getTime() - lastRefresh.getTime()) / 3_600_000 : 999;

        if (hoursSince >= 24) {
          const topUp = credits.balance < DAILY_COINS ? DAILY_COINS - credits.balance : DAILY_COINS;
          await supabaseAdmin.from('user_credits').update({
            balance: credits.balance + topUp,
            total_earned: (credits.total_earned ?? 0) + topUp,
            last_daily_refresh: now.toISOString(),
            updated_at: now.toISOString(),
          }).eq('user_id', userId);
          dailyRefreshGranted = topUp;
        }
      }

      const { data: freshCredits } = await supabaseAdmin
        .from('user_credits').select('balance, total_spent').eq('user_id', userId).single();
      const balance = freshCredits?.balance ?? DAILY_COINS;

      if (balance < cost) {
        return new Response(
          JSON.stringify({ error: `Insufficient coins. Need ${cost}, have ${balance}.`, code: 'insufficient_credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin.from('user_credits').update({
        balance: balance - cost,
        total_spent: (freshCredits?.total_spent ?? 0) + cost,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);

      await supabaseAdmin.from('credit_transactions').insert({
        user_id: userId, amount: -cost, type: 'generation',
        description: `Website generated with ${model} (${cost} coins)`,
      });
    }

    console.log('Generating website with Gemini, prompt:', description.slice(0, 80));
    const result = await generateWithGemini(description, techStack);

    const { data: finalCredits } = userId
      ? await supabaseAdmin.from('user_credits').select('balance').eq('user_id', userId).single()
      : { data: null };

    return new Response(
      JSON.stringify({
        projectName: result.projectName,
        files: result.files,
        sessionId: sessionId || crypto.randomUUID(),
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
  const title = description.slice(0, 60);

  if (includeReact) {
    return {
      projectName: 'my-project',
      files: [
        { path: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="src/index.css"></head>\n<body style="margin:0"><div id="root"></div>\n<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>\n<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>\n<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n<script type="text/babel" src="src/App.jsx"></script>\n</body>\n</html>` },
        { path: 'src/App.jsx', content: `function App() {\n  const [count, setCount] = React.useState(0);\n  return (\n    <div className="app">\n      <header><h1>✨ ${title}</h1></header>\n      <main><section className="hero"><h2>Welcome!</h2><p>Your app is ready.</p><button onClick={() => setCount(c => c + 1)}>Clicked {count} times</button></section></main>\n    </div>\n  );\n}\nReactDOM.createRoot(document.getElementById('root')).render(<App />);` },
        { path: 'src/index.css', content: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fce4ec,#f3e5f5);min-height:100vh}header{background:linear-gradient(135deg,#ec4899,#a855f7);color:white;padding:3rem 2rem;text-align:center}header h1{font-size:2.5rem;font-weight:900}.hero{padding:3rem;text-align:center}button{margin-top:1rem;padding:.875rem 2rem;background:linear-gradient(135deg,#ec4899,#a855f7);color:white;border:none;border-radius:50px;font-size:1rem;font-weight:700;cursor:pointer}` },
      ]
    };
  }

  return {
    projectName: 'my-project',
    files: [
      { path: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="styles.css"></head>\n<body><header><h1>✨ ${title}</h1></header><main><section class="hero"><h2>${title}</h2><p>Built with AI — ready to customize!</p><button onclick="this.textContent='Clicked!'">Try me</button></section></main><script src="script.js"></script></body>\n</html>` },
      { path: 'styles.css', content: `*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fce4ec,#f3e5f5);min-height:100vh}header{background:linear-gradient(135deg,#ec4899,#a855f7);color:white;padding:3rem 2rem;text-align:center;font-size:2rem;font-weight:900}main{padding:2rem;max-width:1200px;margin:0 auto}.hero{background:rgba(255,255,255,.8);padding:3rem;border-radius:24px;text-align:center}button{margin-top:1rem;padding:.875rem 2rem;background:linear-gradient(135deg,#ec4899,#a855f7);color:white;border:none;border-radius:50px;font-size:1rem;font-weight:700;cursor:pointer}` },
      { path: 'script.js', content: `document.addEventListener('DOMContentLoaded', () => { console.log('Ready! 💕'); });` },
    ]
  };
}
