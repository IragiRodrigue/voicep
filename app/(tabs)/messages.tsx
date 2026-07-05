import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMessagesStore, type ConversationWithDetails } from '@/stores/useMessagesStore';
import { Search, SlidersHorizontal, Plus, MessageCircle, CheckCheck } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

const BRAND = {
  blue: '#3B6EE8',
  blueLight: '#EEF2FD',
  textPrimary: '#1A1D2E',
  textSecondary: '#6B7A99',
  bg: '#F5F7FB',
  white: '#ffffff',
  border: '#E4E9F2',
};

type TabType = 'All' | 'Unread' | 'Read';

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString();
}

function AvatarCircle({ name }: { name: string }) {
  const colors = ['#3B6EE8', '#E85C3B', '#3BCE3B', '#E8A03B', '#993BE8', '#3BE8D4'];
  const index = name.charCodeAt(0) % colors.length;
  return (
    <View style={[styles.avatar, { backgroundColor: colors[index] }]}>
      <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
    </View>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    conversations, loading, error,
    fetchConversations, subscribeToConversations, unsubscribeAll
  } = useMessagesStore();

  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (user) {
      fetchConversations(user.id);
      subscribeToConversations(user.id);
    }
    return () => { unsubscribeAll(); };
  }, [user]);

  const getFilteredConversations = () => {
    let list = conversations;
    if (activeTab === 'Unread') list = list.filter(c => (c.unread_count ?? 0) > 0);
    if (activeTab === 'Read') list = list.filter(c => (c.unread_count ?? 0) === 0 && c.last_message_preview);
    if (searchQuery) {
      list = list.filter(c =>
        c.other_user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.other_user?.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  };

  const unreadCount = conversations.filter(c => (c.unread_count ?? 0) > 0).length;
  const filtered = getFilteredConversations();

  const handleStartNewChat = async () => {
    if (!user || !newChatEmail.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const { data: targetUser } = await supabase
        .from('user_profiles').select('id')
        .eq('email', newChatEmail.trim().toLowerCase())
        .single();

      if (!targetUser) {
        setCreateError('User not found. Make sure they have a VocalForge account.');
        setCreating(false);
        return;
      }
      if (targetUser.id === user.id) {
        setCreateError('You cannot message yourself.');
        setCreating(false);
        return;
      }

      const { createConversation } = useMessagesStore.getState();
      const conv = await createConversation(targetUser.id);
      if (conv) {
        setShowNewChat(false);
        setNewChatEmail('');
        router.push(`/chat/${conv.id}`);
      }
    } catch {
      setCreateError('Failed to start conversation.');
    }
    setCreating(false);
  };

  const renderItem = ({ item }: { item: ConversationWithDetails }) => {
    const name = item.other_user?.display_name || item.other_user?.email?.split('@')[0] || 'Unknown';
    const hasUnread = (item.unread_count ?? 0) > 0;

    return (
      <TouchableOpacity
        style={styles.conversationRow}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <AvatarCircle name={name} />
        <View style={styles.conversationBody}>
          <View style={styles.conversationTop}>
            <Text style={[styles.convName, hasUnread && styles.convNameBold]}>{name}</Text>
            <Text style={[styles.convTime, hasUnread && styles.convTimeBold]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>
          <View style={styles.conversationBottom}>
            <Text
              style={[styles.convPreview, hasUnread && styles.convPreviewBold]}
              numberOfLines={1}
            >
              {item.last_message_preview || 'Start a conversation'}
            </Text>
            {hasUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unread_count}</Text>
              </View>
            ) : item.last_message_preview ? (
              <CheckCheck color="#A0AABA" size={16} />
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSearch(!showSearch)}>
            <Search color={BRAND.textPrimary} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <SlidersHorizontal color={BRAND.textPrimary} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchWrapper}>
          <Search color="#A0AABA" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#A0AABA"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['All', 'Unread', 'Read'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {tab === 'Unread' && unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* List */}
      {loading && conversations.length === 0 ? (
        <View style={styles.loadingView}>
          <ActivityIndicator size="large" color={BRAND.blue} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyView}>
          <MessageCircle color="#CBD5E1" size={56} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'All' ? 'No conversations yet' : `No ${activeTab.toLowerCase()} messages`}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'All' ? 'Tap + to start a new chat' : 'Switch to All to see all messages'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewChat(true)}
      >
        <Plus color="#ffffff" size={26} />
      </TouchableOpacity>

      {/* New Chat Modal */}
      <Modal
        visible={showNewChat}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewChat(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => { setShowNewChat(false); setNewChatEmail(''); setCreateError(''); }}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>New Conversation</Text>
            <Text style={styles.modalSubtitle}>Enter the email address of the user</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="user@example.com"
              placeholderTextColor="#A0AABA"
              value={newChatEmail}
              onChangeText={setNewChatEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            {createError ? (
              <Text style={styles.modalError}>{createError}</Text>
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowNewChat(false); setNewChatEmail(''); setCreateError(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalStartBtn, (!newChatEmail.trim() || creating) && styles.modalStartBtnDisabled]}
                onPress={handleStartNewChat}
                disabled={!newChatEmail.trim() || creating}
              >
                {creating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalStartText}>Start Chat</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: BRAND.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.bg,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: BRAND.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabActive: {
    borderBottomColor: BRAND.blue,
  },
  tabText: {
    fontSize: 15,
    color: BRAND.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: BRAND.blue,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: BRAND.blue,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    margin: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4FC',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  conversationBody: {
    flex: 1,
    marginLeft: 14,
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    fontSize: 16,
    fontWeight: '500',
    color: BRAND.textPrimary,
  },
  convNameBold: {
    fontWeight: '700',
  },
  convTime: {
    fontSize: 12,
    color: BRAND.textSecondary,
  },
  convTimeBold: {
    color: BRAND.blue,
    fontWeight: '600',
  },
  conversationBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convPreview: {
    flex: 1,
    fontSize: 13,
    color: BRAND.textSecondary,
    marginRight: 8,
  },
  convPreviewBold: {
    color: BRAND.textPrimary,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: BRAND.blue,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: BRAND.textSecondary,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: BRAND.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15,
    color: BRAND.textPrimary,
    marginBottom: 8,
  },
  modalError: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: BRAND.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: BRAND.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  modalStartBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: BRAND.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStartBtnDisabled: {
    opacity: 0.6,
  },
  modalStartText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
