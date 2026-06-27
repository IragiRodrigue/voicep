import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { VoiceModel } from '@/types/database';
import { Plus, Volume2, Clock, AlertCircle, CheckCircle, XCircle, Trash2, X, Loader } from 'lucide-react-native';

function getStatusIcon(status: VoiceModel['status']) {
  switch (status) {
    case 'active':
      return <CheckCircle color="#16a34a" size={20} />;
    case 'training':
      return <Loader color="#f59e0b" size={20} />;
    case 'pending':
      return <Clock color="#64748b" size={20} />;
    case 'failed':
      return <XCircle color="#ef4444" size={20} />;
    case 'revoked':
      return <AlertCircle color="#64748b" size={20} />;
    default:
      return null;
  }
}

function getStatusLabel(status: VoiceModel['status']): string {
  switch (status) {
    case 'active': return 'Ready';
    case 'training': return 'Training';
    case 'pending': return 'Pending';
    case 'failed': return 'Failed';
    case 'revoked': return 'Revoked';
    default: return status;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function VoicesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    models,
    samples,
    loading,
    fetchModels,
    fetchSamples,
    deleteModel,
    revokeModel,
    setActiveModel,
    activeModel
  } = useVoiceStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchModels();
    fetchSamples();
  }, [fetchModels, fetchSamples]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchModels(), fetchSamples()]);
    setRefreshing(false);
  };

  const handleDeleteModel = (model: VoiceModel) => {
    Alert.alert(
      'Delete Voice Model',
      `Are you sure you want to delete "${model.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteModel(model.id)
        }
      ]
    );
  };

  const handleRevokeModel = (model: VoiceModel) => {
    Alert.alert(
      'Revoke Voice Model',
      `Revoking will disable this voice model. You can restore it later by creating a new consent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => revokeModel(model.id)
        }
      ]
    );
  };

  const handleSelectModel = (model: VoiceModel) => {
    if (model.status === 'active') {
      setActiveModel(model);
      Alert.alert('Voice Selected', `"${model.name}" is now your active voice model.`);
    }
  };

  const activeModels = models.filter(m => m.status === 'active');
  const trainingModels = models.filter(m => m.status === 'training');
  const otherModels = models.filter(m => !['active', 'training'].includes(m.status));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Library</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/model/create')}
        >
          <Plus color="#ffffff" size={20} />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeModel && (
          <View style={styles.activeModelBanner}>
            <Volume2 color="#2563eb" size={20} />
            <View style={styles.activeModelInfo}>
              <Text style={styles.activeModelLabel}>Active Model</Text>
              <Text style={styles.activeModelName}>{activeModel.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveModel(null)}>
              <X color="#64748b" size={20} />
            </TouchableOpacity>
          </View>
        )}

        {models.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Volume2 color="#d1d5db" size={64} />
            <Text style={styles.emptyTitle}>No Voice Models</Text>
            <Text style={styles.emptyText}>
              Record voice samples and create your first voice model to get started.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/record')}
            >
              <Text style={styles.emptyButtonText}>Record Samples</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeModels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Models</Text>
                {activeModels.map(model => (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.modelCard,
                      activeModel?.id === model.id && styles.modelCardActive
                    ]}
                    onPress={() => handleSelectModel(model)}
                  >
                    <View style={styles.modelHeader}>
                      <View style={styles.modelInfo}>
                        <Text style={styles.modelName}>{model.name}</Text>
                        <View style={styles.modelMeta}>
                          {getStatusIcon(model.status)}
                          <Text style={styles.modelStatus}>{getStatusLabel(model.status)}</Text>
                          <Text style={styles.modelDot}>.</Text>
                          <Text style={styles.modelDate}>{formatDate(model.created_at)}</Text>
                        </View>
                      </View>
                      <View style={styles.modelActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => router.push(`/model/${model.id}`)}
                        >
                          <Text style={styles.actionLink}>Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {model.description && (
                      <Text style={styles.modelDescription}>{model.description}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {trainingModels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Training</Text>
                {trainingModels.map(model => (
                  <View key={model.id} style={styles.modelCard}>
                    <View style={styles.modelHeader}>
                      <View style={styles.modelInfo}>
                        <Text style={styles.modelName}>{model.name}</Text>
                        <View style={styles.modelMeta}>
                          {getStatusIcon(model.status)}
                          <Text style={styles.modelStatus}>{getStatusLabel(model.status)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.trainingProgress}>
                      <View style={styles.trainingBar} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {otherModels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Other</Text>
                {otherModels.map(model => (
                  <View key={model.id} style={styles.modelCard}>
                    <View style={styles.modelHeader}>
                      <View style={styles.modelInfo}>
                        <Text style={styles.modelName}>{model.name}</Text>
                        <View style={styles.modelMeta}>
                          {getStatusIcon(model.status)}
                          <Text style={styles.modelStatus}>{getStatusLabel(model.status)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteModel(model)}
                      >
                        <Trash2 color="#ef4444" size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.samplesSection}>
          <Text style={styles.sectionTitle}>Voice Samples ({samples.length})</Text>
          <Text style={styles.samplesHint}>
            Record at least 5 minutes of voice samples to create a voice model.
          </Text>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={() => router.push('/record')}
          >
            <Volume2 color="#2563eb" size={20} />
            <Text style={styles.recordButtonText}>Record New Samples</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  activeModelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  activeModelInfo: {
    flex: 1,
  },
  activeModelLabel: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  activeModelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  modelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modelCardActive: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  modelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modelStatus: {
    fontSize: 13,
    color: '#64748b',
  },
  modelDot: {
    color: '#d1d5db',
    marginHorizontal: 2,
  },
  modelDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  modelDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 20,
  },
  modelActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  actionLink: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  deleteButton: {
    padding: 8,
  },
  trainingProgress: {
    marginTop: 12,
  },
  trainingBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  samplesSection: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  samplesHint: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    marginBottom: 16,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 8,
  },
  recordButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomSpace: {
    height: 40,
  },
});
