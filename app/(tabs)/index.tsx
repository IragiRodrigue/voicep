import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { Mic, Library, Zap, Shield, ChevronRight, TrendingUp } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { models, fetchModels, samples, fetchSamples } = useVoiceStore();

  useEffect(() => {
    fetchModels();
    fetchSamples();
  }, [fetchModels, fetchSamples]);

  const activeModels = models.filter(m => m.status === 'active').length;
  const totalSamples = samples.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}</Text>
          </View>
          <View style={styles.headerBadge}>
            <Shield color="#2563eb" size={16} />
            <Text style={styles.headerBadgeText}>Consent Verified</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Library color="#2563eb" size={24} />
            <Text style={styles.statNumber}>{activeModels}</Text>
            <Text style={styles.statLabel}>Voice Models</Text>
          </View>
          <View style={styles.statCard}>
            <Mic color="#16a34a" size={24} />
            <Text style={styles.statNumber}>{totalSamples}</Text>
            <Text style={styles.statLabel}>Samples</Text>
          </View>
          <View style={styles.statCard}>
            <Zap color="#ea580c" size={24} />
            <Text style={styles.statNumber}>{activeModels}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/record')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
              <Mic color="#2563eb" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Record Voice Sample</Text>
              <Text style={styles.actionDescription}>
                Create high-quality voice samples for model training
              </Text>
            </View>
            <ChevronRight color="#94a3b8" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/voices')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
              <Library color="#16a34a" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Voice Library</Text>
              <Text style={styles.actionDescription}>
                Manage and use your voice models
              </Text>
            </View>
            <ChevronRight color="#94a3b8" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/effects')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Zap color="#ea580c" size={24} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Live Effects</Text>
              <Text style={styles.actionDescription}>
                Apply real-time voice effects and transformations
              </Text>
            </View>
            <ChevronRight color="#94a3b8" size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Record Voice Samples</Text>
              <Text style={styles.stepDescription}>
                Record at least 5 minutes of clear, varied speech
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Grant Explicit Consent</Text>
              <Text style={styles.stepDescription}>
                Confirm that you own the voice and consent to model creation
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Create Voice Model</Text>
              <Text style={styles.stepDescription}>
                AI processes your samples to create a personalized voice model
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Use Responsibly</Text>
              <Text style={styles.stepDescription}>
                Apply effects or transform your voice in real-time
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ethicalReminder}>
          <Shield color="#2563eb" size={20} />
          <Text style={styles.ethicalText}>
            Voice models are for personal use only. Impersonation
            without explicit consent is prohibited and may be illegal.
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 14,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
    marginLeft: 14,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  ethicalReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  ethicalText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  bottomSpace: {
    height: 40,
  },
});
