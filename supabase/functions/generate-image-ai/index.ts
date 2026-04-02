import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('OnSpace AI not configured');
    }

    // Style enhancement
    const stylePrompts: Record<string, string> = {
      realistic: 'ultra-realistic, photographic, high resolution, detailed',
      artistic: 'beautiful artistic illustration, painterly, vibrant colors, creative',
      anime: 'anime style, detailed anime artwork, colorful, expressive',
      abstract: 'abstract art, modern, vivid colors, creative composition',
      fantasy: 'fantasy art, magical, detailed, cinematic lighting',
    };

    const enhancedPrompt = `${prompt}. Style: ${stylePrompts[style] || stylePrompts.realistic}. High quality, detailed.`;

    console.log('Generating image with OnSpace AI, prompt:', enhancedPrompt);

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: enhancedPrompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OnSpace AI error:', errorText);
      throw new Error(`Image generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('OnSpace AI response received');

    // Extract image from response
    const imageUrl = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(aiData).slice(0, 500));
      throw new Error('No image returned from AI service');
    }

    // Get authenticated user (optional)
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

    // If user is authenticated, upload to storage and save to DB
    if (user) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Convert base64 data URL to blob
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const blob = new Blob([binaryData], { type: 'image/png' });

        const fileName = `${user.id}/${crypto.randomUUID()}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('generated-images')
          .upload(fileName, blob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false,
          });

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
        console.error('Storage/DB error (non-fatal):', storageErr);
        // Fall through to return the data URL directly
      }
    }

    // Return the data URL directly (anonymous users or storage failure)
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
