import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ─── Image Generation Endpoints (with fallbacks) ──────────────────────────────
function getImageEndpoints(prompt: string) {
  const enc = encodeURIComponent(prompt);
  const neg = encodeURIComponent('blurry, low quality, distorted, watermark, text');
  return [
    { url: `https://image.pollinations.ai/prompt/${enc}?width=1024&height=1024&nologo=true&seed=${Date.now()}`, binary: true },
    { url: `https://apis.prexzyvilla.site/ai/realistic?prompt=${enc}&negative_prompt=${neg}`, binary: false },
    { url: `https://api.ryzendesu.vip/api/ai/imagine?prompt=${enc}`, binary: false },
    { url: `https://api.siputzx.my.id/api/ai/text2image?prompt=${enc}`, binary: true },
    { url: `https://widipe.com/imagine?prompt=${enc}`, binary: false },
    { url: `https://itzpire.site/api/ai/text2img?prompt=${enc}`, binary: false },
    { url: `https://api.nekorinn.my.id/ai/imagine?prompt=${enc}`, binary: false },
  ];
}

function extractImageUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const keys = ['image', 'image_url', 'url', 'result', 'data', 'output', 'link', 'img'];
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:'))) return val;
    if (val && typeof val === 'object') {
      const nested = extractImageUrl(val);
      if (nested) return nested;
    }
  }
  return null;
}

// ─── Flux Image Edit (polling) ────────────────────────────────────────────────
async function fluxEditImage(imageUrl: string, prompt: string): Promise<string> {
  const baseUrl = 'https://omegatech-api.dixonomega.tech/api/ai';

  // Step 1: Upload image to tmp host
  let uploadedUrl = imageUrl;

  // If it's a data URL, we need to upload it
  if (imageUrl.startsWith('data:')) {
    const uploadRes = await fetch('https://tmp.malvryx.dev/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: imageUrl, type: 'permanent' }),
      signal: AbortSignal.timeout(15000),
    });
    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      uploadedUrl = uploadData?.cdnUrl || uploadData?.directUrl || uploadData?.url || imageUrl;
    }
  }

  // Step 2: Initiate edit
  const initRes = await fetch(`${baseUrl}/flux-pro2-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image1: uploadedUrl,
      prompt,
      aspect_ratio: 'auto',
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!initRes.ok) throw new Error(`Flux edit initiation failed: ${initRes.status}`);
  const initData = await initRes.json();

  if (!initData.success || !initData.task_id) {
    throw new Error('Flux API: no task_id returned');
  }

  const taskId = initData.task_id;

  // Step 3: Poll for result (max 15 attempts × 5s = 75s)
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise(r => setTimeout(r, 5000));
    const checkRes = await fetch(`${baseUrl}/nano-banana2-result?task_id=${taskId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!checkRes.ok) continue;
    const check = await checkRes.json();
    if (check.status === 'completed' && check.image_url) return check.image_url;
    if (check.status === 'failed') throw new Error('Flux: task failed on server');
  }

  throw new Error('Flux: generation timed out');
}

// ─── Flux Image Generate ──────────────────────────────────────────────────────
async function fluxGenerateImage(prompt: string): Promise<string> {
  const baseUrl = 'https://omegatech-api.dixonomega.tech/api/ai';
  const enc = encodeURIComponent(prompt);

  const initRes = await fetch(`${baseUrl}/flux-pro2?prompt=${enc}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!initRes.ok) throw new Error(`Flux generate failed: ${initRes.status}`);
  const initData = await initRes.json();
  if (!initData.success || !initData.task_id) throw new Error('Flux: no task_id');

  const taskId = initData.task_id;
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise(r => setTimeout(r, 5000));
    const checkRes = await fetch(`${baseUrl}/nano-banana2-result?task_id=${taskId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!checkRes.ok) continue;
    const check = await checkRes.json();
    if (check.status === 'completed' && check.image_url) return check.image_url;
    if (check.status === 'failed') throw new Error('Flux: task failed');
  }
  throw new Error('Flux: timed out');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style, editImageUrl, useFlux } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Style enhancement
    const stylePrompts: Record<string, string> = {
      realistic: 'ultra-realistic, photographic, high resolution, detailed, professional',
      artistic: 'beautiful artistic illustration, painterly, vibrant colors, creative',
      anime: 'anime style, detailed anime artwork, colorful, expressive',
      abstract: 'abstract art, modern, vivid colors, creative composition',
      fantasy: 'fantasy art, magical, detailed, cinematic lighting',
    };
    const enhancedPrompt = `${prompt}. ${stylePrompts[style] || stylePrompts.realistic}`;

    let imageUrl: string | null = null;

    // ── Image editing mode (Flux) ───────────────────────────────────────────
    if (editImageUrl) {
      console.log('Flux edit mode, prompt:', prompt);
      imageUrl = await fluxEditImage(editImageUrl, enhancedPrompt);
    }
    // ── Flux generation (useFlux flag or fallback) ──────────────────────────
    else if (useFlux) {
      console.log('Flux generate mode');
      imageUrl = await fluxGenerateImage(enhancedPrompt);
    }
    // ── Standard endpoints with fallback ───────────────────────────────────
    else {
      const endpoints = getImageEndpoints(enhancedPrompt);
      for (const ep of endpoints) {
        try {
          console.log('Trying image endpoint:', ep.url.split('?')[0]);
          const res = await fetch(ep.url, { signal: AbortSignal.timeout(20000) });
          if (!res.ok) continue;

          if (ep.binary) {
            const contentType = res.headers.get('content-type') || 'image/jpeg';
            if (contentType.startsWith('image/')) {
              const blob = await res.blob();
              const arr = new Uint8Array(await blob.arrayBuffer());
              const b64 = btoa(String.fromCharCode(...arr));
              imageUrl = `data:${contentType};base64,${b64}`;
              break;
            }
          } else {
            const data = await res.json();
            const extracted = extractImageUrl(data);
            if (extracted) { imageUrl = extracted; break; }
          }
        } catch (e) {
          console.log('Image endpoint failed:', ep.url.split('?')[0], (e as Error).message);
        }
      }
    }

    if (!imageUrl) throw new Error('All image generation endpoints failed');

    // ── Save to storage if authenticated ────────────────────────────────────
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

    if (user && imageUrl.startsWith('data:')) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const blob = new Blob([binaryData], { type: 'image/png' });
        const fileName = `${user.id}/${crypto.randomUUID()}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, blob, { contentType: 'image/png', cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('generated-images')
            .getPublicUrl(fileName);

          await supabaseAdmin.from('generated_images').insert({
            user_id: user.id,
            prompt,
            style: style || 'realistic',
            image_url: publicUrl,
            file_path: fileName,
          });

          return new Response(
            JSON.stringify({ image_url: publicUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (storageErr) {
        console.error('Storage error (non-fatal):', storageErr);
      }
    }

    return new Response(
      JSON.stringify({ image_url: imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('generate-image-ai error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
