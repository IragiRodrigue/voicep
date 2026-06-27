import { create } from 'zustand';
import { supabase } from '@/services/supabase';

interface VoiceModel {
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

interface VoiceSample {
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
  uploaded_at: string;
  processed: boolean;
}

interface ConsentRecord {
  id: string;
  user_id: string;
  voice_model_id: string | null;
  consent_text_hash: string;
  consented_at: string;
  revoked: boolean;
  revoked_at: string | null;
  revocation_reason: string | null;
  signature: string | null;
}

interface TrainingJob {
  id: string;
  voice_model_id: string;
  user_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percent: number;
  created_at: string;
}

interface VoiceState {
  models: VoiceModel[];
  samples: VoiceSample[];
  activeModel: VoiceModel | null;
  currentTrainingJob: TrainingJob | null;
  loading: boolean;
  error: string | null;

  fetchModels: () => Promise<void>;
  createModel: (data: {
    name: string;
    description?: string;
    consentId: string;
    consentHash: string;
  }) => Promise<VoiceModel | null>;
  setActiveModel: (model: VoiceModel | null) => void;
  deleteModel: (modelId: string) => Promise<void>;
  revokeModel: (modelId: string) => Promise<void>;

  fetchSamples: () => Promise<void>;
  uploadSample: (file: {
    uri: string;
    name: string;
    duration: number;
    size: number;
  }) => Promise<VoiceSample | null>;
  deleteSample: (sampleId: string) => Promise<void>;
  linkSampleToModel: (sampleId: string, modelId: string) => Promise<void>;

  fetchTrainingJob: (jobId: string) => Promise<TrainingJob | null>;
  pollTrainingStatus: (jobId: string) => Promise<void>;

  createConsent: (data: {
    modelId?: string;
    consentTextHash: string;
    signature?: string;
  }) => Promise<ConsentRecord | null>;
  revokeConsent: (consentId: string, reason: string) => Promise<void>;

  clearError: () => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  models: [],
  samples: [],
  activeModel: null,
  currentTrainingJob: null,
  loading: false,
  error: null,

  fetchModels: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('voice_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ models: (data as VoiceModel[]) || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createModel: async (data) => {
    set({ loading: true, error: null });
    try {
      const { data: model, error } = await supabase
        .from('voice_models')
        .insert({
          name: data.name,
          description: data.description || null,
          consent_id: data.consentId,
          consent_hash: data.consentHash,
          status: 'pending'
        } as unknown as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        models: [model as VoiceModel, ...state.models],
        loading: false
      }));

      return model as VoiceModel;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  setActiveModel: (model) => set({ activeModel: model }),

  deleteModel: async (modelId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('voice_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      set(state => ({
        models: state.models.filter(m => m.id !== modelId),
        activeModel: state.activeModel?.id === modelId ? null : state.activeModel,
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  revokeModel: async (modelId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('voice_models')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString()
        } as unknown as Record<string, unknown>)
        .eq('id', modelId);

      if (error) throw error;

      set(state => ({
        models: state.models.map(m =>
          m.id === modelId
            ? { ...m, status: 'revoked' as const, revoked_at: new Date().toISOString() }
            : m
        ),
        activeModel: state.activeModel?.id === modelId ? null : state.activeModel,
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchSamples: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('voice_samples')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      set({ samples: (data as VoiceSample[]) || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  uploadSample: async (file) => {
    set({ loading: true, error: null });
    try {
      const { data: sample, error } = await supabase
        .from('voice_samples')
        .insert({
          file_url: file.uri,
          file_name: file.name,
          duration_seconds: file.duration,
          file_size_bytes: file.size
        } as unknown as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        samples: [sample as VoiceSample, ...state.samples],
        loading: false
      }));

      return sample as VoiceSample;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  deleteSample: async (sampleId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('voice_samples')
        .delete()
        .eq('id', sampleId);

      if (error) throw error;

      set(state => ({
        samples: state.samples.filter(s => s.id !== sampleId),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  linkSampleToModel: async (sampleId: string, modelId: string) => {
    try {
      const { error } = await supabase
        .from('voice_samples')
        .update({ voice_model_id: modelId } as unknown as Record<string, unknown>)
        .eq('id', sampleId);

      if (error) throw error;

      set(state => ({
        samples: state.samples.map(s =>
          s.id === sampleId ? { ...s, voice_model_id: modelId } : s
        )
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchTrainingJob: async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('training_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      set({ currentTrainingJob: data as TrainingJob });
      return data as TrainingJob;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  pollTrainingStatus: async (jobId: string) => {
    const poll = async () => {
      const job = await get().fetchTrainingJob(jobId);
      if (job && !['completed', 'failed', 'cancelled'].includes(job.status)) {
        setTimeout(poll, 3000);
      }
    };
    await poll();
  },

  createConsent: async (data) => {
    set({ loading: true, error: null });
    try {
      const { data: consent, error } = await supabase
        .from('consent_records')
        .insert({
          consent_text_hash: data.consentTextHash,
          voice_model_id: data.modelId || null,
          signature: data.signature || null
        } as unknown as Record<string, unknown>)
        .select()
        .single();

      if (error) throw error;
      set({ loading: false });
      return consent as ConsentRecord;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  revokeConsent: async (consentId: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('consent_records')
        .update({
          revoked: true,
          revoked_at: new Date().toISOString(),
          revocation_reason: reason
        } as unknown as Record<string, unknown>)
        .eq('id', consentId);

      if (error) throw error;
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    models: [],
    samples: [],
    activeModel: null,
    currentTrainingJob: null,
    loading: false,
    error: null
  })
}));
