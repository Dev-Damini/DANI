import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCanvas, loadImage } from 'https://deno.land/x/canvas@v1.4.1/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Add DANI logo watermark to image
async function addWatermark(imageBlob: Blob): Promise<Blob> {
  try {
    // Convert blob to array buffer
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Load the generated image
    const img = await loadImage(uint8Array);
    
    // Create canvas with same dimensions as image
    const canvas = createCanvas(img.width(), img.height());
    const ctx = canvas.getContext('2d');
    
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    // Fetch DANI logo from storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/branding/dani-logo.png`;
    
    try {
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoArrayBuffer = await logoBlob.arrayBuffer();
        const logoUint8Array = new Uint8Array(logoArrayBuffer);
        const logo = await loadImage(logoUint8Array);
        
        // Calculate logo size (5% of image width, max 150px)
        const logoWidth = Math.min(img.width() * 0.08, 150);
        const logoHeight = (logo.height() / logo.width()) * logoWidth;
        
        // Position in bottom-right corner with padding
        const padding = 15;
        const x = img.width() - logoWidth - padding;
        const y = img.height() - logoHeight - padding;
        
        // Draw semi-transparent white background for logo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const bgPadding = 8;
        ctx.fillRect(
          x - bgPadding,
          y - bgPadding,
          logoWidth + bgPadding * 2,
          logoHeight + bgPadding * 2
        );
        
        // Draw logo
        ctx.drawImage(logo, x, y, logoWidth, logoHeight);
      } else {
        // Fallback to text if logo not found
        console.log('Logo not found, using text watermark');
        addTextWatermark(ctx, img.width(), img.height());
      }
    } catch (logoError) {
      console.error('Error loading logo:', logoError);
      // Fallback to text watermark
      addTextWatermark(ctx, img.width(), img.height());
    }
    
    // Convert canvas to blob
    return canvas.toBlob();
  } catch (error) {
    console.error('Watermark error:', error);
    // Return original if watermarking fails
    return imageBlob;
  }
}

// Fallback text watermark
function addTextWatermark(ctx: any, width: number, height: number) {
  const fontSize = Math.max(Math.floor(width * 0.04), 28);
  const padding = 20;
  const watermarkText = 'DANI';
  
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  const metrics = ctx.measureText(watermarkText);
  const textWidth = metrics.width;
  
  const x = width - textWidth - padding * 2;
  const y = height - padding * 2;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(
    x - padding,
    y - fontSize - padding,
    textWidth + padding * 2,
    fontSize + padding * 2
  );
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#a855f7';
  ctx.fillText(watermarkText, x, y);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Get user from JWT (optional for anonymous access)
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

    // Enhance prompt based on style
    const stylePrompts: Record<string, string> = {
      realistic: 'Ultra high resolution photograph, photorealistic, detailed, professional photography',
      artistic: 'Beautiful artistic illustration, painterly style, creative composition, vibrant colors',
      anime: 'Anime style artwork, detailed anime illustration, colorful, expressive',
      abstract: 'Abstract art, creative composition, vibrant colors, modern art style'
    };

    const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.realistic}`;
    const negativePrompt = 'low quality, blurry, distorted, ugly, bad anatomy';

    console.log('Generating image with prompt:', enhancedPrompt);

    // Call external AI image generation API
    const response = await fetch(`https://apis.prexzyvilla.site/ai/realistic?prompt=${encodeURIComponent(enhancedPrompt)}&negative_prompt=${encodeURIComponent(negativePrompt)}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Image API Error:', errorText);
      throw new Error(`AI Image API request failed: ${errorText}`);
    }

    // The API returns the image directly as a blob
    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      throw new Error('No image returned from AI Image API');
    }

    // Add DANI watermark to image
    const watermarkedBlob = await addWatermark(blob);

    // Only save to storage if user is authenticated
    if (!user) {
      // Return image directly for anonymous users without saving
      const arrayBuffer = await watermarkedBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const dataUrl = `data:image/png;base64,${base64}`;
      
      return new Response(
        JSON.stringify({ 
          image: {
            id: crypto.randomUUID(),
            user_id: 'anonymous',
            image_url: dataUrl,
            file_path: '',
            prompt: prompt,
            style: style,
            created_at: new Date().toISOString()
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Supabase Storage for authenticated users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const fileName = `${user.id}/${crypto.randomUUID()}.png`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('generated-images')
      .upload(fileName, watermarkedBlob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    // Save to database
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('generated_images')
      .insert({
        user_id: user.id,
        prompt: prompt,
        style: style || 'realistic',
        image_url: publicUrl,
        file_path: fileName
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database save failed: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        image: {
          id: imageRecord.id,
          user_id: imageRecord.user_id,
          image_url: publicUrl,
          file_path: fileName,
          prompt: prompt,
          style: style,
          created_at: imageRecord.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
