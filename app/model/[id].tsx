import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import {
  ArrowLeft,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  Trash2,
  XCircle,
  Play,
  FileAudio
} from 'lucide-react-native';

type ModelStatus = 'pending' | 'training' | 'active' | 'failed' | 'revoked';

interface VoiceModel {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ModelStatus;
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
  [key: string]: unknown;
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
  [key: string]: unknown;
}

export default function VoiceModelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [model, setModel] = useState<VoiceModel | null>(null);
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState(false);

  useEffect(() => {
    fetchModelDetails();
  }, [id]);

  const fetchModelDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);

      const { data: modelData, error: modelError } = await supabase
        .from('voice_models')
        .select('*')
        .eq('id', id)
        .single();

      if (modelError) throw modelError;
      const typedModel = modelData as VoiceModel;
      setModel(typedModel);

      if (typedModel && typedModel.consent_id) {
        const { data: consentData, error: consentError } = await supabase
          .from('consent_records')
          .select('*')
          .eq('id', typedModel.consent_id)
          .single();

        if (!consentError && consentData) setConsent(consentData as ConsentRecord);
      }
    } catch (error) {
      console.error('Failed to fetch model:', error);
      Alert.alert('Error', 'Failed to load voice model details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUseModel = async () => {
    if (!model || model.status !== 'active') {
      Alert.alert('Model Not Ready', 'This model is not ready for use.');
      return;
    }

    setUsing(true);
    router.push('/effects');
  };

  const handleRevokeConsent = async () => {
    if (!consent || !model) return;

    Alert.alert(
      'Revoke Consent',
      'This will permanently disable this voice model. You can create a new model if you change your mind later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('consent_records')
                .update({
                  revoked: true,
                  revoked_at: new Date().toISOString(),
                  revocation_reason: 'User requested revocation'
                });

              await supabase
                .from('voice_models')
                .update({
                  status: 'revoked',
                  revoked_at: new Date().toISOString()
                })
                .eq('id', model.id);

              Alert.alert('Consent Revoked', 'Your voice model has been disabled.');
              fetchModelDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke consent.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteModel = async () => {
    if (!model) return;

    Alert.alert(
      'Delete Voice Model',
      'This will permanently delete this voice model and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('voice_models')
                .delete()
                .eq('id', model.id);

              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete voice model.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!model) {
    return null;
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getStatusColor(status: ModelStatus): string {
    const colors: Record<string, string> = {
      active: '#16a34a',
      training: '#f59e0b',
      pending: '#64748b',
      failed: '#ef4444',
      revoked: '#94a3b8'
    };
    return colors[status] || '#64748b';
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#2563eb" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Model</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.modelHeader}>
            <Text style={styles.modelName}>{model.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(model.status) }]}>
              <Text style={styles.statusText}>{model.status}</Text>
            </View>
          </View>

          {model.description && (
            <Text style={styles.description}>{model.description}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <FileAudio color="#64748b" size={20} />
              <Text style={styles.statValue}>{model.sample_count} samples</Text>
            </View>
            <View style={styles.statItem}>
              <Clock color="#64748b" size={20} />
              <Text style={styles.statValue}>{formatDate(model.created_at)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.useButton, model.status !== 'active' && styles.useButtonDisabled]}
            onPress={handleUseModel}
            disabled={model.status !== 'active' || using}
          >
            <Play color="#ffffff" size={20} />
            <Text style={styles.useButtonText}>
              {using ? 'Loading...' : 'Use This Model'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consent Record</Text>

          {consent ? (
            <View style={styles.consentCard}>
              <View style={styles.consentHeader}>
                <Shield color="#2563eb" size={24} />
                <View style={styles.consentInfo}>
                  <Text style={styles.consentLabel}>
                    {consent.revoked ? 'Consent Revoked' : 'Valid Consent'}
                  </Text>
                  <Text style={styles.consentDate}>
                    Granted: {formatDate(consent.consented_at)}
                  </Text>
                </View>
                {consent.revoked ? (
                  <XCircle color="#ef4444" size={24} />
                ) : (
                  <CheckCircle color="#16a34a" size={24} />
                )}
              </View>

              {consent.revoked && consent.revoked_at && (
                <View style={styles.revokedNotice}>
                  <AlertCircle color="#ef4444" size={16} />
                  <Text style={styles.revokedText}>
                    Revoked on {formatDate(consent.revoked_at)}
                  </Text>
                </View>
              )}

              <Text style={styles.consentHash}>
                ID: {consent.id.substring(0, 8)}...
              </Text>
            </View>
          ) : (
            <Text style={styles.noConsent}>No consent record found</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Format</Text>
            <Text style={styles.detailValue}>{model.model_format.toUpperCase()}</Text>
          </View>

          {model.model_size_mb && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Size</Text>
              <Text style={styles.detailValue}>{model.model_size_mb} MB</Text>
            </View>
          )}

          {model.training_duration_seconds && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Training Time</Text>
              <Text style={styles.detailValue}>
                {Math.round(model.training_duration_seconds / 60)} min
              </Text>
            </View>
          )}
        </View>

        <View style={styles.dangerSection}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Danger Zone</Text>

          {!(consent?.revoked) && (
            <TouchableOpacity style={styles.revokeButton} onPress={handleRevokeConsent}>
              <AlertCircle color="#f59e0b" size={20} />
              <Text style={styles.revokeButtonText}>Revoke Consent</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteModel}>
            <Trash2 color="#ef4444" size={20} />
            <Text style={styles.deleteButtonText}>Delete Model</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    padding: 20,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modelName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 14,
    color: '#64748b',
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  useButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  useButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  consentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  consentInfo: {
    flex: 1,
  },
  consentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  consentDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  revokedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  revokedText: {
    color: '#ef4444',
    fontSize: 13,
  },
  consentHash: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 12,
    fontFamily: 'monospace',
  },
  noConsent: {
    fontSize: 14,
    color: '#64748b',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  dangerSection: {
    padding: 20,
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
    marginBottom: 12,
  },
  revokeButtonText: {
    color: '#b45309',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 15,
  },
  bottomSpace: {
    height: 60,
  },
});
