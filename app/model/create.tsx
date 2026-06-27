import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { AUDIO_CONFIG } from '@/constants/audioConfig';
import { ArrowRight, CheckCircle, AlertCircle, Mic, Shield, Clock, FileAudio } from 'lucide-react-native';

const CONSENT_TEXT = `
VOICE MODEL CONSENT AGREEMENT

1. VOICE OWNERSHIP
I confirm that I am the owner of the voice being recorded and modeled.
I have the right to provide consent for this voice model creation.

2. PURPOSE AND USE
I consent to the creation of a voice model derived from my voice samples.
This model will be used solely for purposes I explicitly authorize:
- Personal entertainment and content creation
- Accessibility purposes
- Voice experimentation within this application
- Other legitimate purposes as I determine

3. PROHIBITED USES
I understand that the following uses are STRICTLY PROHIBITED:
- Impersonating any other person without their explicit consent
- Fraud, deception, or any illegal activities
- Harassment, bullying, or causing distress to others
- Political manipulation or spreading misinformation
- Any use that violates applicable laws or regulations

4. CONSENT REVOCATION
I understand I can revoke this consent at any time.
Upon revocation, the voice model will be permanently disabled.

5. AGE CONFIRMATION
I confirm I am at least 18 years of age.

6. DATA STORAGE
I consent to the secure storage of my voice samples and model.
I understand I can request deletion of all my voice data at any time.

By signing below, I acknowledge that I have read and understood this agreement.
`;

export default function CreateModelScreen() {
  const router = useRouter();
  const { samples, models, createModel, createConsent, loading, error } = useVoiceStore();
  const [step, setStep] = useState(1);
  const [modelName, setModelName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set());

  // Consent checkboxes
  const [consents, setConsents] = useState({
    voiceOwnership: false,
    consentToModel: false,
    prohibitedUsesAgreed: false,
    ageConfirmed: false,
    revocationUnderstood: false,
    dataStorageConsent: false
  });

  const [signature, setSignature] = useState('');

  const totalDuration = samples
    .filter(s => selectedSamples.has(s.id))
    .reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const canProceedToConsent = totalDuration >= AUDIO_CONFIG.training.minTotalDurationSeconds;
  const allConsentsChecked = Object.values(consents).every(Boolean);

  useEffect(() => {
    // Auto-select all samples by default
    setSelectedSamples(new Set(samples.map(s => s.id)));
  }, [samples]);

  const toggleSample = (sampleId: string) => {
    setSelectedSamples(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sampleId)) {
        newSet.delete(sampleId);
      } else {
        newSet.add(sampleId);
      }
      return newSet;
    });
  };

  const handleCreateModel = async () => {
    if (!modelName.trim()) {
      Alert.alert('Error', 'Please enter a name for your voice model.');
      return;
    }

    if (!signature.trim()) {
      Alert.alert('Error', 'Please type your name as a signature.');
      return;
    }

    // Create consent record
    const consentResult = await createConsent({
      consentTextHash: await hashConsentText(CONSENT_TEXT),
      signature
    });

    if (!consentResult) {
      Alert.alert('Error', 'Failed to create consent record.');
      return;
    }

    // Create model
    const model = await createModel({
      name: modelName,
      description,
      consentId: consentResult.id,
      consentHash: consentResult.consent_text_hash
    });

    if (model) {
      Alert.alert(
        'Voice Model Created',
        'Your voice model is being created. This may take several minutes.',
        [
          { text: 'OK', onPress: () => router.replace('/voices') }
        ]
      );
    }
  };

  // Simple hash function for consent text
  const hashConsentText = async (text: string): Promise<string> => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Model</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        <View style={[styles.step, step >= 1 && styles.stepActive]}>
          <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
          <Text style={styles.stepLabel}>Samples</Text>
        </View>
        <View style={[styles.stepConnector, step >= 2 && styles.stepConnectorActive]} />
        <View style={[styles.step, step >= 2 && styles.stepActive]}>
          <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
          <Text style={styles.stepLabel}>Details</Text>
        </View>
        <View style={[styles.stepConnector, step >= 3 && styles.stepConnectorActive]} />
        <View style={[styles.step, step >= 3 && styles.stepActive]}>
          <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
          <Text style={styles.stepLabel}>Consent</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select Voice Samples</Text>
              <Text style={styles.stepDescription}>
                Choose samples to train your model. Minimum {AUDIO_CONFIG.training.minTotalDurationSeconds} seconds required.
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <FileAudio color="#2563eb" size={20} />
                  <Text style={styles.statLabel}>Selected</Text>
                  <Text style={styles.statValue}>{selectedSamples.size}</Text>
                </View>
                <View style={styles.statItem}>
                  <Clock color="#16a34a" size={20} />
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>{Math.round(totalDuration)}s</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((totalDuration / AUDIO_CONFIG.training.recommendedTotalDurationSeconds) * 100, 100)}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {canProceedToConsent ? (
                  <Text style={styles.readyText}>Ready for training</Text>
                ) : (
                  `Need ${AUDIO_CONFIG.training.minTotalDurationSeconds - Math.round(totalDuration)}s more`
                )}
              </Text>
            </View>

            <View style={styles.samplesList}>
              {samples.length === 0 ? (
                <View style={styles.emptySamples}>
                  <Mic color="#d1d5db" size={48} />
                  <Text style={styles.emptyText}>No voice samples available</Text>
                  <TouchableOpacity
                    style={styles.recordButton}
                    onPress={() => router.push('/record')}
                  >
                    <Text style={styles.recordButtonText}>Record Samples</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                samples.map(sample => (
                  <TouchableOpacity
                    key={sample.id}
                    style={[
                      styles.sampleItem,
                      selectedSamples.has(sample.id) && styles.sampleItemSelected
                    ]}
                    onPress={() => toggleSample(sample.id)}
                  >
                    <View style={styles.sampleCheck}>
                      {selectedSamples.has(sample.id) && (
                        <CheckCircle color="#2563eb" size={20} />
                      )}
                    </View>
                    <View style={styles.sampleInfo}>
                      <Text style={styles.sampleName}>{sample.file_name}</Text>
                      <Text style={styles.sampleDuration}>
                        {Math.round(sample.duration_seconds || 0)}s
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <TouchableOpacity
              style={[styles.nextButton, !canProceedToConsent && styles.nextButtonDisabled]}
              onPress={() => canProceedToConsent && setStep(2)}
              disabled={!canProceedToConsent}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <ArrowRight color="#ffffff" size={20} />
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Model Details</Text>
              <Text style={styles.stepDescription}>
                Give your voice model a name and description
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Model Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., My Professional Voice"
                placeholderTextColor="#9ca3af"
                value={modelName}
                onChangeText={setModelName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="Describe the voice characteristics..."
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={[styles.nextButton, !modelName.trim() && styles.nextButtonDisabled]}
                onPress={() => modelName.trim() && setStep(3)}
                disabled={!modelName.trim()}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <ArrowRight color="#ffffff" size={20} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.stepContent}>
              <View style={styles.consentHeader}>
                <Shield color="#2563eb" size={32} />
                <Text style={styles.stepTitle}>Consent Agreement</Text>
              </View>
              <Text style={styles.stepDescription}>
                Please read and accept the terms below to create your voice model
              </Text>
            </View>

            <View style={styles.consentBox}>
              <Text style={styles.consentText}>{CONSENT_TEXT}</Text>
            </View>

            <View style={styles.consentsList}>
              <TouchableOpacity
                style={styles.consentItem}
                onPress={() => setConsents(prev => ({ ...prev, voiceOwnership: !prev.voiceOwnership }))}
              >
                <View style={[styles.consentCheck, consents.voiceOwnership && styles.consentCheckActive]}>
                  {consents.voiceOwnership && <CheckCircle color="#ffffff" size={16} />}
                </View>
                <Text style={styles.consentText}>I confirm I own this voice and have the right to model it</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentItem}
                onPress={() => setConsents(prev => ({ ...prev, consentToModel: !prev.consentToModel }))}
              >
                <View style={[styles.consentCheck, consents.consentToModel && styles.consentCheckActive]}>
                  {consents.consentToModel && <CheckCircle color="#ffffff" size={16} />}
                </View>
                <Text style={styles.consentText}>I consent to the creation of this voice model</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentItem}
                onPress={() => setConsents(prev => ({ ...prev, prohibitedUsesAgreed: !prev.prohibitedUsesAgreed }))}
              >
                <View style={[styles.consentCheck, consents.prohibitedUsesAgreed && styles.consentCheckActive]}>
                  {consents.prohibitedUsesAgreed && <CheckCircle color="#ffffff" size={16} />}
                </View>
                <Text style={styles.consentText}>I understand prohibited uses and consequences</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentItem}
                onPress={() => setConsents(prev => ({ ...prev, ageConfirmed: !prev.ageConfirmed }))}
              >
                <View style={[styles.consentCheck, consents.ageConfirmed && styles.consentCheckActive]}>
                  {consents.ageConfirmed && <CheckCircle color="#ffffff" size={16} />}
                </View>
                <Text style={styles.consentText}>I confirm I am at least 18 years old</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentItem}
                onPress={() => setConsents(prev => ({ ...prev, revocationUnderstood: !prev.revocationUnderstood }))}
              >
                <View style={[styles.consentCheck, consents.revocationUnderstood && styles.consentCheckActive]}>
                  {consents.revocationUnderstood && <CheckCircle color="#ffffff" size={16} />}
                </View>
                <Text style={styles.consentText}>I understand I can revoke consent at any time</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentItem}
                onPress={() => setConsents(prev => ({ ...prev, dataStorageConsent: !prev.dataStorageConsent }))}
              >
                <View style={[styles.consentCheck, consents.dataStorageConsent && styles.consentCheckActive]}>
                  {consents.dataStorageConsent && <CheckCircle color="#ffffff" size={16} />}
                </View>
                <Text style={styles.consentText}>I consent to secure storage of my voice data</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Digital Signature *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Type your full name as signature"
                placeholderTextColor="#9ca3af"
                value={signature}
                onChangeText={setSignature}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.createButton,
                (!allConsentsChecked || !signature.trim() || loading) && styles.createButtonDisabled
              ]}
              onPress={handleCreateModel}
              disabled={!allConsentsChecked || !signature.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Shield color="#ffffff" size={20} />
                  <Text style={styles.createButtonText}>Create Voice Model</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  cancelButton: {
    fontSize: 16,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerSpacer: {
    width: 60,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  step: {
    alignItems: 'center',
  },
  stepActive: {
    opacity: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 32,
    color: '#94a3b8',
    fontWeight: '600',
  },
  stepNumberActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  stepConnector: {
    width: 40,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  stepConnectorActive: {
    backgroundColor: '#2563eb',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  stepDescription: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 4,
  },
  progressLabel: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  readyText: {
    color: '#16a34a',
    fontWeight: '500',
  },
  samplesList: {
    paddingHorizontal: 20,
  },
  sampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sampleItemSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  sampleCheck: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sampleInfo: {
    marginLeft: 14,
    flex: 1,
  },
  sampleName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  sampleDuration: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  emptySamples: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  recordButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  recordButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  formGroup: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  consentBox: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 200,
  },
  consentText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  consentsList: {
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  consentCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consentCheckActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  bottomSpace: {
    height: 60,
  },
});
