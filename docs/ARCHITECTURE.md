# VocalForge - Architecture Document

## Overview

VocalForge is a React Native application for real-time voice modification and voice model creation with explicit consent. This document outlines the complete architecture for a production-ready, secure, and ethically-designed voice transformation application.

---

## Table of Contents

1. [Architecture Diagrams](#architecture-diagrams)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Component Architecture](#component-architecture)
5. [Audio Processing Pipeline](#audio-processing-pipeline)
6. [Security & Consent System](#security--consent-system)
7. [Native Module Integration](#native-module-integration)
8. [Limitations & Considerations](#limitations--considerations)
9. [Code Examples](#code-examples)

---

## Architecture Diagrams

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VOCALFORGE SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MOBILE APP (React Native)                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │   Record    │  │   Voices    │  │   Effects   │  │   Live      │ │   │
│  │  │   Screen    │  │   Library   │  │   Engine    │  │   Stream    │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │   │
│  │         │                │                │                │         │   │
│  │  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐ │   │
│  │  │                    Audio Processing Layer                       │ │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │ │   │
│  │  │  │ expo-av     │  │ react-native│  │ Native Audio Engine     │ │ │   │
│  │  │  │ Recording   │  │ -track-player│ │ (AudioWorklet/TFAudio) │ │ │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                          BACKEND (Supabase)                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │   Auth      │  │   Storage   │  │   Database  │  │    Edge     │ │   │
│  │  │   Service   │  │   (Models)  │  │  (Postgres) │  │  Functions  │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                     ML INFRASTRUCTURE (Optional Cloud)             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│  │  │ Voice Model │  │    RVC      │  │    Real-time Voice         │ │   │
│  │  │   Training   │  │   Engine    │  │    Conversion API          │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌──────────────┐    1. Record Voice     ┌──────────────┐
│     User     │ ──────────────────────>│   Recording  │
│              │                        │    Module    │
└──────────────┘                        └──────┬───────┘
                                               │
                                      2. Upload Samples
                                               │
                                               ▼
┌──────────────┐    6. Return Model    ┌──────────────┐
│     User     │ <──────────────────── │    Model     │
│              │                       │   Training   │
└──────────────┘                       │   Service    │
       │                               └──────┬───────┘
       │                                      │
       │ 3. Request Consent                  │
       │                                      │
       ▼                               4. Process
┌──────────────┐                          & Train
│   Consent    │ ──────────────────────────────┘
│   Workflow   │
└──────┬───────┘                         5. Store Model
       │                                       │
       └───────────────────────────────────────┘
```

---

## Technology Stack

### Frontend (React Native)

| Category | Library | Purpose |
|----------|---------|---------|
| **Framework** | React Native + Expo SDK 54 | Cross-platform development |
| **Language** | TypeScript | Type safety |
| **Navigation** | expo-router | File-based routing |
| **State Management** | Zustand | Lightweight state management |
| **Audio Recording** | expo-av | Voice sample recording |
| **Audio Playback** | react-native-track-player | Audio playback |
| **Real-time Audio** | react-native-audio-api | Low-latency audio processing |
| **Storage** | @react-native-async-storage/async-storage | Local caching |
| **Animations** | react-native-reanimated | Smooth UI animations |
| **Gestures** | react-native-gesture-handler | Touch interactions |

### Backend (Supabase)

| Category | Component | Purpose |
|----------|-----------|---------|
| **Database** | PostgreSQL | User data, voice models, consents |
| **Auth** | Supabase Auth | Email/password authentication |
| **Storage** | Supabase Storage | Voice model files (.pth, .onnx) |
| **Edge Functions** | Deno runtime | Model training, API proxying |
| **Realtime** | Supabase Realtime | Live updates |

### ML/AI Infrastructure

| Category | Technology | Purpose |
|----------|------------|---------|
| **Voice Conversion** | RVC (Retrieval-based Voice Conversion) | Voice model inference |
| **On-device Inference** | ONNX Runtime Mobile | ML model execution |
| **Noise Suppression** | RNNoise | Real-time noise reduction |
| **Audio Processing** | FFmpeg | Audio format conversion |
| **Alternative ML** | TensorFlow Lite | Lightweight ML models |

---

## Project Structure

```
vocalforge/
├── app/                              # Expo Router routes
│   ├── _layout.tsx                   # Root layout
│   ├── index.tsx                     # Entry/landing
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 # Home tab
│   │   ├── record.tsx                # Voice recording
│   │   ├── voices.tsx                # Voice model library
│   │   ├── effects.tsx               # Real-time effects
│   │   └── settings.tsx              # App settings
│   ├── model/
│   │   ├── [id].tsx                  # Voice model detail
│   │   ├── create.tsx                # Create new model
│   │   └── consent.tsx               # Consent workflow
│   └── +not-found.tsx
│
├── components/
│   ├── ui/                           # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Slider.tsx
│   │   └── Switch.tsx
│   ├── audio/
│   │   ├── AudioRecorder.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── WaveformVisualizer.tsx
│   │   └── LiveAudioProcessor.tsx
│   ├── voice/
│   │   ├── VoiceModelCard.tsx
│   │   ├── ConsentForm.tsx
│   │   ├── VoiceEffectSelector.tsx
│   │   └── RecordingProgress.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── TabBar.tsx
│       └── SafeAreaView.tsx
│
├── hooks/
│   ├── useFrameworkReady.ts          # Expo framework init
│   ├── useAudioRecorder.ts           # Recording logic
│   ├── useAudioPlayer.ts             # Playback logic
│   ├── useVoiceModels.ts             # Voice model management
│   ├── useRealTimeAudio.ts           # Live audio processing
│   ├── usePermissions.ts            # Permission handling
│   └── useAuth.ts                    # Authentication state
│
├── stores/
│   ├── useAuthStore.ts               # Auth state
│   ├── useVoiceStore.ts              # Voice models state
│   ├── useEffectsStore.ts            # Effects configuration
│   └── useRecordingStore.ts          # Recording state
│
├── services/
│   ├── supabase.ts                   # Supabase client
│   ├── audio/
│   │   ├── recorder.ts               # Recording service
│   │   ├── player.ts                 # Playback service
│   │   └── processor.ts              # Audio processing
│   ├── voice/
│   │   ├── modelService.ts           # Voice model CRUD
│   │   └── consentService.ts         # Consent management
│   └── api/
│       └── voiceConversion.ts        # Voice conversion API
│
├── native/                           # Native modules (for expo config plugin)
│   ├── AudioProcessor/
│   │   ├── index.ts                  # JS interface
│   │   └── expo-plugin/
│   │       ├── android/              # Android native code
│   │       └── ios/                  # iOS native code
│   └── VoiceConversion/
│       └── index.ts
│
├── utils/
│   ├── audio/
│   │   ├── formatConverter.ts        # Audio format utilities
│   │   ├── waveGenerator.ts          # Waveform data
│   │   └── pitchShift.ts             # Pitch manipulation
│   ├── permissions/
│   │   └── requestPermissions.ts
│   └── security/
│       ├── consentValidator.ts
│       └── watermark.ts              # Audio watermarking
│
├── constants/
│   ├── voiceEffects.ts               # Effect definitions
│   ├── audioConfig.ts                # Audio settings
│   └── theme.ts                      # Design tokens
│
├── types/
│   ├── database.ts                   # Supabase generated types
│   ├── audio.ts                      # Audio-related types
│   ├── voice.ts                      # Voice model types
│   └── env.d.ts                      # Environment variables
│
├── supabase/
│   └── functions/
│       ├── voice-training/
│       │   └── index.ts              # Model training endpoint
│       └── voice-convert/
│           └── index.ts              # Real-time conversion
│
├── assets/
│   ├── images/
│   ├── fonts/
│   └── audio/
│       └── effects/                  # Preset effect sounds
│
└── docs/
    └── ARCHITECTURE.md               # This file
```

---

## Component Architecture

### State Management (Zustand)

```typescript
// Core stores structure
stores/
├── useAuthStore.ts          # User authentication state
├── useVoiceStore.ts         # Voice models library
├── useEffectsStore.ts       # Active effects & parameters
└── useRecordingStore.ts     # Recording session state
```

**Store Design Principles:**
1. Single source of truth per domain
2. Persist critical data to AsyncStorage
3. Middleware for logging (dev) and persistence
4. Selective subscriptions for performance

---

## Audio Processing Pipeline

### Stage 1: Audio Input

```
Microphone Input (48kHz/16-bit)
         │
         ▼
┌─────────────────────┐
│  Audio Capture      │  expo-av / react-native-audio-api
│  - Permission check │
│  - Buffer management│
│  - Level monitoring │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Pre-processing     │
│  - Noise gating     │  RNNoise (optional native)
│  - Normalization    │
│  - Format convert   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Effect Chain       │
│  - Pitch shift      │  Phase Vocoder
│  - Formant adjust   │  PSOLA algorithm
│  - Reverb/echo      │  Convolution
│  - EQ/Compression   │  Native DSP
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Voice Model        │  ONNX Runtime
│  Conversion         │  (if model selected)
│  - RVC inference    │
│  - Real-time stream │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Output             │
│  - Speaker/Headset  │
│  - Virtual audio    │  (platform dependent)
│  - Broadcast stream  │
└─────────────────────┘
```

### Latency Optimization Strategies

| Strategy | Description | Impact |
|----------|-------------|--------|
| **Buffer Size** | Minimize to 256 samples | 5-10ms reduction |
| **Thread Priority** | Real-time audio thread | Prevents glitchesing |
| **Native DSP** | C++ audio processing | 50% faster than JS |
| **Model Quantization** | INT8 quantized models | 2x inference speed |
| **GPU Acceleration** | Metal/Vulkan delegates | Hardware acceleration |

---

## Security & Consent System

### Consent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CONSENT WORKFLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. VOICE SAMPLE COLLECTION                                 │
│     ┌─────────────┐                                         │
│     │  User records    │                                    │
│     │  voice samples   │                                    │
│     │  (min 5 minutes)│                                    │
│     └──────┬──────────┘                                     │
│            │                                                 │
│            ▼                                                 │
│  2. EXPLICIT CONSENT CAPTURE                                │
│     ┌──────────────────────────────────────────┐           │
│     │  CONSENT FORM                            │           │
│     │  ┌────────────────────────────────────┐  │           │
│     │  │ [ ] I consent to create a voice    │  │           │
│     │  │     model from my voice            │  │           │
│     │  │ [ ] I understand this model can    │  │           │
│     │  │     only be used by me             │  │           │
│     │  │ [ ] I can revoke consent anytime   │  │           │
│     │  │ [ ] I am 18+ years old             │  │           │
│     │  └────────────────────────────────────┘  │           │
│     │  Timestamp: ____________                 │           │
│     │  Signature: ____________                 │           │
│     └──────────────────────────────────────────┘           │
│            │                                                 │
│            ▼                                                 │
│  3. CONSENT RECORD (Immutable)                              │
│     ┌──────────────────────────────────────────┐           │
│     │  consent_records table                   │           │
│     │  - user_id                              │           │
│     │  - voice_model_id                       │           │
│     │  - consent_text_hash                    │           │
│     │  - consented_at (timestamp)             │           │
│     │  - ip_address                           │           │
│     │  - device_info                          │           │
│     │  - cryptographic_signature              │           │
│     └──────────────────────────────────────────┘           │
│            │                                                 │
│            ▼                                                 │
│  4. VOICE MODEL GENERATION                                  │
│     ┌──────────────────────────────────────────┐           │
│     │  - Model encrypted with user key         │           │
│     │  - Model watermarked with consent ID    │           │
│     │  - Usage tracking enabled                │           │
│     └──────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Security Measures

| Measure | Implementation | Purpose |
|---------|---------------|---------|
| **Consent Hashing** | SHA-256 of consent form text | Tamper-proof consent records |
| **Model Encryption** | AES-256 per-user encryption | Prevent unauthorized model use |
| **Audio Watermarking** | Steganographic watermark in model | Trace model origin |
| **Usage Logging** | Immutable audit trail | Compliance verification |
| **Rate Limiting** | Per-user model creation limits | Prevent abuse |
| **Biometric Binding** | Optional biometric unlock | Additional security |

---

## Native Module Integration

### iOS Native Module (Audio Processor)

```swift
// VocalForge/AudioProcessor.swift
import AVFoundation
import Accelerate

@objc(AudioProcessor)
class AudioProcessor: NSObject {
  private var audioEngine: AVAudioEngine?
  private var inputNode: AVAudioInputNode?
  private var outputNode: AVAudioOutputNode?

  @objc
  func initialize(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    audioEngine = AVAudioEngine()
    inputNode = audioEngine?.inputNode
    outputNode = audioEngine?.outputNode

    // Configure for low latency
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker])
    try? session.setPreferredIOBufferDuration(0.005) // 5ms latency

    resolve(true)
  }

  @objc
  func startProcessing(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
    let format = inputNode?.outputFormat(forBus: 0)

    inputNode?.installTap(onBus: 0, bufferSize: 1024, format: format!) { buffer, time in
      // Process audio buffer
      self.applyEffects(buffer: buffer)
    }

    try? audioEngine?.start()
    resolve(true)
  }

  private func applyEffects(buffer: AVAudioPCMBuffer) {
    // Apply real-time effects (pitch shift, formant, etc.)
    // Using vDSP for optimized DSP operations
  }
}
```

### Android Native Module (Audio Processor)

```kotlin
// VocalForge/AudioProcessor.kt
class AudioProcessor(context: ReactApplicationContext) :
  ReactContextBaseJavaContext(context) {

  private var audioRecord: AudioRecord? = null
  private var audioTrack: AudioTrack? = null
  private var isProcessing = false

  @ReactMethod
  fun initialize(promise: Promise) {
    val sampleRate = 48000
    val bufferSize = AudioRecord.getMinBufferSize(
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )

    audioRecord = AudioRecord(
      MediaRecorder.AudioSource.MIC,
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      bufferSize * 2
    )

    // Low-latency output
    audioTrack = AudioTrack.Builder()
      .setAudioAttributes(AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build())
      .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
      .build()

    promise.resolve(true)
  }

  @ReactMethod
  fun startProcessing(promise: Promise) {
    isProcessing = true
    audioRecord?.startRecording()
    audioTrack?.play()

    Thread {
      val buffer = ShortArray(1024)
      while (isProcessing) {
        val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
        if (read > 0) {
          applyEffects(buffer)
          audioTrack?.write(buffer, 0, read)
        }
      }
    }.start()

    promise.resolve(true)
  }

  private fun applyEffects(buffer: ShortArray) {
    // Native DSP effects (JNI to C++ for performance)
  }
}
```

---

## Limitations & Considerations

### Platform Limitations

#### iOS Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Background Audio** | Limited background processing | Use Audio Session with proper categories |
| **App Store Review** | Voice apps require justification | Document legitimate use cases clearly |
| **Latency** | ~10-20ms achievable | Use AVAudioEngine with optimal buffer sizes |
| **Third-party Integration** | Cannot directly pipe to other apps | Use Broadcast Extension (limited) |

#### Android Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Audio Latency** | Higher than iOS (20-50ms) | Use Oboe library for low-latency audio |
| **Background Processing** | Aggressive power management | Foreground Service with notification |
| **Device Fragmentation** | Variable performance | Device-specific optimizations |
| **OEM Audio Stacks** | Different behaviors | Test on major manufacturers |

#### Third-Party App Integration

**Critical Limitation:** Direct integration with apps like WhatsApp, Telegram, or Discord is **NOT possible** on mobile platforms due to OS restrictions. Voice data cannot be piped directly into other applications.

**Workarounds:**
1. **Virtual Audio Device** (Android only, requires root) - Not suitable for App Store
2. **Open in App** - Export processed audio and share to other apps
3. **WebRTC Integration** - Create your own communication channels
4. **Desktop Companion** - Recommend desktop solution for app integration

### Performance Considerations

```
Latency Targets:
┌─────────────────────┬────────────┐
│ Component           │ Target     │
├─────────────────────┼────────────┤
│ Audio Capture       │ < 5ms      │
│ Effect Processing   │ < 10ms     │
│ Model Inference     │ < 20ms     │
│ Total Round Trip    │ < 50ms     │
└─────────────────────┴────────────┘

Memory Budget:
┌─────────────────────┬────────────┐
│ Component           │ Max Memory │
├─────────────────────┼────────────┤
│ Audio Buffers       │ 50MB       │
│ Voice Model         │ 100-500MB  │
│ Effects Engine      │ 20MB       │
│ UI Layer            │ 50MB       │
├─────────────────────┼────────────┤
│ Total               │ < 500MB    │
└─────────────────────┴────────────┘
```

---

## Code Examples

### Hook: useRealTimeAudio

```typescript
// hooks/useRealTimeAudio.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Permissions from 'expo-permissions';

interface RealTimeAudioConfig {
  sampleRate: number;
  bufferSize: number;
  effects: AudioEffect[];
  voiceModelId?: string;
}

interface AudioEffect {
  type: 'pitch' | 'formant' | 'reverb' | 'eq' | 'noise_gate';
  params: Record<string, number>;
}

export function useRealTimeAudio() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processingRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
      return status === 'granted';
    } catch (err) {
      setError('Permission request failed');
      return false;
    }
  }, []);

  // Initialize audio processing
  const initialize = useCallback(async (config: RealTimeAudioConfig) => {
    if (!permissionGranted) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      // Platform-specific initialization
      if (Platform.OS === 'web') {
        // Web Audio API implementation
        audioContextRef.current = new AudioContext({
          sampleRate: config.sampleRate,
          latencyHint: 'interactive'
        });

        // Load audio worklet for processing
        await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
        workletRef.current = new AudioWorkletNode(
          audioContextRef.current,
          'voice-processor',
          { processorOptions: config.effects }
        );
      } else {
        // Native implementation via bridge
        await NativeModules.AudioProcessor.initialize();
        await NativeModules.AudioProcessor.configureEffects(config.effects);
      }

      return true;
    } catch (err) {
      setError(`Initialization failed: ${err.message}`);
      return false;
    }
  }, [permissionGranted, requestPermission]);

  // Start real-time processing
  const startProcessing = useCallback(async () => {
    if (isProcessing) return;

    try {
      if (Platform.OS === 'web') {
        // Web implementation
        await navigator.mediaDevices.getUserMedia({ audio: true });
        // ... connect audio graph
      } else {
        await NativeModules.AudioProcessor.startProcessing();
      }

      processingRef.current = true;
      setIsProcessing(true);
      measureLatency();
    } catch (err) {
      setError(`Failed to start: ${err.message}`);
    }
  }, [isProcessing]);

  // Stop processing
  const stopProcessing = useCallback(async () => {
    processingRef.current = false;
    setIsProcessing(false);

    if (Platform.OS === 'web') {
      audioContextRef.current?.suspend();
    } else {
      await NativeModules.AudioProcessor.stopProcessing();
    }
  }, []);

  // Measure round-trip latency
  const measureLatency = useCallback(() => {
    const start = performance.now();
    // Send ping, measure pong
    // Platform-specific implementation
    const measured = 30; // Placeholder
    setLatency(measured);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (processingRef.current) {
        stopProcessing();
      }
      audioContextRef.current?.close();
    };
  }, [stopProcessing]);

  return {
    isProcessing,
    permissionGranted,
    latency,
    error,
    requestPermission,
    initialize,
    startProcessing,
    stopProcessing
  };
}
```

### Component: LiveVoiceTransformer

```typescript
// components/voice/LiveVoiceTransformer.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRealTimeAudio } from '@/hooks/useRealTimeAudio';
import { useEffectsStore } from '@/stores/useEffectsStore';
import { VoiceEffectSelector } from './VoiceEffectSelector';
import { WaveformVisualizer } from '../audio/WaveformVisualizer';
import { Mic, MicOff, Settings } from 'lucide-react-native';

export function LiveVoiceTransformer() {
  const {
    isProcessing,
    permissionGranted,
    latency,
    error,
    requestPermission,
    startProcessing,
    stopProcessing
  } = useRealTimeAudio();

  const { effects, voiceModelId, setEffect } = useEffectsStore();

  const handleToggle = useCallback(async () => {
    if (isProcessing) {
      await stopProcessing();
    } else {
      if (!permissionGranted) {
        const granted = await requestPermission();
        if (!granted) return;
      }
      await startProcessing();
    }
  }, [isProcessing, permissionGranted, requestPermission, startProcessing, stopProcessing]);

  return (
    <View style={styles.container}>
      {/* Waveform visualization */}
      <WaveformVisualizer isActive={isProcessing} style={styles.waveform} />

      {/* Effect selector */}
      <VoiceEffectSelector
        effects={effects}
        onEffectChange={setEffect}
        selectedModelId={voiceModelId}
      />

      {/* Main control button */}
      <TouchableOpacity
        style={[styles.controlButton, isProcessing && styles.controlButtonActive]}
        onPress={handleToggle}
        disabled={!!error && !permissionGranted}
      >
        {isProcessing ? (
          <MicOff color="#fff" size={32} />
        ) : (
          <Mic color="#fff" size={32} />
        )}
      </TouchableOpacity>

      {/* Status indicators */}
      <View style={styles.status}>
        <Text style={styles.statusText}>
          {isProcessing ? 'Processing...' : 'Tap to start'}
        </Text>
        {latency && (
          <Text style={styles.latencyText}>Latency: {latency}ms</Text>
        )}
      </View>

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waveform: {
    height: 150,
    marginBottom: 30,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  controlButtonActive: {
    backgroundColor: '#dc2626',
  },
  status: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1f2937',
  },
  latencyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 5,
  },
  errorContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
});
```

### Edge Function: Voice Training

```typescript
// supabase/functions/voice-training/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TrainingRequest {
  userId: string;
  sampleIds: string[];
  modelName: string;
  consentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, sampleIds, modelName, consentId }: TrainingRequest = await req.json();

    // Validate consent
    const { data: consent, error: consentError } = await supabase
      .from("consent_records")
      .select("*")
      .eq("id", consentId)
      .eq("user_id", userId)
      .eq("revoked", false)
      .single();

    if (consentError || !consent) {
      return new Response(
        JSON.stringify({ error: "Invalid or revoked consent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create model record
    const { data: model, error: modelError } = await supabase
      .from("voice_models")
      .insert({
        user_id: userId,
        name: modelName,
        status: "training",
        consent_id: consentId,
        consent_hash: consent.consent_text_hash
      })
      .select()
      .single();

    if (modelError) {
      throw new Error(`Failed to create model: ${modelError.message}`);
    }

    // Queue training job (in production, use a message queue)
    // For now, we simulate the process
    const trainingJob = {
      modelId: model.id,
      sampleIds,
      status: "queued",
      createdAt: new Date().toISOString()
    };

    // Store job in database
    await supabase.from("training_jobs").insert(trainingJob);

    return new Response(
      JSON.stringify({
        success: true,
        modelId: model.id,
        status: "training"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## Recommended Libraries Summary

### Audio Recording & Processing

| Library | Platform | Use Case |
|---------|----------|----------|
| `expo-av` | All | Voice sample recording |
| `react-native-audio-api` | All | Low-latency audio processing |
| `react-native-track-player` | All | Audio playback |
| `react-native-webrtc` | All | Real-time streaming |
| `expo-audio` (SDK 54) | All | Modern audio API |

### ML/AI Processing

| Library | Platform | Use Case |
|---------|----------|----------|
| `onnxruntime-react-native` | All | On-device ML inference |
| `@tensorflow/tfjs-react-native` | All | TensorFlow models |
| `react-native-fast-tflite` | All | Fast TFLite inference |

### Permissions

| Library | Platform | Use Case |
|---------|----------|----------|
| `expo-camera` (permissions) | All | Camera/mic permissions |
| `react-native-permissions` | All (bare) | Advanced permission handling |

---

## Ethical & Legal Considerations

### Consent Requirements

1. **Explicit Written Consent** - Required before any voice model creation
2. **Clear Purpose Statement** - User must understand how their voice will be used
3. **Revocation Right** - Users can withdraw consent at any time
4. **Age Verification** - 18+ requirement for voice cloning
5. **Audit Trail** - Immutable records of all consents

### Prohibited Uses

- Impersonation of others without consent
- Fraud or deceptive purposes
- Harassment or bullying
- Political manipulation
- Any illegal activities

### Compliance

- GDPR (EU) - Right to be forgotten
- CCPA (California) - Data deletion rights
- BIPA (Illinois) - Biometric data protection
- Voice Cloning Laws (emerging legislation)

---

## Next Steps for Production

1. **Phase 1** - Basic recording and effects (pitch, reverb, EQ)
2. **Phase 2** - Voice model creation with consent workflow
3. **Phase 3** - Real-time voice conversion with ONNX models
4. **Phase 4** - Advanced features (custom models, sharing within app)

---

*Document Version: 1.0.0*
*Last Updated: 2026-06-27*
