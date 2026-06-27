import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hang-up';
  callSessionId: string;
  fromUserId: string;
  toUserId: string;
  data: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case 'initiate-call': {
        const { calleeId, voiceEffectId, voiceModelId } = payload;

        // Check if users are contacts
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', user.id)
          .eq('contact_user_id', calleeId)
          .eq('status', 'accepted')
          .single();

        if (contactError || !contact) {
          return new Response(
            JSON.stringify({ error: "User is not in your contacts" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if callee is not already in a call
        const { data: activeCall } = await supabase
          .from('call_sessions')
          .select('id')
          .or(`and(caller_id.eq.${calleeId},status.eq.active),and(callee_id.eq.${calleeId},status.eq.active)`)
          .maybeSingle();

        if (activeCall) {
          return new Response(
            JSON.stringify({ error: "User is currently in another call" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create call session
        const { data: callSession, error: callError } = await supabase
          .from('call_sessions')
          .insert({
            caller_id: user.id,
            callee_id: calleeId,
            status: 'ringing',
            voice_effect_id: voiceEffectId,
            voice_model_id: voiceModelId
          })
          .select()
          .single();

        if (callError) {
          throw new Error(`Failed to create call session: ${callError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            callSession,
            message: "Call initiated"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'accept-call': {
        const { callSessionId, answer } = payload;

        // Verify user is the callee
        const { data: callSession, error: callError } = await supabase
          .from('call_sessions')
          .select('*')
          .eq('id', callSessionId)
          .eq('callee_id', user.id)
          .eq('status', 'ringing')
          .single();

        if (callError || !callSession) {
          return new Response(
            JSON.stringify({ error: "Call not found or not ringing" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update call session with answer
        const { error: updateError } = await supabase
          .from('call_sessions')
          .update({
            status: 'connecting',
            callee_answer: answer
          })
          .eq('id', callSessionId);

        if (updateError) {
          throw new Error(`Failed to update call session: ${updateError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Call accepted" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'signal': {
        const { callSessionId, type, data }: CallSignal = payload;

        // Verify user is part of this call
        const { data: callSession, error: callError } = await supabase
          .from('call_sessions')
          .select('*')
          .eq('id', callSessionId)
          .single();

        if (callError || !callSession) {
          return new Response(
            JSON.stringify({ error: "Call not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (callSession.caller_id !== user.id && callSession.callee_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Not authorized for this call" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Store signal in Realtime channel (handled by client subscription)
        // For now, just acknowledge
        return new Response(
          JSON.stringify({ success: true, message: "Signal processed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'end-call': {
        const { callSessionId, reason } = payload;

        const { data: callSession, error: callError } = await supabase
          .from('call_sessions')
          .select('*')
          .eq('id', callSessionId)
          .single();

        if (callError || !callSession) {
          return new Response(
            JSON.stringify({ error: "Call not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (callSession.caller_id !== user.id && callSession.callee_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Not authorized for this call" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const endedAt = new Date().toISOString();
        const duration = callSession.started_at
          ? Math.floor((new Date(endedAt).getTime() - new Date(callSession.started_at).getTime()) / 1000)
          : 0;

        // Update call session
        await supabase
          .from('call_sessions')
          .update({
            status: 'ended',
            ended_at: endedAt,
            duration_seconds: duration,
            end_reason: reason || 'normal'
          })
          .eq('id', callSessionId);

        // Create call logs for both users
        await supabase.from('call_logs').insert([
          {
            call_session_id: callSessionId,
            user_id: callSession.caller_id,
            other_user_id: callSession.callee_id,
            direction: 'outgoing',
            duration_seconds: duration,
            status: 'completed'
          },
          {
            call_session_id: callSessionId,
            user_id: callSession.callee_id,
            other_user_id: callSession.caller_id,
            direction: 'incoming',
            duration_seconds: duration,
            status: 'completed'
          }
        ]);

        return new Response(
          JSON.stringify({ success: true, message: "Call ended" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'get-call-history': {
        const { limit = 50, offset = 0 } = payload;

        const { data: logs, error: logsError } = await supabase
          .from('call_logs')
          .select(`
            *,
            call_sessions (
              caller_id,
              callee_id,
              status,
              started_at,
              ended_at
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (logsError) {
          throw new Error(`Failed to fetch call history: ${logsError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, logs }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'get-active-call': {
        const { data: activeCall, error: activeError } = await supabase
          .from('call_sessions')
          .select('*')
          .or(`and(caller_id.eq.${user.id},status.eq.active),and(callee_id.eq.${user.id},status.eq.active),and(caller_id.eq.${user.id},status.eq.ringing),and(callee_id.eq.${user.id},status.eq.ringing)`)
          .maybeSingle();

        return new Response(
          JSON.stringify({ success: true, activeCall: activeCall || null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
