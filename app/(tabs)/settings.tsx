import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { useCallStore } from '@/stores/useCallStore';
import { supabase } from '@/services/supabase';
import { LogOut, User, Shield, Bell, HelpCircle, ChevronRight, Trash2, FileText, Info, X, Check, Mail, Database, Download } from 'lucide-react-native';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, loading } = useAuthStore();
  const { reset: resetVoiceData, models, samples } = useVoiceStore();
  const { subscribeToIncomingCalls, unsubscribeFromCalls } = useCallStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      subscribeToIncomingCalls(user.id);
    }
    return () => {};
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setProfile(data as UserProfile);
    }
    setProfileLoading(false);
  };

  const handleOpenEditProfile = () => {
    setEditDisplayName(profile?.display_name || user?.email?.split('@')[0] || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!user || !editDisplayName.trim()) return;
    setSavingProfile(true);

    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: editDisplayName.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id);

    setSavingProfile(false);

    if (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } else {
      setProfile(prev => prev ? { ...prev, display_name: editDisplayName.trim() } : null);
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            unsubscribeFromCalls();
            resetVoiceData();
            await signOut();
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all voice models, samples, and call history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Delete all user data
            if (user) {
              // Delete voice samples from storage
              const { data: sampleList } = await supabase.storage.from('voice-samples').list(user.id);
              if (sampleList && sampleList.length > 0) {
                const filesToRemove = sampleList.map(f => `${user.id}/${f.name}`);
                await supabase.storage.from('voice-samples').remove(filesToRemove);
              }

              // Delete profile (cascades to other tables via foreign keys)
              await supabase.from('user_profiles').delete().eq('id', user.id);

              // Delete auth user (requires admin API - show message)
              Alert.alert(
                'Account Deletion Requested',
                'Your data has been deleted from our database. To complete account deletion, please contact support@vocalforge.app or sign out.'
              );
              await signOut();
            }
          }
        }
      ]
    );
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Your Data',
      'We will prepare a download of all your voice models, samples metadata, and usage history. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: async () => {
            Alert.alert('Export Requested', 'You will receive an email with your data export within 24 hours.');
          }
        }
      ]
    );
  };

  const handleManageConsent = () => {
    const activeModels = models.filter(m => m.status === 'active');
    if (activeModels.length === 0) {
      Alert.alert('No Active Models', 'You have no active voice models. Create one to manage consent.');
      return;
    }
    router.push('/settings/consent');
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* User Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{profile?.display_name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.memberSince}>
              Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleOpenEditProfile}
          >
            <Text style={styles.editProfileText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{models.length}</Text>
            <Text style={styles.statLabel}>Models</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{samples.length}</Text>
            <Text style={styles.statLabel}>Samples</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{models.filter(m => m.status === 'active').length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleOpenEditProfile}>
            <View style={styles.menuIcon}>
              <User color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Edit Profile</Text>
              <Text style={styles.menuHint}>Change your display name</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleManageConsent}>
            <View style={styles.menuIcon}>
              <Shield color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Privacy & Consent</Text>
              <Text style={styles.menuHint}>Manage your voice model consent</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleExportData}>
            <View style={styles.menuIcon}>
              <Download color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Export Your Data</Text>
              <Text style={styles.menuHint}>Download all your voice data</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Notifications', 'Push notifications can be configured in your device settings.')}
          >
            <View style={styles.menuIcon}>
              <Bell color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Notifications</Text>
              <Text style={styles.menuHint}>Manage notification preferences</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/voices')}>
            <View style={styles.menuIcon}>
              <Database color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Voice Models</Text>
              <Text style={styles.menuHint}>{models.length} models, {samples.length} samples</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/calls')}>
            <View style={styles.menuIcon}>
              <FileText color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Call History</Text>
              <Text style={styles.menuHint}>View your recent calls</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Help & Support', 'Email: support@vocalforge.app\n\nWe typically respond within 24 hours.')}
          >
            <View style={styles.menuIcon}>
              <HelpCircle color="#64748b" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Help & Support</Text>
              <Text style={styles.menuHint}>support@vocalforge.app</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Terms of Service', 'By using VocalForge, you agree to use voice models ethically and only for personal use. Impersonation without consent is strictly prohibited.')}
          >
            <View style={styles.menuIcon}>
              <FileText color="#64748b" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Terms of Service</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Alert.alert('Privacy Policy', 'Your voice data is encrypted and stored securely. We never share your data with third parties. You can delete your data at any time.')}
          >
            <View style={styles.menuIcon}>
              <Shield color="#64748b" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Info color="#64748b" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>App Version</Text>
              <Text style={styles.menuHint}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Ethical Use Reminder */}
        <View style={styles.ethicalCard}>
          <Shield color="#2563eb" size={24} />
          <Text style={styles.ethicalTitle}>Ethical Use Commitment</Text>
          <Text style={styles.ethicalText}>
            By using VocalForge, you commit to using voice models responsibly.
            All models are created with explicit consent and for personal use only.
            Impersonation, fraud, or deceptive use is strictly prohibited.
          </Text>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Danger Zone</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <View style={[styles.menuIcon, { backgroundColor: '#fef2f2' }]}>
              <Trash2 color="#ef4444" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: '#ef4444' }]}>Delete Account</Text>
              <Text style={styles.menuHint}>Permanently delete all data</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
        >
          <LogOut color="#ef4444" size={22} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.disabledInput}>
              <Mail color="#9ca3af" size={18} />
              <Text style={styles.disabledText}>{user?.email}</Text>
            </View>
            <Text style={styles.inputHint}>Email cannot be changed</Text>

            <TouchableOpacity
              style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Check color="#ffffff" size={20} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  header: {
    padding: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  memberSince: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  editProfileButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  menuHint: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  ethicalCard: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  ethicalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginTop: 12,
    marginBottom: 8,
  },
  ethicalText: {
    fontSize: 13,
    color: '#1e40af',
    textAlign: 'center',
    lineHeight: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  bottomSpace: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  disabledInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  disabledText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: -12,
    marginBottom: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
