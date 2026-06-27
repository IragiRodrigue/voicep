/*
# VoIP Schema - Voice Calls with Real-time Modification

## Overview
This migration adds VoIP functionality to VocalForge:
- Contact list and friend connections
- Active call sessions with signaling
- Call history and logs
- Real-time voice transformation during calls

## Tables Created

### contacts
- User connections for VoIP calls
- Friend request workflow

### call_sessions
- Active and past call sessions
- Signaling data for WebRTC
- Call status tracking

### call_participants
- Participants in each call
- Voice effect settings per participant

### call_logs
- Call history records
- Duration and quality metrics

## Security
- RLS enabled on all tables
- User-scoped access for own data
- Contact mutual verification
*/

-- Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

-- Call Sessions Table
CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'connecting', 'active', 'ended', 'missed', 'rejected')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  end_reason text,
  caller_offer jsonb,
  callee_answer jsonb,
  voice_effect_id uuid,
  voice_model_id uuid REFERENCES voice_models(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Call Participants (for potential group calls)
CREATE TABLE IF NOT EXISTS call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz,
  left_at timestamptz,
  effect_settings jsonb,
  created_at timestamptz DEFAULT now()
);

-- Call Logs Table
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id uuid REFERENCES call_sessions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  duration_seconds integer DEFAULT 0,
  status text NOT NULL,
  quality_score decimal(3, 2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Contacts Policies
DROP POLICY IF EXISTS "select_own_contacts" ON contacts;
CREATE POLICY "select_own_contacts" ON contacts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_contacts" ON contacts;
CREATE POLICY "insert_own_contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_contacts" ON contacts;
CREATE POLICY "update_own_contacts" ON contacts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_contacts" ON contacts;
CREATE POLICY "delete_own_contacts" ON contacts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Call Sessions Policies - users can see their own calls
DROP POLICY IF EXISTS "select_own_calls" ON call_sessions;
CREATE POLICY "select_own_calls" ON call_sessions FOR SELECT
  TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

DROP POLICY IF EXISTS "insert_own_calls" ON call_sessions;
CREATE POLICY "insert_own_calls" ON call_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "update_own_calls" ON call_sessions;
CREATE POLICY "update_own_calls" ON call_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Call Participants Policies
DROP POLICY IF EXISTS "select_call_participants" ON call_participants;
CREATE POLICY "select_call_participants" ON call_participants FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM call_sessions 
      WHERE call_sessions.id = call_participants.call_session_id 
      AND (call_sessions.caller_id = auth.uid() OR call_sessions.callee_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_call_participants" ON call_participants;
CREATE POLICY "insert_call_participants" ON call_participants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_call_participants" ON call_participants;
CREATE POLICY "update_call_participants" ON call_participants FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- Call Logs Policies
DROP POLICY IF EXISTS "select_own_logs" ON call_logs;
CREATE POLICY "select_own_logs" ON call_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_logs" ON call_logs;
CREATE POLICY "insert_own_logs" ON call_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_id ON call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee_id ON call_sessions(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

-- Updated_at trigger for contacts
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
