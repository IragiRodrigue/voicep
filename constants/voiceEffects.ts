import type { AudioEffectType } from '@/types/audio';

export interface VoiceEffectPreset {
  id: AudioEffectType;
  name: string;
  description: string;
  icon: string;
  defaultParams: Record<string, number>;
  paramRanges: Record<string, { min: number; max: number; step: number; label: string }>;
}

export const VOICE_EFFECTS: VoiceEffectPreset[] = [
  {
    id: 'pitch',
    name: 'Pitch Shift',
    description: 'Adjust the pitch of your voice up or down',
    icon: 'music',
    defaultParams: { semitones: 0, formant_shift: 1.0, speed: 1.0 },
    paramRanges: {
      semitones: { min: -12, max: 12, step: 1, label: 'Semitones' },
      formant_shift: { min: 0.5, max: 2.0, step: 0.1, label: 'Formant' },
      speed: { min: 0.5, max: 2.0, step: 0.1, label: 'Speed' }
    }
  },
  {
    id: 'reverb',
    name: 'Reverb',
    description: 'Add room ambience to your voice',
    icon: 'waves',
    defaultParams: { room_size: 0.5, dampening: 0.5, wet_level: 0.3, dry_level: 0.7 },
    paramRanges: {
      room_size: { min: 0, max: 1, step: 0.01, label: 'Room Size' },
      dampening: { min: 0, max: 1, step: 0.01, label: 'Dampening' },
      wet_level: { min: 0, max: 1, step: 0.01, label: 'Wet Level' }
    }
  },
  {
    id: 'delay',
    name: 'Delay/Echo',
    description: 'Create echo effects',
    icon: 'clock',
    defaultParams: { time_ms: 250, feedback: 0.3, mix: 0.2 },
    paramRanges: {
      time_ms: { min: 0, max: 1000, step: 10, label: 'Delay Time (ms)' },
      feedback: { min: 0, max: 0.9, step: 0.05, label: 'Feedback' },
      mix: { min: 0, max: 1, step: 0.01, label: 'Mix' }
    }
  },
  {
    id: 'distortion',
    name: 'Distortion',
    description: 'Add gritty, distorted texture',
    icon: 'zap',
    defaultParams: { drive: 0.5, tone: 0.5, output: 0.8 },
    paramRanges: {
      drive: { min: 0, max: 1, step: 0.01, label: 'Drive' },
      tone: { min: 0, max: 1, step: 0.01, label: 'Tone' },
      output: { min: 0, max: 1, step: 0.01, label: 'Output' }
    }
  },
  {
    id: 'robot',
    name: 'Robot Voice',
    description: 'Mechanical, synthesized voice effect',
    icon: 'cpu',
    defaultParams: { carrier_freq: 200, modulator_freq: 100, mix: 0.8 },
    paramRanges: {
      carrier_freq: { min: 50, max: 500, step: 10, label: 'Carrier Freq' },
      modulator_freq: { min: 50, max: 500, step: 10, label: 'Modulator Freq' },
      mix: { min: 0, max: 1, step: 0.01, label: 'Mix' }
    }
  },
  {
    id: 'eq',
    name: 'Equalizer',
    description: 'Adjust bass, mid, and treble frequencies',
    icon: 'sliders',
    defaultParams: { low_gain: 0, mid_gain: 0, high_gain: 0 },
    paramRanges: {
      low_gain: { min: -12, max: 12, step: 1, label: 'Bass' },
      mid_gain: { min: -12, max: 12, step: 1, label: 'Mid' },
      high_gain: { min: -12, max: 12, step: 1, label: 'Treble' }
    }
  },
  {
    id: 'compression',
    name: 'Compression',
    description: 'Even out volume levels',
    icon: 'minimize-2',
    defaultParams: { threshold: -20, ratio: 4, attack: 5, release: 50 },
    paramRanges: {
      threshold: { min: -60, max: 0, step: 1, label: 'Threshold (dB)' },
      ratio: { min: 1, max: 20, step: 0.5, label: 'Ratio' },
      attack: { min: 0.1, max: 100, step: 0.5, label: 'Attack (ms)' },
      release: { min: 10, max: 1000, step: 10, label: 'Release (ms)' }
    }
  },
  {
    id: 'noise_gate',
    name: 'Noise Gate',
    description: 'Remove background noise and silences',
    icon: 'volume-x',
    defaultParams: { threshold: -40, attack: 1, release: 50 },
    paramRanges: {
      threshold: { min: -80, max: -20, step: 1, label: 'Threshold (dB)' },
      attack: { min: 0.1, max: 50, step: 0.1, label: 'Attack (ms)' },
      release: { min: 10, max: 500, step: 10, label: 'Release (ms)' }
    }
  }
];

export const VOICE_PRESETS = [
  { id: 'original', name: 'Original', description: 'Your natural voice' },
  { id: 'male_deep', name: 'Deep Male', description: 'Lower pitched male voice' },
  { id: 'male_high', name: 'High Male', description: 'Higher pitched male voice' },
  { id: 'female_deep', name: 'Deep Female', description: 'Lower pitched female voice' },
  { id: 'female_high', name: 'High Female', description: 'Higher pitched female voice' },
  { id: 'child', name: 'Child', description: 'Young child voice' },
  { id: 'robot', name: 'Robot', description: 'Mechanical robot voice' },
  { id: 'alien', name: 'Alien', description: 'Sci-fi alien voice' },
  { id: 'custom', name: 'Custom', description: 'Your custom effect settings' }
] as const;
