import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AudioEffect, AudioEffectType, VoicePreset } from '@/types/audio';

interface EffectsState {
  effects: AudioEffect[];
  selectedPreset: VoicePreset;
  masterVolume: number;
  monitoringEnabled: boolean;

  // Actions
  setEffectParam: (effectType: AudioEffectType, param: string, value: number) => void;
  toggleEffect: (effectType: AudioEffectType) => void;
  setPreset: (preset: VoicePreset) => void;
  setMasterVolume: (volume: number) => void;
  toggleMonitoring: () => void;
  resetEffects: () => void;
  loadSavedSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const DEFAULT_EFFECTS: AudioEffect[] = [
  {
    id: 'pitch',
    type: 'pitch',
    name: 'Pitch',
    params: { semitones: 0, formant_shift: 1.0, speed: 1.0 },
    enabled: true
  },
  {
    id: 'reverb',
    type: 'reverb',
    name: 'Reverb',
    params: { room_size: 0.3, dampening: 0.5, wet_level: 0.2, dry_level: 0.8 },
    enabled: false
  },
  {
    id: 'delay',
    type: 'delay',
    name: 'Delay',
    params: { time_ms: 250, feedback: 0.3, mix: 0.2 },
    enabled: false
  },
  {
    id: 'eq',
    type: 'eq',
    name: 'EQ',
    params: { low_gain: 0, mid_gain: 0, high_gain: 0, low_freq: 100, mid_freq: 1000, high_freq: 5000 },
    enabled: true
  },
  {
    id: 'compression',
    type: 'compression',
    name: 'Compression',
    params: { threshold: -20, ratio: 4, attack: 5, release: 50, makeup_gain: 0 },
    enabled: true
  },
  {
    id: 'noise_gate',
    type: 'noise_gate',
    name: 'Noise Gate',
    params: { threshold: -40, attack: 1, release: 50, ratio: 10 },
    enabled: true
  }
];

const PRESET_CONFIGS: Record<VoicePreset, Partial<AudioEffect>[]> = {
  original: [],
  male_deep: [
    { type: 'pitch', params: { semitones: -3, formant_shift: 0.9 } }
  ],
  male_high: [
    { type: 'pitch', params: { semitones: 2, formant_shift: 1.1 } }
  ],
  female_deep: [
    { type: 'pitch', params: { semitones: 1, formant_shift: 1.05 } }
  ],
  female_high: [
    { type: 'pitch', params: { semitones: 4, formant_shift: 1.2 } }
  ],
  child: [
    { type: 'pitch', params: { semitones: 6, formant_shift: 1.3 } }
  ],
  robot: [
    { type: 'pitch', params: { semitones: 0 } },
    { type: 'distortion', params: { drive: 0.5, tone: 0.7 } }
  ],
  alien: [
    { type: 'pitch', params: { semitones: 5, formant_shift: 1.5 } },
    { type: 'reverb', params: { room_size: 0.8, wet_level: 0.5 } }
  ],
  custom: []
};

export const useEffectsStore = create<EffectsState>((set, get) => ({
  effects: DEFAULT_EFFECTS,
  selectedPreset: 'original' as VoicePreset,
  masterVolume: 1.0,
  monitoringEnabled: false,

  setEffectParam: (effectType, param, value) => {
    set(state => ({
      effects: state.effects.map(e =>
        e.type === effectType
          ? { ...e, params: { ...e.params, [param]: value } }
          : e
      ),
      selectedPreset: 'custom' as VoicePreset
    }));
    get().saveSettings();
  },

  toggleEffect: (effectType) => {
    set(state => ({
      effects: state.effects.map(e =>
        e.type === effectType ? { ...e, enabled: !e.enabled } : e
      ),
      selectedPreset: 'custom' as VoicePreset
    }));
    get().saveSettings();
  },

  setPreset: (preset) => {
    if (preset === 'original') {
      set({ effects: DEFAULT_EFFECTS, selectedPreset: preset });
    } else if (preset !== 'custom') {
      const presetEffects = PRESET_CONFIGS[preset];
      const newEffects = DEFAULT_EFFECTS.map(e => {
        const presetUpdate = presetEffects.find(p => p.type === e.type);
        return presetUpdate ? { ...e, ...presetUpdate, enabled: true } : e;
      });
      set({ effects: newEffects, selectedPreset: preset });
    }
    get().saveSettings();
  },

  setMasterVolume: (volume) => {
    set({ masterVolume: Math.max(0, Math.min(1, volume)) });
    get().saveSettings();
  },

  toggleMonitoring: () => {
    set(state => ({ monitoringEnabled: !state.monitoringEnabled }));
  },

  resetEffects: () => {
    set({ effects: DEFAULT_EFFECTS, selectedPreset: 'original' as VoicePreset });
    get().saveSettings();
  },

  loadSavedSettings: async () => {
    try {
      const saved = await AsyncStorage.getItem('effects_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        set(settings);
      }
    } catch (error) {
      console.error('Failed to load effects settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const state = get();
      await AsyncStorage.setItem('effects_settings', JSON.stringify({
        effects: state.effects,
        selectedPreset: state.selectedPreset,
        masterVolume: state.masterVolume
      }));
    } catch (error) {
      console.error('Failed to save effects settings:', error);
    }
  }
}));
