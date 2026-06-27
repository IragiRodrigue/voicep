import { create } from 'zustand';
import { callService, type CallSession } from '@/services/callService';
import { supabase } from '@/services/supabase';

interface CallState {
  currentCall: CallSession | null;
  isActive: boolean;
  isRinging: boolean;
  isOutgoing: boolean;
  callerId: string | null;
  calleeId: string | null;
  duration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
  voiceEffect: {
    pitch: number;
    formant: number;
    reverb: number;
    noiseGate: number;
  };

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
}

export const useCallStore = create<CallState>((set, get) => ({
  currentCall: null,
  isActive: false,
  isRinging: false,
  isOutgoing: false,
  callerId: null,
  calleeId: null,
  duration: 0,
  localStream: null,
  remoteStream: null,
  error: null,
  voiceEffect: {
    pitch: 0,
    formant: 1.0,
    reverb: 0,
    noiseGate: -40
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
    const { currentCall } = get();
    if (!currentCall) return false;

    try {
      const success = await callService.acceptCall(currentCall.id);
      if (success) {
        set({ isActive: true, isRinging: false, isOutgoing: false });
        callService.applyVoiceEffects(get().voiceEffect);
      }
      return success;
    } catch (error) {
      set({ error: (error as Error).message });
      return false;
    }
  },

  rejectCall: async () => {
    const { currentCall } = get();
    if (!currentCall) return;

    await callService.endCall(currentCall.id, 'rejected');
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
    const { localStream } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  },

  toggleSpeaker: () => {
    // Toggle speaker on/off - implementation depends on platform
  },

  updateDuration: () => {
    set(state => ({ duration: state.duration + 1 }));
  },

  reset: () => {
    callService.cleanup();
    set({
      currentCall: null,
      isActive: false,
      isRinging: false,
      isOutgoing: false,
      callerId: null,
      calleeId: null,
      duration: 0,
      localStream: null,
      remoteStream: null,
      error: null
    });
  }
}));
