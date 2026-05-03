import { corsHeaders } from '../_shared/cors.ts';

const WAN_BASE = 'https://omegatech-api.dixonomega.tech/api/ai';

async function wanGenerateVideo(prompt: string): Promise<string> {
  // Step 1: Initiate video generation
  const initRes = await fetch(`${WAN_BASE}/wan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(20000),
  });

  if (!initRes.ok) {
    const txt = await initRes.text();
    throw new Error(`WAN initiation failed (${initRes.status}): ${txt}`);
  }

  const initData = await initRes.json();
  console.log('WAN init response:', JSON.stringify(initData));

  if (!initData.success || !initData.task_id) {
    throw new Error(`WAN API: no task_id returned. Response: ${JSON.stringify(initData)}`);
  }

  const taskId = initData.task_id;

  // Step 2: Poll for result (max 20 attempts × 5s = 100s)
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 5000));

    try {
      const checkRes = await fetch(
        `${WAN_BASE}/nano-banana2-result?task_id=${taskId}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!checkRes.ok) {
        console.log(`Poll attempt ${attempt + 1}: HTTP ${checkRes.status}`);
        continue;
      }

      const check = await checkRes.json();
      console.log(`Poll attempt ${attempt + 1}:`, JSON.stringify(check));

      if (check.status === 'completed') {
        // Try multiple fields for video URL
        const videoUrl =
          check.video_url ||
          check.output ||
          check.result ||
          check.url ||
          check.data?.video_url ||
          check.data?.url;

        if (videoUrl && typeof videoUrl === 'string' && videoUrl.startsWith('http')) {
          return videoUrl;
        }
        throw new Error(`WAN completed but no video URL found: ${JSON.stringify(check)}`);
      }

      if (check.status === 'failed') {
        throw new Error(`WAN task failed: ${check.error || check.message || 'unknown reason'}`);
      }

      // Still processing — continue polling
      console.log(`WAN status: ${check.status || 'processing'}, attempt ${attempt + 1}/20`);
    } catch (pollErr) {
      if ((pollErr as Error).message.includes('WAN task failed') || (pollErr as Error).message.includes('no video URL')) {
        throw pollErr;
      }
      console.log(`Poll error (non-fatal):`, (pollErr as Error).message);
    }
  }

  throw new Error('WAN video generation timed out after ~100 seconds');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    let prompt: string;
    try {
      const body = await req.json();
      prompt = body?.prompt;
      if (!prompt || typeof prompt !== 'string') throw new Error('Missing or invalid "prompt" in request body');
    } catch (e: unknown) {
      return new Response(
        JSON.stringify({ error: `Body parse failed: ${(e as Error).message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('WAN video generation request, prompt:', prompt.slice(0, 100));

    const videoUrl = await wanGenerateVideo(prompt);

    console.log('WAN video generation success:', videoUrl);

    return new Response(
      JSON.stringify({ video_url: videoUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('generate-video-ai error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
