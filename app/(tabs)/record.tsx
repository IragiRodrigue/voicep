import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { Mic, Square, Pause, Play, Trash2, Upload, Info, CheckCircle } from 'lucide-react-native';
import { AUDIO_CONFIG } from '@/constants/audioConfig';

const { width } = Dimensions.get('window');

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function RecordScreen() {
  const { uploadSample, loading, samples } = useVoiceStore();
  const [recordings, setRecordings] = useState<{ uri: string; duration: number }[]>([]);
  const [selectedForUpload, setSelectedForUpload] = useState<Set<number>>(new Set());

  const {
    isRecording,
    isPaused,
    duration,
    uri,
    permissionStatus,
    requestPermission,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    reset
  } = useAudioRecorder({
    maxDuration: AUDIO_CONFIG.recording.maxDurationSeconds,
    onRecordingComplete: async (recordingUri, recordingDuration) => {
      if (recordingDuration >= AUDIO_CONFIG.recording.minDurationSeconds) {
        setRecordings(prev => [...prev, { uri: recordingUri, duration: recordingDuration }]);
      } else {
        Alert.alert(
          'Recording Too Short',
          `Minimum recording time is ${AUDIO_CONFIG.recording.minDurationSeconds} seconds.`
        );
      }
      reset();
    },
    onError: (error) => {
      Alert.alert('Recording Error', error.message);
    }
  });

  const totalDuration = recordings.reduce((acc, r) => acc + r.duration, 0);
  const progress = Math.min(
    (totalDuration / AUDIO_CONFIG.training.recommendedTotalDurationSeconds) * 100,
    100
  );
  const canCreateModel = totalDuration >= AUDIO_CONFIG.training.minTotalDurationSeconds;

  const handleDeleteRecording = (index: number) => {
    if (index === recordings.length - 1 && uri && recordings[index]?.uri === uri) {
      deleteRecording();
    }
    setRecordings(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSelectForUpload = (index: number) => {
    setSelectedForUpload(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleUpload = async () => {
    const toUpload = recordings.filter((_, i) => selectedForUpload.has(i));
    if (toUpload.length === 0) {
      Alert.alert('Select Recordings', 'Please select recordings to upload.');
      return;
    }

    let successCount = 0;
    for (const recording of toUpload) {
      const result = await uploadSample({
        uri: recording.uri,
        name: `sample_${Date.now()}.wav`,
        duration: recording.duration,
        size: recording.duration * 48000 * 2 // approximate size
      });
      if (result) successCount++;
    }

    Alert.alert(
      'Upload Complete',
      `Successfully uploaded ${successCount} of ${toUpload.length} recordings.`
    );

    // Remove uploaded recordings
    setRecordings(prev => prev.filter((_, i) => !selectedForUpload.has(i)));
    setSelectedForUpload(new Set());
  };

  useEffect(() => {
    if (permissionStatus === 'undetermined') {
      requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  if (permissionStatus === 'denied') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.permissionContainer}>
          <Mic color="#ef4444" size={64} />
          <Text style={styles.permissionTitle}>Microphone Access Required</Text>
          <Text style={styles.permissionText}>
            To record voice samples, please grant microphone access in your device settings.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Record Voice</Text>
          <Text style={styles.subtitle}>
            Create high-quality voice samples for model training
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Training Progress</Text>
            <Text style={styles.progressTime}>
              {formatDuration(totalDuration)} / {formatDuration(AUDIO_CONFIG.training.recommendedTotalDurationSeconds)}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.progressInfo}>
            {canCreateModel ? (
              <View style={styles.readyBadge}>
                <CheckCircle color="#16a34a" size={16} />
                <Text style={styles.readyText}>Ready for model creation</Text>
              </View>
            ) : (
              <Text style={styles.progressHint}>
                Need {formatDuration(AUDIO_CONFIG.training.minTotalDurationSeconds - totalDuration)} more
              </Text>
            )}
          </View>
        </View>

        <View style={styles.recorderContainer}>
          <View style={styles.waveformPlaceholder}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={[styles.pulse, isPaused && styles.pulsePaused]} />
              </View>
            )}
          </View>

          <Text style={styles.timerText}>
            {isRecording ? formatDuration(duration) : '00:00'}
          </Text>

          <Text style={styles.recordingHint}>
            {isRecording
              ? isPaused
                ? 'Paused - Tap resume to continue'
                : 'Recording... Speak clearly'
              : 'Tap the microphone to start recording'}
          </Text>

          <View style={styles.controls}>
            {!isRecording ? (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={startRecording}
              >
                <Mic color="#ffffff" size={32} />
              </TouchableOpacity>
            ) : (
              <View style={styles.activeControls}>
                {isPaused ? (
                  <TouchableOpacity
                    style={styles.resumeButton}
                    onPress={resumeRecording}
                  >
                    <Play color="#ffffff" size={24} />
                    <Text style={styles.buttonLabel}>Resume</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.pauseButton}
                    onPress={pauseRecording}
                  >
                    <Pause color="#ffffff" size={24} />
                    <Text style={styles.buttonLabel}>Pause</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopRecording}
                >
                  <Square color="#ffffff" size={24} />
                  <Text style={styles.buttonLabel}>Stop</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {recordings.length > 0 && (
          <View style={styles.recordingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recordings ({recordings.length})</Text>
              {selectedForUpload.size > 0 && (
                <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
                  <Upload color="#2563eb" size={16} />
                  <Text style={styles.uploadButtonText}>
                    Upload ({selectedForUpload.size})
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {recordings.map((recording, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.recordingItem,
                  selectedForUpload.has(index) && styles.recordingItemSelected
                ]}
                onPress={() => toggleSelectForUpload(index)}
              >
                <View style={styles.recordingInfo}>
                  <Text style={styles.recordingName}>Sample {index + 1}</Text>
                  <Text style={styles.recordingDuration}>
                    {formatDuration(recording.duration)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteRecording(index)}
                >
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.tipsCard}>
          <View style={styles.tipHeader}>
            <Info color="#2563eb" size={20} />
            <Text style={styles.tipTitle}>Recording Tips</Text>
          </View>
          <View style={styles.tipList}>
            <Text style={styles.tipText}>1. Record in a quiet environment</Text>
            <Text style={styles.tipText}>2. Speak clearly at a natural pace</Text>
            <Text style={styles.tipText}>3. Vary your tone and emotion</Text>
            <Text style={styles.tipText}>4. Include different speech patterns</Text>
            <Text style={styles.tipText}>5. Read from books or articles</Text>
          </View>
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
    paddingBottom: 16,
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
  progressCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  progressTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  progressInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  progressHint: {
    fontSize: 13,
    color: '#64748b',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  readyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#16a34a',
  },
  recorderContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  waveformPlaceholder: {
    width: width - 120,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  recordingIndicator: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
  },
  pulsePaused: {
    backgroundColor: '#f59e0b',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  recordingHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  controls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  activeControls: {
    flexDirection: 'row',
    gap: 16,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f59e0b',
    gap: 8,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    gap: 8,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    gap: 8,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  recordingsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recordingItemSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  recordingInfo: {
    flex: 1,
  },
  recordingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  recordingDuration: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  tipsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  tipList: {
    gap: 6,
  },
  tipText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomSpace: {
    height: 40,
  },
});
