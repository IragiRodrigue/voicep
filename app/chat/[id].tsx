import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMessagesStore, type Message } from '@/stores/useMessagesStore';
import { ArrowLeft, Send, Phone, Info, Check, CheckCheck } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString();
}

function shouldShowDateSeparator(current: Message, previous: Message | null): boolean {
  if (!previous) return true;
  const currentDate = new Date(current.created_at).toDateString();
  const previousDate = new Date(previous.created_at).toDateString();
  return currentDate !== previousDate;
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    messages,
    loading,
    error,
    currentConversation,
    fetchMessages,
    sendMessage,
    markAsRead,
    subscribeToMessages,
    unsubscribeAll,
    setCurrentConversation
  } = useMessagesStore();

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ id: string; display_name: string | null; email: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id && user) {
      fetchMessages(id);
      markAsRead(id);
      subscribeToMessages(id);
      loadConversationInfo();
    }
    return () => {
      unsubscribeAll();
    };
  }, [id, user]);

  const loadConversationInfo = async () => {
    if (!id || !user) return;

    // Get other participant
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select(`
        user_id,
        user_profiles!inner(id, display_name, email)
      `)
      .eq('conversation_id', id);

    if (participants && Array.isArray(participants)) {
      const other = participants.find((p) => p.user_id !== user.id);
      if (other) {
        const profile = other.user_profiles as unknown as { id: string; display_name: string | null; email: string };
        setOtherUser({
          id: other.user_id,
          display_name: profile?.display_name || null,
          email: profile?.email || ''
        });
      }
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !id || sending) return;

    setSending(true);
    const text = messageText.trim();
    setMessageText('');

    await sendMessage(id, text);

    setSending(false);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleStartCall = () => {
    if (otherUser) {
      router.push(`/call/outgoing?calleeId=${otherUser.id}`);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === user?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDate = shouldShowDateSeparator(item, previousMessage);

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatMessageDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
          <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
              {item.content}
            </Text>
            <View style={styles.messageMeta}>
              <Text style={[styles.messageTime, isOwn ? styles.ownTimeText : styles.otherTimeText]}>
                {formatMessageTime(item.created_at)}
              </Text>
              {isOwn && (
                item.read_at ? (
                  <CheckCheck color="#93c5fd" size={14} />
                ) : (
                  <Check color="#93c5fd" size={14} />
                )
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  if (loading && messages.length === 0) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => router.push(`/user/${otherUser?.id}`)}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {(otherUser?.display_name || otherUser?.email || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>
              {otherUser?.display_name || otherUser?.email?.split('@')[0] || 'Unknown'}
            </Text>
            <Text style={styles.headerStatus}>
              {otherUser?.email}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton} onPress={handleStartCall}>
          <Phone color="#2563eb" size={22} />
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.messagesContainer}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptyText}>
              Send a message to {otherUser?.display_name || otherUser?.email?.split('@')[0]}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send color="#ffffff" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerText: {
    marginLeft: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerStatus: {
    fontSize: 13,
    color: '#64748b',
  },
  callButton: {
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 8,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#ffffff',
  },
  otherText: {
    color: '#1e293b',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  ownTimeText: {
    color: '#93c5fd',
  },
  otherTimeText: {
    color: '#94a3b8',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1e293b',
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
