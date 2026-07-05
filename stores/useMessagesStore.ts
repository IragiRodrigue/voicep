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
  currentConversation: ConversationWithDetails | null;
  loading: boolean;
  error: string | null;
  subscription: ReturnType<typeof supabase.channel> | null;

  fetchConversations: (userId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<Message | null>;
  createConversation: (otherUserId: string) => Promise<Conversation | null>;
  markAsRead: (conversationId: string) => Promise<void>;
  subscribeToMessages: (conversationId: string, onNewMessage?: (message: Message) => void) => void;
  subscribeToConversations: (userId: string, onNewConversation?: () => void) => void;
  unsubscribeAll: () => void;
  setCurrentConversation: (conversation: ConversationWithDetails | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: [],
  currentConversation: null,
  loading: false,
  error: null,
  subscription: null,

  fetchConversations: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      // Get all conversations where user is a participant
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

      // Fetch conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      // For each conversation, get participants and other user info
      const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
        (conversations || []).map(async (conv) => {
          // Get participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('*, user_profiles!inner(id, display_name, email)')
            .eq('conversation_id', conv.id);

          const otherParticipant = participants?.find(p => p.user_id !== userId);
          const myParticipation = participants?.find(p => p.user_id === userId);

          // Count unread messages
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

  sendMessage: async (conversationId: string, content: string) => {
    set({ error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local messages
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

      // Check if conversation already exists between these users
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
          // Conversation exists, return it
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', otherParticipations[0].conversation_id)
            .single();

          return existingConv as Conversation;
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add both participants
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

      // Update local unread count
      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
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
          // Avoid duplicates
          if (state.messages.some(m => m.id === newMessage.id)) {
            return state;
          }
          return { messages: [...state.messages, newMessage] };
        });
        onNewMessage?.(newMessage);
      })
      .subscribe();

    set({ subscription: channel });
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
    const { subscription } = get();
    if (subscription) {
      supabase.removeChannel(subscription);
      set({ subscription: null });
    }
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
      currentConversation: null,
      loading: false,
      error: null
    });
  }
}));
