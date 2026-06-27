import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffectsStore } from '@/stores/useEffectsStore';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { VOICE_EFFECTS, VOICE_PRESETS } from '@/constants/voiceEffects';
import type { AudioEffectType, VoicePreset } from '@/types/audio';
import { Mic, MicOff, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function EffectsScreen() {
  const {
    effects,
    selectedPreset,
    masterVolume,
    monitoringEnabled,
    setEffectParam,
    toggleEffect,
    setPreset,
    setMasterVolume,
    toggleMonitoring,
    resetEffects,
    loadSavedSettings
  } = useEffectsStore();

  const { activeModel } = useVoiceStore();
  const [expandedEffect, setExpandedEffect] = useState<AudioEffectType | null>(null);

  useEffect(() => {
    loadSavedSettings();
  }, [loadSavedSettings]);

  const formatValue = (value: number, param: string): string => {
    if (param.includes('gain') || param.includes('threshold')) {
      return `${value > 0 ? '+' : ''}${value} dB`;
    }
    if (param.includes('freq') || param === 'carrier_freq' || param === 'modulator_freq') {
      return `${value} Hz`;
    }
    if (param.includes('time') || param === 'attack' || param === 'release') {
      return `${value} ms`;
    }
    if (value >= 0 && value <= 1) {
      return `${Math.round(value * 100)}%`;
    }
    return value.toString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Voice Effects</Text>
          <Text style={styles.subtitle}>
            Apply real-time effects to transform your voice
          </Text>
        </View>

        {activeModel && (
          <View style={styles.activeModelBanner}>
            <Text style={styles.activeModelLabel}>Using Model:</Text>
            <Text style={styles.activeModelName}>{activeModel.name}</Text>
          </View>
        )}

        {/* Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Presets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {VOICE_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetButton,
                  selectedPreset === preset.id && styles.presetButtonActive
                ]}
                onPress={() => setPreset(preset.id as VoicePreset)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedPreset === preset.id && styles.presetTextActive
                  ]}
                >
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Live Monitoring Control */}
        <View style={styles.monitoringCard}>
          <View style={styles.monitoringInfo}>
            <Text style={styles.monitoringTitle}>Live Monitoring</Text>
            <Text style={styles.monitoringStatus}>
              {monitoringEnabled ? 'Active - Speak to hear effects' : 'Inactive'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.monitoringButton,
              monitoringEnabled && styles.monitoringButtonActive
            ]}
            onPress={toggleMonitoring}
          >
            {monitoringEnabled ? (
              <MicOff color="#ffffff" size={24} />
            ) : (
              <Mic color="#ffffff" size={24} />
            )}
          </TouchableOpacity>
        </View>

        {/* Master Volume */}
        <View style={styles.section}>
          <View style={styles.volumeControl}>
            <Text style={styles.volumeLabel}>Master Volume</Text>
            <Text style={styles.volumeValue}>{Math.round(masterVolume * 100)}%</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={masterVolume}
              onValueChange={setMasterVolume}
              minimumTrackTintColor="#2563eb"
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor="#2563eb"
            />
          </View>
        </View>

        {/* Effects List */}
        <View style={styles.section}>
          <View style={styles.effectsHeader}>
            <Text style={styles.sectionTitle}>Effects</Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetEffects}>
              <RotateCcw color="#64748b" size={16} />
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          {VOICE_EFFECTS.map(effect => {
            const currentEffect = effects.find(e => e.type === effect.id);
            const isExpanded = expandedEffect === effect.id;

            return (
              <View key={effect.id} style={styles.effectCard}>
                <TouchableOpacity
                  style={styles.effectHeader}
                  onPress={() => setExpandedEffect(isExpanded ? null : effect.id)}
                >
                  <View style={styles.effectInfo}>
                    <Text style={styles.effectName}>{effect.name}</Text>
                    <Text style={styles.effectDescription}>{effect.description}</Text>
                  </View>
                  <View style={styles.effectControls}>
                    <TouchableOpacity
                      style={[
                        styles.effectToggle,
                        currentEffect?.enabled && styles.effectToggleActive
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleEffect(effect.id);
                      }}
                    >
                      <Text style={[
                        styles.effectToggleText,
                        currentEffect?.enabled && styles.effectToggleTextActive
                      ]}>
                        {currentEffect?.enabled ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                    {isExpanded ? (
                      <ChevronUp color="#64748b" size={20} />
                    ) : (
                      <ChevronDown color="#64748b" size={20} />
                    )}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.effectParams}>
                    {Object.entries(effect.paramRanges).map(([param, range]) => (
                      <View key={param} style={styles.paramRow}>
                        <View style={styles.paramHeader}>
                          <Text style={styles.paramLabel}>{range.label}</Text>
                          <Text style={styles.paramValue}>
                            {formatValue(currentEffect?.params?.[param] ?? effect.defaultParams[param], param)}
                          </Text>
                        </View>
                        <View style={styles.sliderContainer}>
                          <Slider
                            style={styles.slider}
                            minimumValue={range.min}
                            maximumValue={range.max}
                            step={range.step}
                            value={currentEffect?.params?.[param] ?? effect.defaultParams[param]}
                            onValueChange={(value: number) => setEffectParam(effect.id, param, value)}
                            minimumTrackTintColor="#2563eb"
                            maximumTrackTintColor="#e2e8f0"
                            thumbTintColor="#2563eb"
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Voice effects are applied in real-time. For best results, use headphones
            to prevent feedback. Effects may have slight latency depending on your device.
          </Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
  },
  activeModelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  activeModelLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  activeModelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  presetTextActive: {
    color: '#ffffff',
  },
  monitoringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monitoringInfo: {
    flex: 1,
  },
  monitoringTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  monitoringStatus: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  monitoringButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monitoringButtonActive: {
    backgroundColor: '#2563eb',
  },
  volumeControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  volumeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  volumeValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2563eb',
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  effectsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetButtonText: {
    color: '#64748b',
    fontSize: 14,
  },
  effectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  effectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  effectInfo: {
    flex: 1,
  },
  effectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  effectDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  effectControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  effectToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  effectToggleActive: {
    backgroundColor: '#16a34a',
  },
  effectToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  effectToggleTextActive: {
    color: '#ffffff',
  },
  effectParams: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paramRow: {
    marginTop: 12,
  },
  paramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paramLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  paramValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563eb',
  },
  disclaimer: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
    textAlign: 'center',
  },
  bottomSpace: {
    height: 100,
  },
});
