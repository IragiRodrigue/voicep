import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMessagesStore, type ConversationWithDetails } from '@/stores/useMessagesStore';
import { MessageCircle, Search, Plus, Send, User } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    conversations,
    loading,
    error,
    fetchConversations,
    subscribeToConversations,
    unsubscribeAll
  } = useMessagesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConversations(user.id);
      subscribeToConversations(user.id);
    }
    return () => {
      unsubscribeAll();
    };
  }, [user]);

  const filteredConversations = conversations.filter(c =>
    c.other_user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.other_user?.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartNewChat = async () => {
    if (!user || !newChatEmail.trim()) return;
    setCreating(true);

    try {
      // Find user by email
      const { data: targetUser, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', newChatEmail.trim().toLowerCase())
        .single();

      if (userError || !targetUser) {
        alert('User not found. Make sure they have a VocalForge account.');
        setCreating(false);
        return;
      }

      if (targetUser.id === user.id) {
        alert('You cannot start a conversation with yourself.');
        setCreating(false);
        return;
      }

      // Create or get existing conversation
      const { createConversation } = useMessagesStore.getState();
      const conversation = await createConversation(targetUser.id);

      if (conversation) {
        setShowNewChat(false);
        setNewChatEmail('');
        // Navigate to chat
        router.push(`/chat/${conversation.id}`);
      }
    } catch (err) {
      alert('Failed to start conversation. Please try again.');
    }
    setCreating(false);
  };

  const renderConversation = ({ item }: { item: ConversationWithDetails }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.other_user?.display_name || item.other_user?.email || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>
            {item.other_user?.display_name || item.other_user?.email?.split('@')[0] || 'Unknown'}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTime(item.last_message_at)}
          </Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            {item.last_message_preview || 'No messages yet'}
          </Text>
          {item.unread_count && item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => setShowNewChat(true)}
        >
          <Plus color="#2563eb" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search color="#94a3b8" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* New Chat Modal */}
      {showNewChat && (
        <View style={styles.newChatOverlay}>
          <View style={styles.newChatCard}>
            <Text style={styles.newChatTitle}>New Conversation</Text>
            <TextInput
              style={styles.newChatInput}
              placeholder="Enter user email..."
              placeholderTextColor="#94a3b8"
              value={newChatEmail}
              onChangeText={setNewChatEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.newChatButtons}>
              <TouchableOpacity
                style={styles.newChatCancel}
                onPress={() => { setShowNewChat(false); setNewChatEmail(''); }}
              >
                <Text style={styles.newChatCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.newChatStart, creating && styles.newChatStartDisabled]}
                onPress={handleStartNewChat}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send color="#fff" size={18} />
                    <Text style={styles.newChatStartText}>Start Chat</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Conversations List */}
      {loading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle color="#d1d5db" size={64} />
          <Text style={styles.emptyTitle}>No Conversations</Text>
          <Text style={styles.emptyText}>
            Start a new conversation by tapping the + button above.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 14,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  conversationTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationPreview: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  newChatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  newChatCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  newChatTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  newChatInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  newChatButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  newChatCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  newChatCancelText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  newChatStart: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  newChatStartDisabled: {
    opacity: 0.7,
  },
  newChatStartText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
