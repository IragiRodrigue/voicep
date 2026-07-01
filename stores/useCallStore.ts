import { create } from 'zustand';
import { callService, type CallSession } from '@/services/callService';
import { supabase } from '@/services/supabase';
import { Router } from 'expo-router';

interface CallState {
  currentCall: CallSession | null;
  isActive: boolean;
  isRinging: boolean;
  isOutgoing: boolean;
  callerId: string | null;
  calleeId: string | null;
  duration: number;
  error: string | null;
  incomingCall: CallSession | null;
  callerName: string | null;
  voiceEffect: {
    pitch: number;
    formant: number;
    reverb: number;
    noiseGate: number;
  };
  subscription: ReturnType<typeof supabase.channel> | null;

  // Actions
  initiateCall: (calleeId: string, voiceModelId?: string) => Promise<boolean>;
  acceptCall: () => Promise<boolean>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  setVoiceEffect: (effect: Partial<CallState['voiceEffect']>) => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  updateDuration: () => void;
  reset: () => void;
  subscribeToIncomingCalls: (userId: string, onIncoming?: (call: CallSession) => void) => void;
  unsubscribeFromCalls: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  currentCall: null,
  isActive: false,
  isRinging: false,
  isOutgoing: false,
  callerId: null,
  calleeId: null,
  duration: 0,
  error: null,
  incomingCall: null,
  callerName: null,
  voiceEffect: {
    pitch: 0,
    formant: 1.0,
    reverb: 0,
    noiseGate: -40
  },
  subscription: null,

  subscribeToIncomingCalls: (userId: string, onIncoming?: (call: CallSession) => void) => {
    // Unsubscribe from previous subscription
    get().unsubscribeFromCalls();

    const channel = supabase
      .channel(`incoming-calls:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_sessions',
        filter: `callee_id=eq.${userId}`
      }, async (payload) => {
        const newCall = payload.new as CallSession;
        if (newCall.status === 'ringing') {
          // Get caller info
          const { data: callerProfile } = await supabase
            .from('user_profiles')
            .select('display_name, email')
            .eq('id', newCall.caller_id)
            .single();

          set({
            incomingCall: newCall,
            isRinging: true,
            callerId: newCall.caller_id,
            callerName: callerProfile?.display_name || callerProfile?.email || 'Unknown'
          });

          onIncoming?.(newCall);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_sessions',
        filter: `callee_id=eq.${userId}`
      }, (payload) => {
        const updated = payload.new as CallSession;
        if (updated.status === 'ended' || updated.status === 'rejected') {
          get().reset();
        }
      })
      .subscribe();

    set({ subscription: channel });
  },

  unsubscribeFromCalls: () => {
    const { subscription } = get();
    if (subscription) {
      supabase.removeChannel(subscription);
      set({ subscription: null });
    }
  },

  initiateCall: async (calleeId: string, voiceModelId?: string) => {
    set({ isOutgoing: true, calleeId, error: null });

    try {
      const callSession = await callService.initiateCall(calleeId, voiceModelId);
      if (callSession) {
        set({ currentCall: callSession, isRinging: true });

        // Subscribe to call status changes
        const channel = supabase
          .channel(`call:${callSession.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'call_sessions',
            filter: `id=eq.${callSession.id}`
          }, (payload) => {
            const updated = payload.new as CallSession;
            if (updated.status === 'active') {
              set({ isActive: true, isRinging: false });
            } else if (updated.status === 'ended' || updated.status === 'rejected') {
              get().reset();
            } else if (updated.status === 'connecting') {
              // Call was answered, about to connect
              set({ isRinging: false });
            }
          })
          .subscribe();

        return true;
      }
      return false;
    } catch (error) {
      set({ error: (error as Error).message, isOutgoing: false });
      return false;
    }
  },

  acceptCall: async () => {
    const { incomingCall, currentCall } = get();
    const callToAccept = incomingCall || currentCall;
    if (!callToAccept) return false;

    try {
      const success = await callService.acceptCall(callToAccept.id);
      if (success) {
        set({
          currentCall: callToAccept,
          isActive: true,
          isRinging: false,
          isOutgoing: false,
          incomingCall: null
        });
        callService.applyVoiceEffects(get().voiceEffect);
      }
      return success;
    } catch (error) {
      set({ error: (error as Error).message });
      return false;
    }
  },

  rejectCall: async () => {
    const { incomingCall, currentCall } = get();
    const callToReject = incomingCall || currentCall;
    if (!callToReject) return;

    await callService.endCall(callToReject.id, 'rejected');
    get().reset();
  },

  endCall: async () => {
    const { currentCall } = get();
    if (!currentCall) return;

    await callService.endCall(currentCall.id, 'ended');
    get().reset();
  },

  setVoiceEffect: (effect) => {
    set(state => ({
      voiceEffect: { ...state.voiceEffect, ...effect }
    }));
    callService.applyVoiceEffects(get().voiceEffect);
  },

  toggleMute: () => {
    const { voiceEffect } = get();
    // Toggle mute by setting noise gate to maximum
    set({
      voiceEffect: {
        ...voiceEffect,
        noiseGate: voiceEffect.noiseGate === 0 ? -40 : 0
      }
    });
  },

  toggleSpeaker: () => {
    // Toggle speaker - would need native module for actual implementation
  },

  updateDuration: () => {
    set(state => ({ duration: state.duration + 1 }));
  },

  reset: () => {
    callService.cleanup();
    get().unsubscribeFromCalls();
    set({
      currentCall: null,
      isActive: false,
      isRinging: false,
      isOutgoing: false,
      callerId: null,
      calleeId: null,
      duration: 0,
      error: null,
      incomingCall: null,
      callerName: null
    });
  }
}));
