import { create } from 'zustand';
import { supabase } from '@/services/supabase';

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_preview: string | null;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ConversationWithDetails extends Conversation {
  participants: ConversationParticipant[];
  unread_count?: number;
  other_user?: {
    id: string;
    display_name: string | null;
    email: string;
  };
}

interface MessagesState {
  conversations: ConversationWithDetails[];
  messages: Message[];
  reactions: Record<string, MessageReaction[]>;
  currentConversation: ConversationWithDetails | null;
  loading: boolean;
  error: string | null;
  subscription: ReturnType<typeof supabase.channel> | null;
  reactionSubscription: ReturnType<typeof supabase.channel> | null;

  fetchConversations: (userId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchReactions: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<Message | null>;
  createConversation: (otherUserId: string) => Promise<Conversation | null>;
  markAsRead: (conversationId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  subscribeToMessages: (conversationId: string, onNewMessage?: (message: Message) => void) => void;
  subscribeToReactions: (conversationId: string) => void;
  subscribeToConversations: (userId: string, onNewConversation?: () => void) => void;
  unsubscribeAll: () => void;
  setCurrentConversation: (conversation: ConversationWithDetails | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: [],
  reactions: {},
  currentConversation: null,
  loading: false,
  error: null,
  subscription: null,
  reactionSubscription: null,

  fetchConversations: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        set({ conversations: [], loading: false });
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('*, user_profiles!inner(id, display_name, email)')
            .eq('conversation_id', conv.id);

          const otherParticipant = participants?.find(p => p.user_id !== userId);
          const myParticipation = participants?.find(p => p.user_id === userId);

          let unreadCount = 0;
          if (myParticipation?.last_read_at) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', userId)
              .gt('created_at', myParticipation.last_read_at);
            unreadCount = count || 0;
          } else {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', userId);
            unreadCount = count || 0;
          }

          return {
            ...conv,
            participants: participants || [],
            unread_count: unreadCount,
            other_user: otherParticipant?.user_profiles ? {
              id: otherParticipant.user_id,
              display_name: otherParticipant.user_profiles.display_name,
              email: otherParticipant.user_profiles.email
            } : undefined
          };
        })
      );

      set({ conversations: conversationsWithDetails, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ loading: true, error: null });
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: messages || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchReactions: async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', get().messages.map(m => m.id));

      if (error || !data) return;

      const grouped: Record<string, MessageReaction[]> = {};
      for (const r of data) {
        if (!grouped[r.message_id]) grouped[r.message_id] = [];
        grouped[r.message_id].push(r as MessageReaction);
      }
      set({ reactions: grouped });
    } catch { /* silent */ }
  },

  sendMessage: async (conversationId: string, content: string) => {
    set({ error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: message, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, content })
        .select()
        .single();

      if (error) throw error;

      set(state => ({ messages: [...state.messages, message as Message] }));
      return message as Message;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  createConversation: async (otherUserId: string) => {
    set({ error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existingParticipations && existingParticipations.length > 0) {
        const convIds = existingParticipations.map(p => p.conversation_id);
        const { data: otherParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', convIds);

        if (otherParticipations && otherParticipations.length > 0) {
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', otherParticipations[0].conversation_id)
            .single();
          return existingConv as Conversation;
        }
      }

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      await supabase.from('conversation_participants').insert([
        { conversation_id: conversation.id, user_id: user.id },
        { conversation_id: conversation.id, user_id: otherUserId }
      ]);

      return conversation as Conversation;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  markAsRead: async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      }));
    } catch { /* silent */ }
  },

  toggleReaction: async (messageId: string, emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentReactions = get().reactions[messageId] || [];
      const existing = currentReactions.find(r => r.user_id === user.id && r.emoji === emoji);

      if (existing) {
        // Remove reaction
        await supabase.from('message_reactions').delete().eq('id', existing.id);
        set(state => ({
          reactions: {
            ...state.reactions,
            [messageId]: (state.reactions[messageId] || []).filter(r => r.id !== existing.id)
          }
        }));
      } else {
        // Add reaction
        const { data, error } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji })
          .select()
          .single();
        if (!error && data) {
          set(state => ({
            reactions: {
              ...state.reactions,
              [messageId]: [...(state.reactions[messageId] || []), data as MessageReaction]
            }
          }));
        }
      }
    } catch { /* silent */ }
  },

  subscribeToMessages: (conversationId: string, onNewMessage?: (message: Message) => void) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        set(state => {
          if (state.messages.some(m => m.id === newMessage.id)) return state;
          return { messages: [...state.messages, newMessage] };
        });
        onNewMessage?.(newMessage);
      })
      .subscribe();

    set({ subscription: channel });
  },

  subscribeToReactions: (conversationId: string) => {
    const messageIds = get().messages.map(m => m.id);
    if (messageIds.length === 0) return;

    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions',
      }, (payload) => {
        const reaction = payload.new as MessageReaction;
        set(state => {
          const current = state.reactions[reaction.message_id] || [];
          if (current.some(r => r.id === reaction.id)) return state;
          return {
            reactions: {
              ...state.reactions,
              [reaction.message_id]: [...current, reaction]
            }
          };
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'message_reactions',
      }, (payload) => {
        const reaction = payload.old as MessageReaction;
        set(state => ({
          reactions: {
            ...state.reactions,
            [reaction.message_id]: (state.reactions[reaction.message_id] || [])
              .filter(r => r.id !== reaction.id)
          }
        }));
      })
      .subscribe();

    set({ reactionSubscription: channel });
  },

  subscribeToConversations: (userId: string, onNewConversation?: () => void) => {
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${userId}`
      }, () => {
        get().fetchConversations(userId);
        onNewConversation?.();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations'
      }, () => {
        get().fetchConversations(userId);
      })
      .subscribe();

    set({ subscription: channel });
  },

  unsubscribeAll: () => {
    const { subscription, reactionSubscription } = get();
    if (subscription) { supabase.removeChannel(subscription); }
    if (reactionSubscription) { supabase.removeChannel(reactionSubscription); }
    set({ subscription: null, reactionSubscription: null });
  },

  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation });
  },

  clearError: () => set({ error: null }),

  reset: () => {
    get().unsubscribeAll();
    set({
      conversations: [],
      messages: [],
      reactions: {},
      currentConversation: null,
      loading: false,
      error: null
    });
  }
}));
