import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useMessagesStore, type Message, type ReactionSummary } from '@/stores/useMessagesStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { usePresence, useUserPresence } from '@/hooks/usePresence';
import { ArrowLeft, Phone, Video, Check, CheckCheck, Mic, Send, Search, X } from 'lucide-react-native';
import { supabase } from '@/services/supabase';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'long' });
  return date.toLocaleDateString();
}
function showDate(curr: Message, prev: Message | null) {
  if (!prev) return true;
  return new Date(curr.created_at).toDateString() !== new Date(prev.created_at).toDateString();
}

function getReactionSummary(
  messageId: string,
  reactions: Record<string, { user_id: string; emoji: string; id: string }[]>,
  myId: string
): ReactionSummary[] {
  const list = reactions[messageId] || [];
  const map: Record<string, ReactionSummary> = {};
  for (const r of list) {
    if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, reactedByMe: false };
    map[r.emoji].count++;
    if (r.user_id === myId) map[r.emoji].reactedByMe = true;
  }
  return Object.values(map);
}

function AvatarCircle({ name, size = 40 }: { name: string; size?: number }) {
  const COLORS = ['#3B6EE8', '#E85C3B', '#22C55E', '#E8A03B', '#993BE8', '#06B6D4'];
  const color = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{name[0].toUpperCase()}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { theme, isDark } = useThemeStore();
  const {
    messages, reactions, loading, error,
    fetchMessages, fetchReactions, sendMessage, markAsRead,
    subscribeToMessages, subscribeToReactions, unsubscribeAll, toggleReaction
  } = useMessagesStore();

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{ id: string; display_name: string | null; email: string } | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  // Presence
  usePresence(user?.id);
  const otherUserStatus = useUserPresence(otherUser?.id);

  useEffect(() => {
    if (!id || !user) return;
    fetchMessages(id).then(() => {
      fetchReactions(id);
      subscribeToReactions(id);
    });
    markAsRead(id);
    subscribeToMessages(id, () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    });
    loadParticipant();
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

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const displayName = otherUser?.display_name || otherUser?.email?.split('@')[0] || 'User';

  const statusColor = otherUserStatus === 'online' ? '#22C55E' : otherUserStatus === 'away' ? '#F59E0B' : '#9CA3AF';
  const statusLabel = otherUserStatus === 'online' ? 'Online' : otherUserStatus === 'away' ? 'Away' : 'Offline';

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === user?.id;
    const prev = index > 0 ? filteredMessages[index - 1] : null;
    const needsDate = showDate(item, prev);
    const reactionList = getReactionSummary(item.id, reactions, user?.id || '');
    const showAvatar = !isOwn && (index === filteredMessages.length - 1 || filteredMessages[index + 1]?.sender_id !== item.sender_id);

    return (
      <>
        {needsDate && (
          <View style={styles.dateSep}>
            <View style={[styles.dateLine, { backgroundColor: theme.cardBorder }]} />
            <Text style={[styles.dateLabel, { color: theme.textMuted }]}>{formatDate(item.created_at)}</Text>
            <View style={[styles.dateLine, { backgroundColor: theme.cardBorder }]} />
          </View>
        )}

        <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
          {!isOwn && (
            <View style={{ width: 36, marginRight: 8, alignSelf: 'flex-end' }}>
              {showAvatar && <AvatarCircle name={displayName} size={36} />}
            </View>
          )}

          <View style={{ maxWidth: '72%' }}>
            <Pressable
              onLongPress={() => setReactionTarget(item.id)}
              delayLongPress={350}
            >
              <View style={[
                styles.bubble,
                isOwn
                  ? [styles.bubbleOwn, { backgroundColor: theme.bubbleOwn }]
                  : [styles.bubbleOther, { backgroundColor: theme.bubbleOther, borderColor: theme.bubbleOtherBorder }]
              ]}>
                {searchQuery.trim() ? (
                  <HighlightedText
                    text={item.content}
                    query={searchQuery}
                    isOwn={isOwn}
                    theme={theme}
                  />
                ) : (
                  <Text style={[styles.bubbleText, { color: isOwn ? theme.bubbleOwnText : theme.bubbleOtherText }]}>
                    {item.content}
                  </Text>
                )}
              </View>
            </Pressable>

            {/* Reactions */}
            {reactionList.length > 0 && (
              <View style={[styles.reactionsRow, isOwn ? styles.reactionsRowOwn : styles.reactionsRowOther]}>
                {reactionList.map(r => (
                  <TouchableOpacity
                    key={r.emoji}
                    onPress={() => toggleReaction(item.id, r.emoji)}
                    style={[styles.reactionChip, r.reactedByMe && { borderColor: theme.blue, backgroundColor: theme.blueLight }]}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    {r.count > 1 && <Text style={[styles.reactionCount, { color: r.reactedByMe ? theme.blue : theme.textSecondary }]}>{r.count}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.msgMeta, isOwn ? styles.msgMetaOwn : styles.msgMetaOther]}>
              <Text style={[styles.msgTime, { color: theme.textMuted }]}>{formatTime(item.created_at)}</Text>
              {isOwn && (
                item.read_at
                  ? <CheckCheck color={theme.blue} size={14} />
                  : <Check color={theme.textMuted} size={14} />
              )}
            </View>
          </View>

          {isOwn && <View style={{ width: 4 }} />}
        </View>
      </>
    );
  }, [filteredMessages, reactions, user, theme, searchQuery, displayName]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={theme.textPrimary} size={24} />
        </TouchableOpacity>

        <View style={styles.headerUser}>
          {otherUser && <AvatarCircle name={displayName} size={42} />}
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.headerName, { color: theme.textPrimary }]}>{displayName}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.blueLight }]}
            onPress={() => { setSearchVisible(!searchVisible); setSearchQuery(''); }}
          >
            {searchVisible
              ? <X color={theme.blue} size={20} />
              : <Search color={theme.blue} size={20} />
            }
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: theme.blueLight }]}>
            <Video color={theme.blue} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: theme.blueLight }]}
            onPress={() => otherUser && router.push(`/call/outgoing?calleeId=${otherUser.id}`)}
          >
            <Phone color={theme.blue} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {searchVisible && (
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
          <Search color={theme.textMuted} size={18} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search messages..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <Text style={[styles.searchCount, { color: theme.textMuted }]}>
              {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.centerView}>
            <ActivityIndicator size="large" color={theme.blue} />
          </View>
        ) : filteredMessages.length === 0 ? (
          <View style={styles.centerView}>
            {searchQuery ? (
              <Text style={[styles.noResultText, { color: theme.textSecondary }]}>
                No messages matching "{searchQuery}"
              </Text>
            ) : (
              <>
                <AvatarCircle name={displayName} size={72} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{displayName}</Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Send a message to start chatting</Text>
              </>
            )}
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filteredMessages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => !searchQuery && listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input */}
        <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.cardBorder }]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <TextInput
              style={[styles.textInput, { color: theme.textPrimary }]}
              placeholder="Type a Message..."
              placeholderTextColor={theme.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity style={styles.micBtn}>
              <Mic color={theme.textMuted} size={20} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: !inputText.trim() || sending ? theme.textMuted : theme.blue }, (!inputText.trim() || sending) && { shadowOpacity: 0 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send color="#fff" size={20} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Emoji Reaction Picker */}
      <Modal
        visible={!!reactionTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionTarget(null)}
      >
        <Pressable style={styles.emojiModalBackdrop} onPress={() => setReactionTarget(null)}>
          <View style={[styles.emojiPickerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.emojiPickerTitle, { color: theme.textSecondary }]}>React with</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiBtn}
                  onPress={() => {
                    if (reactionTarget) toggleReaction(reactionTarget, emoji);
                    setReactionTarget(null);
                  }}
                >
                  <Text style={styles.emojiChar}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function HighlightedText({ text, query, isOwn, theme }: { text: string; query: string; isOwn: boolean; theme: any }) {
  const lower = text.toLowerCase();
  const lowerQ = query.toLowerCase();
  const idx = lower.indexOf(lowerQ);
  if (idx === -1) return <Text style={[styles.bubbleText, { color: isOwn ? theme.bubbleOwnText : theme.bubbleOtherText }]}>{text}</Text>;

  return (
    <Text style={[styles.bubbleText, { color: isOwn ? theme.bubbleOwnText : theme.bubbleOtherText }]}>
      {text.slice(0, idx)}
      <Text style={{ backgroundColor: '#FEF08A', color: '#1A1D2E' }}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginRight: 4 },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  headerIcons: { flexDirection: 'row', gap: 6 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  searchCount: { fontSize: 13, fontWeight: '600' },
  errorBanner: { backgroundColor: '#fef2f2', padding: 10, borderBottomWidth: 1, borderBottomColor: '#fecaca' },
  errorText: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  noResultText: { fontSize: 15, textAlign: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  messagesList: { padding: 16, paddingBottom: 8 },
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dateLine: { flex: 1, height: 1 },
  dateLabel: { fontSize: 12, fontWeight: '500' },
  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowOwn: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { padding: 12, borderRadius: 18 },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 },
  reactionsRowOwn: { justifyContent: 'flex-end' },
  reactionsRowOther: { justifyContent: 'flex-start' },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'transparent',
  },
  reactionEmoji: { fontSize: 15 },
  reactionCount: { fontSize: 12, fontWeight: '600' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  msgMetaOwn: { justifyContent: 'flex-end' },
  msgMetaOther: { justifyContent: 'flex-start' },
  msgTime: { fontSize: 11 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8,
    minHeight: 46, gap: 8, borderWidth: 1,
  },
  textInput: { flex: 1, fontSize: 15, maxHeight: 100 },
  micBtn: { padding: 2 },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3B6EE8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  emojiModalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  emojiPickerCard: {
    borderRadius: 20, padding: 20,
    borderWidth: 1, minWidth: 280,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  emojiPickerTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emojiChar: { fontSize: 26 },
});
