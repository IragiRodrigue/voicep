import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMessagesStore, type Message } from '@/stores/useMessagesStore';
import { ArrowLeft, Phone, Video, Check, CheckCheck, Mic, Send } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

const BRAND = {
  blue: '#3B6EE8',
  blueLight: '#EEF2FD',
  textPrimary: '#1A1D2E',
  textSecondary: '#6B7A99',
  bg: '#F5F7FB',
  white: '#ffffff',
  border: '#E4E9F2',
  online: '#22C55E',
};

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString();
}

function shouldShowDate(curr: Message, prev: Message | null): boolean {
  if (!prev) return true;
  return new Date(curr.created_at).toDateString() !== new Date(prev.created_at).toDateString();
}

function AvatarCircle({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ['#3B6EE8', '#E85C3B', '#3BCE3B', '#E8A03B', '#993BE8'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarLetter, { fontSize: size * 0.38 }]}>{name[0].toUpperCase()}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    messages, loading, error,
    fetchMessages, sendMessage, markAsRead,
    subscribeToMessages, unsubscribeAll
  } = useMessagesStore();

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ id: string; display_name: string | null; email: string } | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id && user) {
      fetchMessages(id);
      markAsRead(id);
      subscribeToMessages(id, () => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      });
      loadParticipant();
    }
    return () => { unsubscribeAll(); };
  }, [id, user]);

  const loadParticipant = async () => {
    if (!id || !user) return;
    const { data } = await supabase
      .from('conversation_participants')
      .select('user_id, user_profiles!inner(id, display_name, email)')
      .eq('conversation_id', id);

    if (data) {
      const other = data.find((p: any) => p.user_id !== user.id);
      if (other) {
        const prof = other.user_profiles as unknown as { id: string; display_name: string | null; email: string };
        setOtherUser({ id: other.user_id, display_name: prof?.display_name || null, email: prof?.email || '' });
      }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !id || sending) return;
    setSending(true);
    const text = inputText.trim();
    setInputText('');
    await sendMessage(id, text);
    setSending(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const displayName = otherUser?.display_name || otherUser?.email?.split('@')[0] || 'User';

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === user?.id;
    const prev = index > 0 ? messages[index - 1] : null;
    const showDate = shouldShowDate(item, prev);
    const prevIsOwn = prev ? prev.sender_id === user?.id : false;
    const showAvatar = !isOwn && (index === messages.length - 1 || messages[index + 1]?.sender_id !== item.sender_id);

    return (
      <>
        {showDate && (
          <View style={styles.dateSep}>
            <View style={styles.dateLine} />
            <Text style={styles.dateLabel}>{formatDate(item.created_at)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
          {!isOwn && (
            <View style={{ width: 36, marginRight: 8, alignSelf: 'flex-end' }}>
              {showAvatar && <AvatarCircle name={displayName} size={36} />}
            </View>
          )}
          <View style={{ maxWidth: '72%' }}>
            <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
                {item.content}
              </Text>
            </View>
            <View style={[styles.msgMeta, isOwn ? styles.msgMetaOwn : styles.msgMetaOther]}>
              <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
              {isOwn && (
                item.read_at
                  ? <CheckCheck color={BRAND.blue} size={14} />
                  : <Check color="#A0AABA" size={14} />
              )}
            </View>
          </View>
          {isOwn && <View style={{ width: 4 }} />}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={BRAND.textPrimary} size={24} />
        </TouchableOpacity>

        <View style={styles.headerUser}>
          {otherUser && <AvatarCircle name={displayName} size={42} />}
          <View style={styles.headerUserInfo}>
            <Text style={styles.headerName}>{displayName}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Video color={BRAND.blue} size={22} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => otherUser && router.push(`/call/outgoing?calleeId=${otherUser.id}`)}
          >
            <Phone color={BRAND.blue} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingView}>
            <ActivityIndicator size="large" color={BRAND.blue} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyView}>
            <AvatarCircle name={displayName} size={72} />
            <Text style={styles.emptyTitle}>{displayName}</Text>
            <Text style={styles.emptyText}>Send a message to start the conversation</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a Message..."
              placeholderTextColor="#A0AABA"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity style={styles.micBtn}>
              <Mic color="#A0AABA" size={20} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Send color="#ffffff" size={20} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerUserInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.online,
  },
  onlineText: {
    fontSize: 12,
    color: BRAND.online,
    fontWeight: '500',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
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
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: BRAND.textSecondary,
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: BRAND.border,
  },
  dateLabel: {
    fontSize: 12,
    color: BRAND.textSecondary,
    fontWeight: '500',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  msgRowOwn: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontWeight: '700',
  },
  bubble: {
    padding: 12,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: BRAND.blue,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: BRAND.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextOwn: {
    color: '#ffffff',
  },
  bubbleTextOther: {
    color: BRAND.textPrimary,
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  msgMetaOwn: {
    justifyContent: 'flex-end',
  },
  msgMetaOther: {
    justifyContent: 'flex-start',
  },
  msgTime: {
    fontSize: 11,
    color: BRAND.textSecondary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: BRAND.white,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.bg,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 46,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: BRAND.textPrimary,
    maxHeight: 100,
  },
  micBtn: {
    padding: 2,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: BRAND.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
});
