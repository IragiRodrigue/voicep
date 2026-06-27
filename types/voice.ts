import type { VoiceModel, ConsentRecord, VoiceSample, TrainingJob } from './database';

export type VoiceModelStatus = VoiceModel['status'];
export type TrainingJobStatus = TrainingJob['status'];
export type UsageAction = 'create' | 'use' | 'export' | 'share' | 'download' | 'delete' | 'revoke_consent';

export interface VoiceModelWithConsent extends VoiceModel {
  consent: ConsentRecord;
  samples: VoiceSample[];
}

export interface VoiceModelCreateInput {
  name: string;
  description?: string;
  sampleIds: string[];
  consentId: string;
  consentHash: string;
}

export interface ConsentFormData {
  consentToModelCreation: boolean;
  consentToPersonalUse: boolean;
  consentToDataStorage: boolean;
  consentToRevocationRight: boolean;
  ageConfirmation: boolean;
  notForImpersonation: boolean;
  termsAccepted: boolean;
}

export interface ConsentValidationResult {
  valid: boolean;
  errors: string[];
}

export interface VoiceTrainingProgress {
  modelId: string;
  status: TrainingJobStatus;
  progress: number;
  estimatedTimeRemaining?: number;
  error?: string;
}

export interface VoiceModelUsage {
  modelId: string;
  totalDurationSeconds: number;
  sessionsCount: number;
  lastUsedAt: Date;
}
