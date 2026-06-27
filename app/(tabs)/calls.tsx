import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import type { CallLog, Contact } from '@/services/callService';
import { Phone, UserPlus, Clock, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, ChevronRight, X, Check } from 'lucide-react-native';

interface UserProfile {
  id: string;
  email: string;
}

interface ContactWithProfile extends Contact {
  contactProfile?: UserProfile;
}

interface CallLogWithProfile extends CallLog {
  otherUserEmail?: string;
}

export default function CallsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [recentLogs, setRecentLogs] = useState<CallLogWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchContacts(), fetchRecentLogs()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;

      // Fetch profiles for contacts
      const contactsWithProfiles = await Promise.all(
        (contactsData || []).map(async (contact: Contact) => {
          const { data: profile } = await supabase.auth.admin.getUserById(contact.contact_user_id);
          return {
            ...contact,
            contactProfile: profile?.user ? {
              id: profile.user.id,
              email: profile.user.email || ''
            } : undefined
          };
        })
      );

      setContacts(contactsWithProfiles);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: logsData, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const logsWithProfiles = await Promise.all(
        (logsData || []).map(async (log: CallLog) => {
          const { data: profile } = await supabase.auth.admin.getUserById(log.other_user_id);
          return {
            ...log,
            otherUserEmail: profile?.user?.email || 'Unknown'
          };
        })
      );

      setRecentLogs(logsWithProfiles);
    } catch (error) {
      console.error('Failed to fetch call logs:', error);
    }
  };

  const handleAddContact = async () => {
    if (!newContactEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find user by email
      const { data: users, error: searchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', newContactEmail.trim())
        .limit(1);

      if (searchError || !users || users.length === 0) {
        Alert.alert('Not Found', 'No user found with this email');
        return;
      }

      const contactUserId = users[0].id;

      if (contactUserId === user.id) {
        Alert.alert('Error', 'You cannot add yourself as a contact');
        return;
      }

      // Add contact
      const { error: addError } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          contact_user_id: contactUserId,
          status: 'accepted'
        });

      if (addError) {
        if (addError.code === '23505') {
          Alert.alert('Error', 'This user is already in your contacts');
        } else {
          throw addError;
        }
        return;
      }

      setNewContactEmail('');
      setShowAddContact(false);
      fetchContacts();
      Alert.alert('Success', 'Contact added successfully');
    } catch (error) {
      console.error('Failed to add contact:', error);
      Alert.alert('Error', 'Failed to add contact');
    }
  };

  const initiateCall = (contact: ContactWithProfile) => {
    router.push({
      pathname: '/call/outgoing',
      params: {
        contactId: contact.contact_user_id,
        contactName: contact.contactProfile?.email || contact.display_name || 'Unknown'
      }
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const filteredContacts = contacts.filter(c =>
    c.contactProfile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Calls</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddContact(true)}
        >
          <UserPlus color="#2563eb" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search color="#9ca3af" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Recent Calls */}
        {recentLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent</Text>
            {recentLogs.map((log, index) => (
              <TouchableOpacity
                key={log.id || index}
                style={styles.callLogItem}
                onPress={() => {
                  // Find contact and initiate call
                }}
              >
                <View style={styles.callLogIcon}>
                  {log.direction === 'outgoing' ? (
                    <PhoneOutgoing color="#2563eb" size={20} />
                  ) : log.status === 'missed' ? (
                    <PhoneMissed color="#ef4444" size={20} />
                  ) : (
                    <PhoneIncoming color="#16a34a" size={20} />
                  )}
                </View>
                <View style={styles.callLogInfo}>
                  <Text style={styles.callLogName}>{log.otherUserEmail}</Text>
                  <Text style={styles.callLogMeta}>
                    {formatTime(log.created_at)}. {formatDuration(log.duration_seconds)}
                  </Text>
                </View>
                <Phone color="#2563eb" size={20} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacts ({filteredContacts.length})</Text>

          {filteredContacts.length === 0 ? (
            <View style={styles.emptyState}>
              <UserPlus color="#d1d5db" size={48} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No contacts found' : 'Add contacts to make voice calls'}
              </Text>
            </View>
          ) : (
            filteredContacts.map((contact, index) => (
              <TouchableOpacity
                key={contact.id || index}
                style={styles.contactItem}
                onPress={() => initiateCall(contact)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(contact.contactProfile?.email || contact.display_name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>
                    {contact.display_name || contact.contactProfile?.email || 'Unknown'}
                  </Text>
                  <Text style={styles.contactEmail}>{contact.contactProfile?.email}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity style={styles.callButton}>
                    <Phone color="#2563eb" size={20} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Add Contact Modal */}
      {showAddContact && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Contact</Text>
              <TouchableOpacity onPress={() => setShowAddContact(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter email address"
              placeholderTextColor="#9ca3af"
              value={newContactEmail}
              onChangeText={setNewContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleAddContact}>
              <Check color="#ffffff" size={20} />
              <Text style={styles.modalButtonText}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1e293b',
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
  callLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  callLogIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callLogInfo: {
    flex: 1,
    marginLeft: 12,
  },
  callLogName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  callLogMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 14,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  contactEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
  },
  bottomSpace: {
    height: 100,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
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
    fontWeight: '600',
    color: '#1e293b',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
