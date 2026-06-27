import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface UseAudioRecorderOptions {
  maxDuration?: number;
  onRecordingComplete?: (uri: string, duration: number) => void;
  onError?: (error: Error) => void;
}

interface RecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri: string | null;
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  requestPermission: () => Promise<boolean>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  reset: () => void;
  deleteRecording: () => Promise<void>;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}): RecorderReturn {
  const { maxDuration = 300, onRecordingComplete, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');

  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedDurationRef = useRef<number>(0);

  const clearDurationInterval = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionStatus(status as 'granted' | 'denied');
      return status === 'granted';
    } catch (error) {
      onError?.(error as Error);
      return false;
    }
  }, [onError]);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.getPermissionsAsync();
      setPermissionStatus(status as 'granted' | 'denied');
    })();
  }, []);

  useEffect(() => {
    return () => {
      clearDurationInterval();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [clearDurationInterval]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    clearDurationInterval();

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const recordingUri = recordingRef.current.getURI();

      let finalDuration = accumulatedDurationRef.current;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      setIsRecording(false);
      setIsPaused(false);
      setDuration(finalDuration);
      setUri(recordingUri || null);
      recordingRef.current = null;

      if (recordingUri && finalDuration > 0) {
        onRecordingComplete?.(recordingUri, finalDuration);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [clearDurationInterval, onRecordingComplete, onError]);

  const startRecording = useCallback(async () => {
    try {
      if (permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          throw new Error('Microphone permission not granted');
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      accumulatedDurationRef.current = 0;
      startTimeRef.current = Date.now();

      durationIntervalRef.current = setInterval(() => {
        const elapsed = accumulatedDurationRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 100);

      setIsRecording(true);
      setIsPaused(false);
      setUri(null);

    } catch (error) {
      onError?.(error as Error);
    }
  }, [permissionStatus, requestPermission, maxDuration, stopRecording, onError]);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.pauseAsync();

      accumulatedDurationRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
      clearDurationInterval();
      setIsPaused(true);

    } catch (error) {
      onError?.(error as Error);
    }
  }, [clearDurationInterval, onError]);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.startAsync();

      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        const elapsed = accumulatedDurationRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 100);

      setIsPaused(false);

    } catch (error) {
      onError?.(error as Error);
    }
  }, [maxDuration, stopRecording, clearDurationInterval, onError]);

  const reset = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setUri(null);
  }, []);

  const deleteRecording = useCallback(async () => {
    if (uri) {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // File may not exist
      }
    }
    reset();
  }, [uri, reset]);

  return {
    isRecording,
    isPaused,
    duration,
    uri,
    permissionStatus,
    requestPermission,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
    deleteRecording
  };
}
