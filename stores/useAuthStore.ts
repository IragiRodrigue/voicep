import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        initialized: true
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null
        });
      });
    } catch (error) {
      set({ initialized: true, error: (error as Error).message });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        loading: false
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false
      });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        loading: false
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false
      });
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({
        user: null,
        session: null,
        loading: false
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false
      });
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      set({ loading: false });
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false
      });
    }
  },

  clearError: () => set({ error: null })
}));
