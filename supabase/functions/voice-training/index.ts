import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TrainingRequest {
  userId: string;
  modelId: string;
  sampleIds: string[];
}

interface ValidationResponse {
  valid: boolean;
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

    // Get authorization header
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

    const body: TrainingRequest = await req.json();
    const { modelId, sampleIds } = body;

    // Validate model ownership and consent
    const validation = await validateModelAndConsent(supabase, modelId, user.id);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create training job
    const { data: job, error: jobError } = await supabase
      .from("training_jobs")
      .insert({
        voice_model_id: modelId,
        user_id: user.id,
        status: "queued",
        metadata: { sample_ids: sampleIds }
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create training job: ${jobError.message}`);
    }

    // Update model status to training
    await supabase
      .from("voice_models")
      .update({ status: "training" })
      .eq("id", modelId);

    // Link samples to model
    if (sampleIds && sampleIds.length > 0) {
      await supabase
        .from("voice_samples")
        .update({ voice_model_id: modelId })
        .in("id", sampleIds);
    }

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      voice_model_id: modelId,
      action: "create",
      device_info: { source: "edge_function" }
    });

    // In a real implementation, this would queue the job to a GPU worker
    // For now, we simulate the training process
    simulateTrainingProcess(supabase, job.id, modelId);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: "Training job queued successfully"
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

async function validateModelAndConsent(
  supabase: ReturnType<typeof createClient>,
  modelId: string,
  userId: string
): Promise<ValidationResponse> {
  // Check model exists and belongs to user
  const { data: model, error: modelError } = await supabase
    .from("voice_models")
    .select("id, user_id, consent_id, status")
    .eq("id", modelId)
    .single();

  if (modelError || !model) {
    return { valid: false, error: "Model not found" };
  }

  if (model.user_id !== userId) {
    return { valid: false, error: "Model does not belong to user" };
  }

  if (model.status === "revoked") {
    return { valid: false, error: "Model consent has been revoked" };
  }

  // Verify consent is valid and not revoked
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

  return { valid: true };
}

async function simulateTrainingProcess(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  modelId: string
) {
  // This is a placeholder - in production, this would be handled by a GPU worker
  // The worker would:
  // 1. Download voice samples from storage
  // 2. Run RVC or similar model training
  // 3. Upload the trained model to storage
  // 4. Update the database with results

  // Simulate progress updates
  let progress = 0;
  const interval = setInterval(async () => {
    progress += 10;

    if (progress <= 100) {
      await supabase
        .from("training_jobs")
        .update({
          progress_percent: progress,
          status: progress === 100 ? "completed" : "processing"
        })
        .eq("id", jobId);

      if (progress === 100) {
        clearInterval(interval);

        // Update model as active
        await supabase
          .from("voice_models")
          .update({
            status: "active",
            model_url: `models://${modelId}/model.onnx`,
            model_size_mb: 156.5,
            training_duration_seconds: 300
          })
          .eq("id", modelId);

        // Mark job as completed
        await supabase
          .from("training_jobs")
          .update({
            completed_at: new Date().toISOString()
          })
          .eq("id", jobId);
      }
    }
  }, 2000); // Update every 2 seconds for simulation
}
