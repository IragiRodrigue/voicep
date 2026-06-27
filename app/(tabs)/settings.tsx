import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { LogOut, User, Shield, Bell, HelpCircle, ChevronRight, Trash2, FileText, Info } from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, loading } = useAuthStore();
  const { reset: resetVoiceData } = useVoiceStore();

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
      'This action cannot be undone. All your voice models and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Please contact support to delete your account.');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* User Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <User color="#2563eb" size={32} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => Alert.alert('Edit Profile', 'Profile editing coming soon.')}
          >
            <Text style={styles.editProfileText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Shield color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Privacy & Security</Text>
              <Text style={styles.menuHint}>Manage your data and consent records</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Bell color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Notifications</Text>
              <Text style={styles.menuHint}>Training updates, model ready alerts</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Data Management', 'Data export coming soon.')}>
            <View style={styles.menuIcon}>
              <FileText color="#2563eb" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Data Management</Text>
              <Text style={styles.menuHint}>Export or delete your voice data</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <HelpCircle color="#64748b" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Help & Support</Text>
              <Text style={styles.menuHint}>FAQs, contact support</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <FileText color="#64748b" size={22} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Terms of Service</Text>
            </View>
            <ChevronRight color="#cbd5e1" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
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
    marginBottom: 24,
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
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
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
  editProfileButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
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
});
