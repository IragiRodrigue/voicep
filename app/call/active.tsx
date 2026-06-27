import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCallStore } from '@/stores/useCallStore';
import { useEffectsStore } from '@/stores/useEffectsStore';
import Slider from '@react-native-community/slider';
import { PhoneOff, Mic, MicOff, Volume2, Settings, Clock } from 'lucide-react-native';

export default function ActiveCallScreen() {
  const router = useRouter();
  const {
    currentCall,
    isOutgoing,
    callerId,
    calleeId,
    duration,
    endCall,
    toggleMute,
    setVoiceEffect,
    voiceEffect,
    updateDuration
  } = useCallStore();

  const { effects, setEffectParam } = useEffectsStore();
  const [isMuted, setIsMuted] = useState(false);
  const [showEffects, setShowEffects] = useState(true);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start duration counter
    durationInterval.current = setInterval(() => {
      updateDuration();
    }, 1000);

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const handleEndCall = async () => {
    await endCall();
    router.replace('/calls');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    toggleMute();
    setIsMuted(!isMuted);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.callInfo}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(isOutgoing ? calleeId : callerId)?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        </View>

        <Text style={styles.callStatus}>
          {isOutgoing ? 'Outgoing Call' : 'Incoming Call'}
        </Text>

        <View style={styles.durationContainer}>
          <Clock color="#94a3b8" size={16} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      </View>

      {/* Voice Effects Panel */}
      {showEffects && (
        <View style={styles.effectsPanel}>
          <View style={styles.effectsHeader}>
            <Text style={styles.effectsTitle}>Voice Effects</Text>
            <TouchableOpacity onPress={() => setShowEffects(false)}>
              <Text style={styles.hideText}>Hide</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.effectsList} showsVerticalScrollIndicator={false}>
            {/* Pitch Control */}
            <View style={styles.effectItem}>
              <View style={styles.effectHeader}>
                <Text style={styles.effectLabel}>Pitch</Text>
                <Text style={styles.effectValue}>
                  {voiceEffect.pitch > 0 ? '+' : ''}{voiceEffect.pitch} semitones
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={-12}
                maximumValue={12}
                step={1}
                value={voiceEffect.pitch}
                onValueChange={(value: number) => {
                  setVoiceEffect({ pitch: value });
                }}
                minimumTrackTintColor="#2563eb"
                maximumTrackTintColor="#374151"
                thumbTintColor="#2563eb"
              />
            </View>

            {/* Formant Control */}
            <View style={styles.effectItem}>
              <View style={styles.effectHeader}>
                <Text style={styles.effectLabel}>Formant</Text>
                <Text style={styles.effectValue}>
                  {voiceEffect.formant.toFixed(1)}x
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2}
                step={0.1}
                value={voiceEffect.formant}
                onValueChange={(value: number) => {
                  setVoiceEffect({ formant: value });
                }}
                minimumTrackTintColor="#2563eb"
                maximumTrackTintColor="#374151"
                thumbTintColor="#2563eb"
              />
            </View>

            {/* Reverb Control */}
            <View style={styles.effectItem}>
              <View style={styles.effectHeader}>
                <Text style={styles.effectLabel}>Reverb</Text>
                <Text style={styles.effectValue}>
                  {Math.round(voiceEffect.reverb * 100)}%
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={voiceEffect.reverb}
                onValueChange={(value: number) => {
                  setVoiceEffect({ reverb: value });
                }}
                minimumTrackTintColor="#2563eb"
                maximumTrackTintColor="#374151"
                thumbTintColor="#2563eb"
              />
            </View>

            {/* Noise Gate */}
            <View style={styles.effectItem}>
              <View style={styles.effectHeader}>
                <Text style={styles.effectLabel}>Noise Gate</Text>
                <Text style={styles.effectValue}>
                  {voiceEffect.noiseGate} dB
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={-80}
                maximumValue={-20}
                step={5}
                value={voiceEffect.noiseGate}
                onValueChange={(value: number) => {
                  setVoiceEffect({ noiseGate: value });
                }}
                minimumTrackTintColor="#2563eb"
                maximumTrackTintColor="#374151"
                thumbTintColor="#2563eb"
              />
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsContainer}>
              <Text style={styles.presetsTitle}>Quick Presets</Text>
              <View style={styles.presetsButtons}>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setVoiceEffect({ pitch: -3, formant: 0.9, reverb: 0, noiseGate: -40 })}
                >
                  <Text style={styles.presetText}>Deep</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setVoiceEffect({ pitch: 4, formant: 1.2, reverb: 0, noiseGate: -40 })}
                >
                  <Text style={styles.presetText}>High</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setVoiceEffect({ pitch: 0, formant: 1, reverb: 0.3, noiseGate: -40 })}
                >
                  <Text style={styles.presetText}>Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setVoiceEffect({ pitch: 0, formant: 1, reverb: 0.8, noiseGate: -50 })}
                >
                  <Text style={styles.presetText}>Ethereal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {!showEffects && (
        <TouchableOpacity
          style={styles.showEffectsButton}
          onPress={() => setShowEffects(true)}
        >
          <Settings color="#2563eb" size={20} />
          <Text style={styles.showEffectsText}>Show Effects</Text>
        </TouchableOpacity>
      )}

      {/* Call Controls */}
      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={handleToggleMute}
          >
            {isMuted ? (
              <MicOff color="#ffffff" size={24} />
            ) : (
              <Mic color="#ffffff" size={24} />
            )}
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <PhoneOff color="#ffffff" size={28} />
            <Text style={styles.endCallLabel}>End</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton}>
            <Volume2 color="#ffffff" size={24} />
            <Text style={styles.controlLabel}>Speaker</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  callInfo: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e40af',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#ffffff',
  },
  callStatus: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  effectsPanel: {
    flex: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  effectsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  effectsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  hideText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  effectsList: {
    padding: 16,
  },
  effectItem: {
    marginBottom: 20,
  },
  effectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  effectLabel: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  effectValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  slider: {
    height: 40,
  },
  presetsContainer: {
    marginTop: 16,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 12,
  },
  presetsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#334155',
    borderRadius: 20,
  },
  presetText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  showEffectsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  showEffectsText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
  },
  controls: {
    paddingBottom: 50,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  controlButton: {
    alignItems: 'center',
    width: 70,
  },
  controlButtonActive: {
    opacity: 0.7,
  },
  controlLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallLabel: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 4,
  },
});
