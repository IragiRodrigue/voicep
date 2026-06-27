import { supabase } from '@/services/supabase';

interface CallSession {
  id: string;
  caller_id: string;
  callee_id: string;
  status: 'ringing' | 'connecting' | 'active' | 'ended' | 'missed' | 'rejected';
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  caller_offer: Record<string, unknown> | null;
  callee_answer: Record<string, unknown> | null;
  voice_effect_id: string | null;
  voice_model_id: string | null;
  created_at: string;
}

interface CallLog {
  id: string;
  call_session_id: string;
  user_id: string;
  other_user_id: string;
  direction: 'incoming' | 'outgoing';
  duration_seconds: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  display_name: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

class CallService {
  private callSession: CallSession | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;

  // Initialize call
  async initiateCall(calleeId: string, voiceModelId?: string, voiceEffectId?: string): Promise<CallSession | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/call-signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'initiate-call',
          payload: { calleeId, voiceModelId, voiceEffectId }
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      this.callSession = result.callSession;
      return result.callSession;
    } catch (error) {
      console.error('Failed to initiate call:', error);
      return null;
    }
  }

  // Accept incoming call
  async acceptCall(callSessionId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create WebRTC answer
      const answer = await this.createAnswer();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/call-signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'accept-call',
          payload: { callSessionId, answer }
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to accept call:', error);
      return false;
    }
  }

  // End call
  async endCall(callSessionId: string, reason?: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Stop all streams
      this.cleanup();

      const response = await fetch(`${SUPABASE_URL}/functions/v1/call-signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'end-call',
          payload: { callSessionId, reason }
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to end call:', error);
      return false;
    }
  }

  // Get active call
  async getActiveCall(): Promise<CallSession | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/call-signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'get-active-call',
          payload: {}
        })
      });

      const result = await response.json();
      return result.activeCall || null;
    } catch (error) {
      console.error('Failed to get active call:', error);
      return null;
    }
  }

  // Get call history
  async getCallHistory(limit: number = 50, offset: number = 0): Promise<CallLog[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/call-signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'get-call-history',
          payload: { limit, offset }
        })
      });

      const result = await response.json();
      return result.logs || [];
    } catch (error) {
      console.error('Failed to get call history:', error);
      return [];
    }
  }

  // WebRTC: Create offer (for caller)
  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    try {
      // Get local stream
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      return null;
    }
  }

  // WebRTC: Create answer (for callee)
  async createAnswer(): Promise<RTCSessionDescriptionInit | null> {
    try {
      // Get local stream
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      return answer;
    } catch (error) {
      console.error('Failed to create answer:', error);
      return null;
    }
  }

  // Apply voice effects in real-time
  applyVoiceEffects(effects: {
    pitch?: number;
    formant?: number;
    reverb?: number;
    noiseGate?: number;
  }): void {
    if (!this.localStream) return;

    // Create audio context for processing
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const source = this.audioContext.createMediaStreamSource(this.localStream);

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0;

    // Create script processor for real-time audio manipulation
    // Note: In production, use AudioWorklet for better performance
    this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.audioProcessor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;

      for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
        const inputData = inputBuffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);

        // Apply pitch shift (simplified - in production use proper DSP)
        for (let i = 0; i < inputData.length; i++) {
          // Simple pitch shifting by resampling
          const pitchFactor = effects.pitch ? Math.pow(2, effects.pitch / 12) : 1;
          const sourceIndex = Math.floor(i / pitchFactor);
          outputData[i] = inputData[sourceIndex] || 0;
        }

        // Apply noise gate
        if (effects.noiseGate) {
          const threshold = Math.pow(10, effects.noiseGate / 20);
          for (let i = 0; i < outputData.length; i++) {
            if (Math.abs(outputData[i]) < threshold) {
              outputData[i] = 0;
            }
          }
        }
      }
    };

    // Connect audio graph
    source.connect(gainNode);
    gainNode.connect(this.audioProcessor);
    this.audioProcessor.connect(this.audioContext.destination);
  }

  // Cleanup resources
  cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.callSession = null;
  }

  // Get current call session
  getCallSession(): CallSession | null {
    return this.callSession;
  }

  // Set call session
  setCallSession(session: CallSession | null): void {
    this.callSession = session;
  }
}

export const callService = new CallService();
export type { CallSession, CallLog, Contact, UserProfile };
