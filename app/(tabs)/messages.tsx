import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMessagesStore, type ConversationWithDetails } from '@/stores/useMessagesStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { usePresence } from '@/hooks/usePresence';
import { Search, SlidersHorizontal, Plus, MessageCircle, CheckCheck } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

type TabType = 'All' | 'Unread' | 'Read';

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function AvatarCircle({ name, size = 52, showOnline }: { name: string; size?: number; showOnline?: boolean }) {
  const COLORS = ['#3B6EE8', '#E85C3B', '#22C55E', '#E8A03B', '#993BE8', '#06B6D4'];
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <View style={{ position: 'relative' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.36 }}>{name[0].toUpperCase()}</Text>
      </View>
      {showOnline && (
        <View style={{ position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff' }} />
      )}
    </View>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const {
    conversations, loading, error,
    fetchConversations, subscribeToConversations, unsubscribeAll
  } = useMessagesStore();

  // Track own presence
  usePresence(user?.id);

  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filtered = conversations
    .filter(c => {
      if (activeTab === 'Unread') return (c.unread_count ?? 0) > 0;
      if (activeTab === 'Read') return (c.unread_count ?? 0) === 0 && !!c.last_message_preview;
      return true;
    })
    .filter(c =>
      !searchQuery || (
        c.other_user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.other_user?.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );

  const unreadCount = conversations.filter(c => (c.unread_count ?? 0) > 0).length;

  const handleStartNewChat = async () => {
    if (!user || !newChatEmail.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const { data: target } = await supabase
        .from('user_profiles').select('id')
        .eq('email', newChatEmail.trim().toLowerCase())
        .single();

      if (!target) { setCreateError('User not found.'); setCreating(false); return; }
      if (target.id === user.id) { setCreateError('You cannot message yourself.'); setCreating(false); return; }

      const { createConversation } = useMessagesStore.getState();
      const conv = await createConversation(target.id);
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
    const name = item.other_user?.display_name || item.other_user?.email?.split('@')[0] || '?';
    const hasUnread = (item.unread_count ?? 0) > 0;

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <AvatarCircle name={name} size={52} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowName, { color: theme.textPrimary }, hasUnread && styles.bold]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.rowTime, { color: hasUnread ? theme.blue : theme.textMuted }, hasUnread && styles.bold]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text
              style={[styles.rowPreview, { color: hasUnread ? theme.textPrimary : theme.textSecondary }, hasUnread && styles.bold]}
              numberOfLines={1}
            >
              {item.last_message_preview || 'Start a conversation'}
            </Text>
            {hasUnread ? (
              <View style={[styles.badge, { backgroundColor: theme.blue }]}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            ) : item.last_message_preview ? (
              <CheckCheck color={theme.textMuted} size={16} />
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.iconBg }]}
            onPress={() => { setShowSearch(!showSearch); setSearchQuery(''); }}
          >
            <Search color={theme.textPrimary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.iconBg }]}>
            <SlidersHorizontal color={theme.textPrimary} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={[styles.searchRow, { backgroundColor: theme.bg, borderBottomColor: theme.cardBorder }]}>
          <Search color={theme.textMuted} size={18} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search conversations..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.cardBorder }]}>
        {(['All', 'Unread', 'Read'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && [styles.tabActive, { borderBottomColor: theme.blue }]]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? theme.blue : theme.textSecondary }, activeTab === tab && styles.bold]}>
              {tab}
            </Text>
            {tab === 'Unread' && unreadCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: theme.blue }]}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && conversations.length === 0 ? (
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color={theme.blue} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerView}>
          <MessageCircle color={theme.cardBorder} size={60} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {activeTab === 'All' ? 'No conversations yet' : `No ${activeTab.toLowerCase()} messages`}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {activeTab === 'All' ? 'Tap + to start chatting' : 'Switch to All to see all messages'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.blue }]} onPress={() => setShowNewChat(true)}>
        <Plus color="#fff" size={26} />
      </TouchableOpacity>

      {/* New chat modal */}
      <Modal visible={showNewChat} transparent animationType="fade" onRequestClose={() => setShowNewChat(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => { setShowNewChat(false); setNewChatEmail(''); setCreateError(''); }}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>New Conversation</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Enter the email address of the user</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="user@example.com"
              placeholderTextColor={theme.textMuted}
              value={newChatEmail}
              onChangeText={setNewChatEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            {createError ? <Text style={styles.modalError}>{createError}</Text> : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancel, { backgroundColor: theme.bg }]}
                onPress={() => { setShowNewChat(false); setNewChatEmail(''); setCreateError(''); }}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalStart, { backgroundColor: theme.blue }, (!newChatEmail.trim() || creating) && { opacity: 0.6 }]}
                onPress={handleStartNewChat}
                disabled={!newChatEmail.trim() || creating}
              >
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalStartText}>Start Chat</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 6 },
  tabActive: {},
  tabText: { fontSize: 15, fontWeight: '500' },
  tabBadge: { borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  errorBanner: { backgroundColor: '#fef2f2', margin: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#ef4444', fontSize: 13 },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  rowBody: { flex: 1, marginLeft: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowName: { flex: 1, fontSize: 16, marginRight: 8 },
  rowTime: { fontSize: 12 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowPreview: { flex: 1, fontSize: 13, marginRight: 8 },
  badge: { borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bold: { fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3B6EE8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSub: { fontSize: 14, marginBottom: 20 },
  modalInput: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, marginBottom: 8 },
  modalError: { color: '#ef4444', fontSize: 13, marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { fontWeight: '600', fontSize: 15 },
  modalStart: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalStartText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
