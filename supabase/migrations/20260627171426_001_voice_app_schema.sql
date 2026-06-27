/*
# Voice App Schema - Core Tables for VocalForge

## Overview
This migration creates the foundational schema for a voice modification application with:
- Voice model storage with consent binding
- Consent records with cryptographic verification
- Voice sample recordings storage
- Training job queue for model creation
- Usage audit trail for compliance

## Tables Created

### voice_models
- Stores user-created voice models
- Bound to consent records for ethical use
- Includes status tracking (training, active, revoked)

### consent_records
- Immutable consent records with cryptographic hashing
- Links to voice models for verification
- Supports consent revocation

### voice_samples
- Audio files uploaded by users for training
- Linked to voice models and user ownership

### training_jobs
- Asynchronous training job queue
- Status tracking and error handling

### usage_logs
- Audit trail for model usage
- Compliance and security tracking

## Security
- RLS enabled on all tables
- Authenticated-user-only access
- Owner-scoped policies for user data isolation
*/

-- Voice Models Table
CREATE TABLE IF NOT EXISTS voice_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'training', 'active', 'failed', 'revoked')),
  consent_id uuid NOT NULL,
  consent_hash text NOT NULL,
  model_url text,
  model_format text DEFAULT 'onnx',
  model_size_mb decimal(10, 2),
  training_duration_seconds integer,
  sample_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

-- Consent Records Table
CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_model_id uuid REFERENCES voice_models(id) ON DELETE SET NULL,
  consent_text_hash text NOT NULL,
  consent_version text NOT NULL DEFAULT '1.0',
  consented_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  device_info jsonb,
  revoked boolean DEFAULT false,
  revoked_at timestamptz,
  revocation_reason text,
  signature text
);

-- Voice Samples Table
CREATE TABLE IF NOT EXISTS voice_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_model_id uuid REFERENCES voice_models(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes integer,
  duration_seconds decimal(10, 2),
  sample_rate integer DEFAULT 48000,
  channels integer DEFAULT 1,
  format text DEFAULT 'wav',
  transcript text,
  quality_score decimal(3, 2),
  uploaded_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false
);

-- Training Jobs Table
CREATE TABLE IF NOT EXISTS training_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_model_id uuid NOT NULL REFERENCES voice_models(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress_percent integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb
);

-- Usage Logs Table (for compliance and security)
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_model_id uuid REFERENCES voice_models(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'use', 'export', 'share', 'download', 'delete', 'revoke_consent')),
  duration_seconds integer,
  ip_address inet,
  user_agent text,
  device_info jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE voice_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Voice Models Policies
DROP POLICY IF EXISTS "select_own_voice_models" ON voice_models;
CREATE POLICY "select_own_voice_models" ON voice_models FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_voice_models" ON voice_models;
CREATE POLICY "insert_own_voice_models" ON voice_models FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_voice_models" ON voice_models;
CREATE POLICY "update_own_voice_models" ON voice_models FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_voice_models" ON voice_models;
CREATE POLICY "delete_own_voice_models" ON voice_models FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Consent Records Policies
DROP POLICY IF EXISTS "select_own_consents" ON consent_records;
CREATE POLICY "select_own_consents" ON consent_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_consents" ON consent_records;
CREATE POLICY "insert_own_consents" ON consent_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_consents" ON consent_records;
CREATE POLICY "update_own_consents" ON consent_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Voice Samples Policies
DROP POLICY IF EXISTS "select_own_samples" ON voice_samples;
CREATE POLICY "select_own_samples" ON voice_samples FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_samples" ON voice_samples;
CREATE POLICY "insert_own_samples" ON voice_samples FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_samples" ON voice_samples;
CREATE POLICY "update_own_samples" ON voice_samples FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_samples" ON voice_samples;
CREATE POLICY "delete_own_samples" ON voice_samples FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Training Jobs Policies
DROP POLICY IF EXISTS "select_own_jobs" ON training_jobs;
CREATE POLICY "select_own_jobs" ON training_jobs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_jobs" ON training_jobs;
CREATE POLICY "insert_own_jobs" ON training_jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_jobs" ON training_jobs;
CREATE POLICY "update_own_jobs" ON training_jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Usage Logs Policies (insert-only for audit trail, select for own records)
DROP POLICY IF EXISTS "select_own_logs" ON usage_logs;
CREATE POLICY "select_own_logs" ON usage_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_logs" ON usage_logs;
CREATE POLICY "insert_own_logs" ON usage_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_models_user_id ON voice_models(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_models_status ON voice_models(status);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_samples_user_id ON voice_samples(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_samples_model_id ON voice_samples(voice_model_id);
CREATE INDEX IF NOT EXISTS idx_training_jobs_model_id ON training_jobs(voice_model_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_voice_models_updated_at ON voice_models;
CREATE TRIGGER update_voice_models_updated_at
  BEFORE UPDATE ON voice_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
