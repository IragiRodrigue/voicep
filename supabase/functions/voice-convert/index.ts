import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversionRequest {
  modelId: string;
  effects?: {
    pitch?: number;
    formant?: number;
    reverb?: number;
    speed?: number;
  };
}

interface ConsentCheck {
  valid: boolean;
  consentId?: string;
  error?: string;
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

    const body: ConversionRequest = await req.json();
    const { modelId, effects } = body;

    // Verify model ownership and consent
    const consentCheck = await verifyConsent(supabase, modelId, user.id);
    if (!consentCheck.valid) {
      return new Response(
        JSON.stringify({ error: consentCheck.error }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get model details
    const { data: model, error: modelError } = await supabase
      .from("voice_models")
      .select("id, name, model_url, status")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return new Response(
        JSON.stringify({ error: "Model not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In a real implementation, this would:
    // 1. Initialize voice conversion engine (RVC, ONNX Runtime)
    // 2. Load the model from storage
    // 3. Apply real-time effects
    // 4. Stream converted audio back

    // For now, return model configuration for client-side processing
    return new Response(
      JSON.stringify({
        success: true,
        model: {
          id: model.id,
          name: model.name,
          modelUrl: model.model_url,
          effects: effects || getDefaultEffects()
        },
        message: "Model ready for conversion",
        processingMode: "client" // or "server" for server-side processing
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function verifyConsent(
  supabase: ReturnType<typeof createClient>,
  modelId: string,
  userId: string
): Promise<ConsentCheck> {
  const { data: model, error: modelError } = await supabase
    .from("voice_models")
    .select("id, user_id, consent_id, consent_hash, status")
    .eq("id", modelId)
    .single();

  if (modelError || !model) {
    return { valid: false, error: "Model not found" };
  }

  if (model.user_id !== userId) {
    return { valid: false, error: "Model does not belong to user" };
  }

  if (model.status !== "active") {
    return { valid: false, error: "Model is not active" };
  }

  // Verify consent record
  const { data: consent, error: consentError } = await supabase
    .from("consent_records")
    .select("id, revoked")
    .eq("id", model.consent_id)
    .single();

  if (consentError || !consent) {
    return { valid: false, error: "Consent record not found" };
  }

  if (consent.revoked) {
    return { valid: false, error: "Consent has been revoked" };
  }

  // Verify consent hash integrity
  // In production, would verify against stored hash

  return { valid: true, consentId: model.consent_id };
}

function getDefaultEffects() {
  return {
    pitch: 0,
    formant: 1.0,
    reverb: 0,
    speed: 1.0,
    noiseGate: -40,
    compression: {
      threshold: -20,
      ratio: 4,
      attack: 5,
      release: 50
    }
  };
}
