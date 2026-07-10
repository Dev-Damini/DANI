import { corsHeaders } from '../_shared/cors.ts';

const OMEGATECH_BASE = 'https://omegatech-api.dixonomega.tech/api/ai';
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// ElevenLabs female voice IDs (best quality female voices)
const FEMALE_VOICES = [
  '21haVlAjigA0e75Yck5s', // Rachel — warm, natural female
  'EXAVITQu4vr4xnSDxMaL', // Bella — soft, expressive
  'oWAxZDx7w5VEj9dCyTzz', // Grace — clear female
  'ThT5KcBeYPX3keUQqHPh', // Dorothy — friendly
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, voiceId } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanText = text.slice(0, 600);
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');

    // ── Try ElevenLabs first (best quality, least robotic) ─────────────────
    if (apiKey) {
      const selectedVoiceId = voiceId || FEMALE_VOICES[0];
      try {
        const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${selectedVoiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_turbo_v2',
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.82,
              style: 0.35,
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (res.ok) {
          const audioBlob = await res.blob();
          console.log('ElevenLabs success, bytes:', audioBlob.size);
          return new Response(audioBlob, {
            headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' }
          });
        }
        console.log('ElevenLabs HTTP:', res.status);
      } catch (e) {
        console.log('ElevenLabs failed:', (e as Error).message);
      }

      // Try second ElevenLabs voice
      try {
        const res2 = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${FEMALE_VOICES[1]}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_turbo_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (res2.ok) {
          const blob = await res2.blob();
          return new Response(blob, { headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' } });
        }
      } catch { /* try OmegaTech */ }
    }

    // ── Fallback: OmegaTech text2speech-v3 (woman1) ───────────────────────
    const selectedVoice = voice || 'woman1';
    const encodedText = encodeURIComponent(cleanText);
    const ttsUrl = `${OMEGATECH_BASE}/text2speech-v3?text=${encodedText}&voice=${selectedVoice}`;

    const response = await fetch(ttsUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(28000),
    });

    if (response.ok) {
      const ct = response.headers.get('content-type') || 'audio/mpeg';
      if (ct.startsWith('audio/') || ct === 'application/octet-stream') {
        const audioBlob = await response.blob();
        return new Response(audioBlob, {
          headers: { ...corsHeaders, 'Content-Type': ct.startsWith('audio/') ? ct : 'audio/mpeg' }
        });
      }
      if (ct.includes('json')) {
        const data = await response.json();
        const audioUrl = data?.audio_url || data?.url;
        if (audioUrl) {
          const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(15000) });
          if (audioRes.ok) {
            const audioBlob = await audioRes.blob();
            return new Response(audioBlob, { headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' } });
          }
        }
      }
    }

    // ── Last fallback: Gemini TTS ─────────────────────────────────────────
    const geminiUrl = `${OMEGATECH_BASE}/Gemini-tts?text=${encodedText}`;
    const geminiRes = await fetch(geminiUrl, { signal: AbortSignal.timeout(20000) });
    if (geminiRes.ok) {
      const ct = geminiRes.headers.get('content-type') || 'audio/mpeg';
      const blob = await geminiRes.blob();
      return new Response(blob, {
        headers: { ...corsHeaders, 'Content-Type': ct.startsWith('audio') ? ct : 'audio/mpeg' }
      });
    }

    throw new Error('All TTS methods failed');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('TTS error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
