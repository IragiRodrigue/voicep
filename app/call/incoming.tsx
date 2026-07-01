import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallStore } from '@/stores/useCallStore';
import { Phone, PhoneOff } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';

function AnimatedRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

export default function IncomingCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { acceptCall, rejectCall, currentCall } = useCallStore();

  const callerName = (params.callerName as string) || 'Unknown';
  const callSessionId = params.callSessionId as string;

  useEffect(() => {
    // This screen would be triggered by a realtime subscription
    // or push notification in a real app
  }, []);

  const handleAccept = async () => {
    const success = await acceptCall();
    if (success) {
      router.replace('/call/active');
    }
  };

  const handleReject = async () => {
    await rejectCall();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{callerName[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <AnimatedRing />
          <AnimatedRing />
        </View>

        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.callStatus}>Incoming Call...</Text>
      </View>

      <View style={styles.actionsContainer}>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.declineButton} onPress={handleReject}>
            <PhoneOff color="#ffffff" size={28} />
            <Text style={styles.buttonLabel}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Phone color="#ffffff" size={28} />
            <Text style={styles.buttonLabel}>Accept</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#ffffff',
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#16a34a',
    zIndex: 0,
  },
  callerName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 18,
    color: '#94a3b8',
  },
  actionsContainer: {
    paddingBottom: 60,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 60,
  },
  declineButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 4,
  },
});
