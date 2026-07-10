import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const OMEGATECH_BASE = 'https://omegatech-api.dixonomega.tech/api/ai';

// ─── Generate: nano-banana-pro ────────────────────────────────────────────────
async function generateImage(prompt: string): Promise<string> {
  const enc = encodeURIComponent(prompt);
  console.log('Image generate with nano-banana-pro, prompt:', prompt.slice(0, 60));

  // Try nano-banana-pro first (better quality)
  try {
    const res = await fetch(`${OMEGATECH_BASE}/nano-banana-pro?prompt=${enc}`, {
      method: 'GET',
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.startsWith('image/')) {
        const binary = await res.arrayBuffer();
        const arr = new Uint8Array(binary);
        const b64 = btoa(String.fromCharCode(...arr));
        return `data:${ct};base64,${b64}`;
      }
      if (ct.includes('json')) {
        const data = await res.json();
        const url = data?.image_url || data?.url || data?.result || data?.output;
        if (url) return url;
        // Async task
        if (data?.task_id) return await pollImageTask(data.task_id);
      }
    }
  } catch (e) {
    console.log('nano-banana-pro failed:', (e as Error).message);
  }

  // Fallback: flux-pro2 with polling
  try {
    const initRes = await fetch(`${OMEGATECH_BASE}/flux-pro2?prompt=${enc}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (initRes.ok) {
      const initData = await initRes.json();
      if (initData?.task_id) return await pollImageTask(initData.task_id);
    }
  } catch (e) {
    console.log('flux-pro2 failed:', (e as Error).message);
  }

  // Last fallback: pollinations
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${enc}?width=1024&height=1024&nologo=true&model=flux&seed=${Date.now()}`;
  const polRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(25000) });
  if (polRes.ok) {
    const ct = polRes.headers.get('content-type') || 'image/jpeg';
    const binary = await polRes.arrayBuffer();
    const arr = new Uint8Array(binary);
    const b64 = btoa(String.fromCharCode(...arr));
    return `data:${ct};base64,${b64}`;
  }

  throw new Error('All image generation methods failed');
}

// ─── Edit: nano-banana (simple) ───────────────────────────────────────────────
async function editImage(imageUrl: string, prompt: string): Promise<string> {
  console.log('Image edit with nano-banana, prompt:', prompt.slice(0, 60));

  // If data URL, upload to get a real URL
  let uploadedUrl = imageUrl;
  if (imageUrl.startsWith('data:')) {
    try {
      // Try to upload to get a CDN URL
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const binary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const blob = new Blob([binary], { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', blob, 'image.png');

      // Try multiple upload services
      const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(15000),
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        const tmpUrl = uploadData?.data?.url;
        if (tmpUrl) {
          // Convert tmpfiles.org URL to direct download
          uploadedUrl = tmpUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        }
      }
    } catch (e) {
      console.log('Upload failed, trying direct:', (e as Error).message);
    }
  }

  const enc = encodeURIComponent(prompt);
  const imgEnc = encodeURIComponent(uploadedUrl);

  // nano-banana edit endpoint
  try {
    const res = await fetch(`${OMEGATECH_BASE}/nano-banana?image=${imgEnc}&prompt=${enc}`, {
      method: 'GET',
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.startsWith('image/')) {
        const binary = await res.arrayBuffer();
        const arr = new Uint8Array(binary);
        const b64 = btoa(String.fromCharCode(...arr));
        return `data:${ct};base64,${b64}`;
      }
      if (ct.includes('json')) {
        const data = await res.json();
        const url = data?.image_url || data?.url || data?.result || data?.output;
        if (url) return url;
        if (data?.task_id) return await pollImageTask(data.task_id);
      }
    }
  } catch (e) {
    console.log('nano-banana edit failed:', (e as Error).message);
  }

  // Fallback: nano-banana2 async edit
  try {
    const res = await fetch(`${OMEGATECH_BASE}/nano-banana2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: uploadedUrl, prompt }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.task_id) return await pollImageTask(data.task_id);
      const url = data?.image_url || data?.url || data?.result;
      if (url) return url;
    }
  } catch (e) {
    console.log('nano-banana2 edit failed:', (e as Error).message);
  }

  // Last fallback: flux edit
  try {
    const initRes = await fetch(`${OMEGATECH_BASE}/flux-pro2-edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image1: uploadedUrl, prompt, aspect_ratio: 'auto' }),
      signal: AbortSignal.timeout(20000),
    });
    if (initRes.ok) {
      const initData = await initRes.json();
      if (initData?.task_id) return await pollImageTask(initData.task_id);
    }
  } catch (e) {
    console.log('flux-edit fallback failed:', (e as Error).message);
  }

  throw new Error('Image editing failed — all methods exhausted');
}

// ─── Polling ─────────────────────────────────────────────────────────────────
async function pollImageTask(taskId: string, maxAttempts = 18): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const res = await fetch(`${OMEGATECH_BASE}/nano-banana2-result?task_id=${taskId}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const check = await res.json();
      console.log(`Poll ${attempt + 1}: ${check.status}`);
      if (check.status === 'completed') {
        const url = check.image_url || check.url || check.result || check.output;
        if (url) return url;
        throw new Error('Task completed but no image URL');
      }
      if (check.status === 'failed') throw new Error('Image task failed on server');
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('failed') || msg.includes('no image')) throw e;
    }
  }
  throw new Error('Image generation timed out');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style, editImageUrl } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stylePrompts: Record<string, string> = {
      realistic: 'ultra-realistic, photorealistic, high resolution, 8K, professional photography',
      artistic: 'beautiful artistic illustration, painterly, vibrant colors, award-winning art',
      anime: 'high quality anime style, detailed, vibrant, expressive',
      abstract: 'abstract digital art, modern, vivid colors, creative surreal composition',
      fantasy: 'epic fantasy art, magical atmosphere, dramatic lighting, detailed',
    };
    const enhancedPrompt = `${prompt}. ${stylePrompts[style] || stylePrompts.realistic}`;

    let imageUrl: string | null = null;

    if (editImageUrl) {
      console.log('Mode: edit image');
      imageUrl = await editImage(editImageUrl, enhancedPrompt);
    } else {
      console.log('Mode: generate image');
      imageUrl = await generateImage(enhancedPrompt);
    }

    if (!imageUrl) throw new Error('Image generation returned no result');

    // Save to storage if authenticated
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

    if (user && imageUrl.startsWith('data:')) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `${user.id}/${crypto.randomUUID()}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, new Blob([binaryData], { type: 'image/png' }), {
            contentType: 'image/png', cacheControl: '3600', upsert: false
          });
        if (!uploadError) {
          const { data: { publicUrl } } = supabaseAdmin.storage.from('generated-images').getPublicUrl(fileName);
          await supabaseAdmin.from('generated_images').insert({
            user_id: user.id, prompt, style: style || 'realistic',
            image_url: publicUrl, file_path: fileName,
          }).catch(() => {});
          return new Response(
            JSON.stringify({ image_url: publicUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('Storage error (non-fatal):', e);
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
