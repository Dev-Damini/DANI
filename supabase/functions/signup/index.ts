import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, username, password, confirmOnly } = await req.json();
    console.log('Signup request for email:', email, confirmOnly ? '(confirm only)' : '');

    // ── Confirm-only mode: auto-confirm an existing unconfirmed account ──
    if (confirmOnly && email) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      const { error: confirmError } = await supabaseAdmin.rpc('confirm_user_email', {
        user_email: email.trim().toLowerCase()
      });
      if (confirmError) console.error('Confirm-only error (non-fatal):', confirmError.message);
      else console.log('Email confirmed via confirm-only mode');
      return new Response(
        JSON.stringify({ confirmed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !password || !username) {
      return new Response(
        JSON.stringify({ error: 'Email, username, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create user via standard signup
    console.log('Creating user...');
    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { username: username.trim() }
      }
    });

    if (signUpError) {
      console.error('Signup error:', signUpError.message);
      // Surface friendly messages
      if (signUpError.message.toLowerCase().includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'This email is already registered. Please log in instead.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: signUpError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!signUpData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create account. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto-confirm email so user can log in immediately (no confirmation email)
    console.log('Auto-confirming email...');
    const { error: confirmError } = await supabaseAdmin.rpc('confirm_user_email', {
      user_email: email.trim().toLowerCase()
    });

    if (confirmError) {
      console.error('Email confirmation error (non-fatal):', confirmError.message);
    } else {
      console.log('Email confirmed successfully');
    }

    // Brief wait for confirmation to propagate
    await new Promise(r => setTimeout(r, 300));

    // Sign in with confirmed credentials
    console.log('Signing in...');
    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (signInError) {
      console.error('Sign in error:', signInError.message);
      return new Response(
        JSON.stringify({ error: 'Account created! Please log in with your credentials.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signup complete — session returned');
    return new Response(
      JSON.stringify({ session: sessionData.session, user: sessionData.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create account' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
