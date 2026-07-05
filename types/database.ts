export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      voice_models: {
        Row: VoiceModel;
        Insert: Omit<VoiceModel, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<VoiceModel, 'id' | 'user_id'>>;
      };
      consent_records: {
        Row: ConsentRecord;
        Insert: Omit<ConsentRecord, 'id' | 'consented_at'>;
        Update: Partial<Omit<ConsentRecord, 'id' | 'user_id'>>;
      };
      voice_samples: {
        Row: VoiceSample;
        Insert: Omit<VoiceSample, 'id' | 'uploaded_at'>;
        Update: Partial<Omit<VoiceSample, 'id' | 'user_id'>>;
      };
      training_jobs: {
        Row: TrainingJob;
        Insert: Omit<TrainingJob, 'id' | 'created_at'>;
        Update: Partial<Omit<TrainingJob, 'id' | 'user_id'>>;
      };
      usage_logs: {
        Row: UsageLog;
        Insert: Omit<UsageLog, 'id' | 'created_at'>;
        Update: never;
      };
    };
  };
}

export interface VoiceModel {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: 'pending' | 'training' | 'active' | 'failed' | 'revoked';
  consent_id: string;
  consent_hash: string;
  model_url: string | null;
  model_format: string;
  model_size_mb: number | null;
  training_duration_seconds: number | null;
  sample_count: number;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  voice_model_id: string | null;
  consent_text_hash: string;
  consent_version: string;
  consented_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Json | null;
  revoked: boolean;
  revoked_at: string | null;
  revocation_reason: string | null;
  signature: string | null;
}

export interface VoiceSample {
  id: string;
  user_id: string;
  voice_model_id: string | null;
  file_url: string;
  file_name: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  sample_rate: number;
  channels: number;
  format: string;
  transcript: string | null;
  quality_score: number | null;
  uploaded_at: string;
  processed: boolean;
}

export interface TrainingJob {
  id: string;
  voice_model_id: string;
  user_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percent: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  metadata: Json | null;
}

export interface UsageLog {
  id: string;
  user_id: string;
  voice_model_id: string | null;
  action: 'create' | 'use' | 'export' | 'share' | 'download' | 'delete' | 'revoke_consent';
  duration_seconds: number | null;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Json | null;
  created_at: string;
}

// Messaging types
export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_preview: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
}
