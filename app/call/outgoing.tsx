import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallStore } from '@/stores/useCallStore';
import { PhoneOff } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing
} from 'react-native-reanimated';

function AnimatedPulse({ delay }: { delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(2, { duration: 2000, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    ));

    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.5, { duration: 0 }),
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    ));
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.pulse, style]} />;
}

export default function OutgoingCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { initiateCall, endCall, currentCall, error } = useCallStore();
  const [callInitiated, setCallInitiated] = useState(false);

  const contactId = params.contactId as string;
  const contactName = (params.contactName as string) || 'Unknown';

  useEffect(() => {
    if (!callInitiated && contactId) {
      startCall();
    }
  }, [contactId]);

  const startCall = async () => {
    setCallInitiated(true);
    const success = await initiateCall(contactId);
    if (success && currentCall) {
      router.replace('/call/active');
    }
  };

  const handleEndCall = async () => {
    if (currentCall) {
      await endCall();
    }
    router.back();
  };

  useEffect(() => {
    if (error) {
      setTimeout(() => {
        router.back();
      }, 2000);
    }
  }, [error]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{contactName[0]?.toUpperCase() || 'U'}</Text>
          </View>

          <AnimatedPulse delay={0} />
          <AnimatedPulse delay={400} />
          <AnimatedPulse delay={800} />
        </View>

        <Text style={styles.contactName}>{contactName}</Text>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.statusText}>Calling...</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <PhoneOff color="#ffffff" size={28} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#ffffff',
  },
  pulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#2563eb',
    zIndex: -1,
  },
  contactName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  actionsContainer: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
