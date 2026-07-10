import { corsHeaders } from '../_shared/cors.ts';

const OMEGATECH_BASE = 'https://omegatech-api.dixonomega.tech/api/ai';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enc = encodeURIComponent(prompt.trim());
    console.log('Music generation request:', prompt.slice(0, 80));

    // ── Attempt 1: sonu3 with action=full (async polling pattern) ────────────
    try {
      const url = `${OMEGATECH_BASE}/sonu3?action=full&prompt=${enc}`;
      console.log('Calling sonu3...');

      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(55000), // 55s — stay within edge fn limit
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        console.log('Sonu3 response content-type:', contentType);

        // Direct audio binary
        if (contentType.startsWith('audio/') || contentType === 'application/octet-stream') {
          const binary = await response.arrayBuffer();
          const arr = new Uint8Array(binary);
          const b64 = btoa(String.fromCharCode(...arr));
          const mime = contentType.startsWith('audio/') ? contentType : 'audio/mpeg';
          return new Response(
            JSON.stringify({ audio_url: `data:${mime};base64,${b64}`, title: prompt.slice(0, 50), type: 'base64' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (contentType.includes('json')) {
          const data = await response.json();
          console.log('Sonu3 JSON response keys:', Object.keys(data));

          const audioUrl =
            data?.audio_url || data?.url || data?.music_url || data?.result ||
            data?.data?.url || data?.data?.audio_url || data?.output || data?.link;

          if (audioUrl && typeof audioUrl === 'string') {
            return new Response(
              JSON.stringify({ audio_url: audioUrl, title: data?.title || prompt.slice(0, 50), type: 'url' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Async task — quick poll (max 40s)
          const taskId = data?.task_id || data?.taskId || data?.id;
          if (taskId) {
            console.log('Sonu3 async task:', taskId);
            const finalUrl = await pollMusicTask(taskId, 8, 4000); // 8×4s = 32s
            return new Response(
              JSON.stringify({ audio_url: finalUrl, title: prompt.slice(0, 50), type: 'url' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Binary fallback
        const binary = await response.arrayBuffer();
        if (binary.byteLength > 1000) {
          const arr = new Uint8Array(binary);
          const b64 = btoa(String.fromCharCode(...arr));
          return new Response(
            JSON.stringify({ audio_url: `data:audio/mpeg;base64,${b64}`, title: prompt.slice(0, 50), type: 'base64' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      console.log('Sonu3 returned non-ok status:', response.status);
    } catch (e1) {
      console.log('Sonu3 attempt failed:', (e1 as Error).message);
    }

    // ── Attempt 2: sonu3 without action param ─────────────────────────────────
    try {
      const url2 = `${OMEGATECH_BASE}/sonu3?prompt=${enc}`;
      const r2 = await fetch(url2, { method: 'GET', signal: AbortSignal.timeout(50000) });
      if (r2.ok) {
        const ct2 = r2.headers.get('content-type') || '';
        if (ct2.startsWith('audio/')) {
          const bin = await r2.arrayBuffer();
          const arr = new Uint8Array(bin);
          const b64 = btoa(String.fromCharCode(...arr));
          return new Response(
            JSON.stringify({ audio_url: `data:${ct2};base64,${b64}`, title: prompt.slice(0, 50), type: 'base64' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (ct2.includes('json')) {
          const d2 = await r2.json();
          const u2 = d2?.audio_url || d2?.url || d2?.result;
          if (u2) return new Response(
            JSON.stringify({ audio_url: u2, title: prompt.slice(0, 50), type: 'url' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (e2) {
      console.log('Sonu3 attempt 2 failed:', (e2 as Error).message);
    }

    throw new Error('Music generation timed out — please try a shorter prompt or try again in a moment.');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('generate-music-ai error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function pollMusicTask(taskId: string, maxAttempts = 8, intervalMs = 4000): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    try {
      const res = await fetch(
        `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'completed') {
        const url = data.audio_url || data.url || data.result || data.output;
        if (url) return url;
        throw new Error('Task completed but no audio URL');
      }
      if (data.status === 'failed') throw new Error('Music task failed');
      console.log(`Poll ${i + 1}/${maxAttempts}: ${data.status || 'pending'}`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('failed') || msg.includes('no audio')) throw e;
    }
  }
  throw new Error('Music generation timed out');
}
