export const AUDIO_CONFIG = {
  // Recording settings
  recording: {
    sampleRate: 48000,
    channels: 1,
    bitDepth: 16,
    format: 'wav' as const,
    maxDurationSeconds: 300, // 5 minutes max per sample
    minDurationSeconds: 10, // 10 seconds minimum
    recommendedTotalDuration: 300, // 5 minutes total for model training
  },

  // Real-time processing
  realTime: {
    bufferSize: 256, // Lower = less latency but more CPU
    targetLatencyMs: 50, // Target round-trip latency
    maxLatencyMs: 100, // Maximum acceptable latency
    processingInterval: 10, // ms between processing cycles
  },

  // File settings
  files: {
    maxFileSizeMB: 50,
    supportedFormats: ['wav', 'mp3', 'm4a', 'flac'],
    maxModelSizeMB: 500,
  },

  // Quality thresholds
  quality: {
    minSampleRate: 22050,
    recommendedSampleRate: 48000,
    minBitDepth: 16,
    minChannels: 1,
    noiseFloorThreshold: -60, // dB
  },

  // Model training
  training: {
    minSampleCount: 5,
    recommendedSampleCount: 10,
    minTotalDurationSeconds: 180, // 3 minutes
    recommendedTotalDurationSeconds: 300, // 5 minutes
    maxRetries: 3,
    timeoutSeconds: 600, // 10 minutes
  }
} as const;

export const PERMISSION_PROMPTS = {
  microphone: {
    title: 'Microphone Access Required',
    message: 'VocalForge needs access to your microphone to record voice samples and apply real-time voice effects.',
    deniedMessage: 'Microphone access was denied. Please enable it in Settings to use voice features.'
  },
  notification: {
    title: 'Notifications',
    message: 'Allow notifications to get updates when your voice model is ready.'
  }
} as const;

export const ERRORS = {
  RECORDING_FAILED: 'Failed to start recording. Please check microphone permissions.',
  NO_MICROPHONE: 'Microphone not available on this device.',
  STORAGE_FULL: 'Insufficient storage. Please free up space and try again.',
  UPLOAD_FAILED: 'Failed to upload voice sample. Please check your connection.',
  TRAINING_FAILED: 'Voice model training failed. Please try again.',
  CONSENT_REQUIRED: 'Consent is required before creating a voice model.',
  MODEL_NOT_FOUND: 'Voice model not found.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
} as const;
