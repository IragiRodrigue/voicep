export type AudioEffectType =
  | 'pitch'
  | 'formant'
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'distortion'
  | 'eq'
  | 'compression'
  | 'noise_gate'
  | 'robot'
  | 'child'
  | 'deep'
  | 'echo';

export interface AudioEffect {
  id: string;
  type: AudioEffectType;
  name: string;
  params: Record<string, number>;
  enabled: boolean;
}

export interface PitchParams {
  semitones: number; // -12 to +12
  formant_shift: number; // 0.5 to 2.0
  speed: number; // 0.5 to 2.0
}

export interface ReverbParams {
  room_size: number; // 0 to 1
  dampening: number; // 0 to 1
  wet_level: number; // 0 to 1
  dry_level: number; // 0 to 1
}

export interface DelayParams {
  time_ms: number; // 0 to 1000
  feedback: number; // 0 to 0.9
  mix: number; // 0 to 1
}

export interface EQParams {
  low_gain: number; // -12 to +12 dB
  mid_gain: number; // -12 to +12 dB
  high_gain: number; // -12 to +12 dB
  low_freq: number; // Hz
  mid_freq: number; // Hz
  high_freq: number; // Hz
}

export interface CompressionParams {
  threshold: number; // dB
  ratio: number; // 1:1 to 20:1
  attack: number; // ms
  release: number; // ms
  makeup_gain: number; // dB
}

export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
  channels: number;
  bitDepth: 16 | 24 | 32;
}

export interface RecordingSession {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  duration: number;
  fileSize: number;
  format: string;
  fileUri: string;
}

export type VoicePreset =
  | 'original'
  | 'male_deep'
  | 'male_high'
  | 'female_deep'
  | 'female_high'
  | 'child'
  | 'robot'
  | 'alien'
  | 'custom';

export interface VoicePresetConfig {
  id: VoicePreset;
  name: string;
  effects: AudioEffect[];
}
