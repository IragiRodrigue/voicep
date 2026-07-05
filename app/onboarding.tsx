import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mic, Sliders, MessageCircle, Shield, ArrowRight } from 'lucide-react-native';

const { width: W, height: H } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    Icon: Mic,
    accent: '#3B6EE8',
    accentDark: '#1E3A8A',
    title: 'Clone Your Voice',
    subtitle:
      'Record a few minutes of audio and create a precise AI model of your unique voice. Your voice, your identity.',
    bubbles: [
      { w: 200, h: 200, top: -60, right: -50, opacity: 0.55 },
      { w: 120, h: 120, top: 30, left: -20, opacity: 0.25 },
      { w: 85, h: 85, top: 90, right: 60, opacity: 0.35 },
      { w: 60, h: 60, bottom: 50, left: 50, opacity: 0.2 },
      { w: 110, h: 110, bottom: -20, right: 30, opacity: 0.3 },
    ],
  },
  {
    id: '2',
    Icon: Sliders,
    accent: '#2952CB',
    accentDark: '#0F2680',
    title: 'Transform in Real-Time',
    subtitle:
      'Apply pitch shifts, reverb, noise gate, and custom presets during live calls or recordings.',
    bubbles: [
      { w: 180, h: 180, top: -50, left: -40, opacity: 0.55 },
      { w: 100, h: 100, top: 50, right: 10, opacity: 0.25 },
      { w: 70, h: 70, top: 110, left: 60, opacity: 0.35 },
      { w: 130, h: 130, bottom: -30, right: -20, opacity: 0.3 },
      { w: 55, h: 55, bottom: 60, left: 30, opacity: 0.2 },
    ],
  },
  {
    id: '3',
    Icon: MessageCircle,
    accent: '#1844C8',
    accentDark: '#0C2490',
    title: 'Secure Messaging & Calls',
    subtitle:
      'Chat and call your contacts in real-time. React to messages, see who is online, and stay connected.',
    bubbles: [
      { w: 190, h: 190, top: -55, right: -30, opacity: 0.5 },
      { w: 110, h: 110, top: 20, left: -15, opacity: 0.25 },
      { w: 80, h: 80, top: 100, right: 55, opacity: 0.35 },
      { w: 140, h: 140, bottom: -40, left: -20, opacity: 0.3 },
      { w: 65, h: 65, bottom: 40, right: 30, opacity: 0.2 },
    ],
  },
  {
    id: '4',
    Icon: Shield,
    accent: '#0F2680',
    accentDark: '#06154A',
    title: 'Privacy First, Always',
    subtitle:
      'Your voice data is yours. Revoke consent at any time. Built with end-to-end security and ethical AI principles.',
    bubbles: [
      { w: 210, h: 210, top: -65, right: -35, opacity: 0.5 },
      { w: 125, h: 125, top: 25, left: -25, opacity: 0.28 },
      { w: 90, h: 90, top: 105, right: 50, opacity: 0.35 },
      { w: 155, h: 155, bottom: -35, left: -15, opacity: 0.28 },
      { w: 65, h: 65, bottom: 55, right: 25, opacity: 0.22 },
    ],
  },
];

const HERO_H = H * 0.48;
const CARD_H = H * 0.52 + 20; // 20 for overlap

async function markOnboardingSeen() {
  await AsyncStorage.setItem('onboarding_seen', 'true');
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList>(null);

  const goTo = (index: number) => {
    flatRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      goTo(activeIndex + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = async () => {
    await markOnboardingSeen();
    router.replace('/(auth)/sign-in');
  };

  const handleGetStarted = async () => {
    await markOnboardingSeen();
    router.replace('/(auth)/sign-up');
  };

  const handleSignIn = async () => {
    await markOnboardingSeen();
    router.replace('/(auth)/sign-in');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIndex(idx);
  };

  const currentSlide = SLIDES[activeIndex];
  const isLast = activeIndex === SLIDES.length - 1;

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => {
    const { Icon, accent, accentDark, title, subtitle, bubbles } = item;
    return (
      <View style={{ width: W, height: H }}>
        {/* Blue hero area */}
        <View style={[styles.hero, { backgroundColor: accent }]}>
          {bubbles.map((b, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                {
                  width: b.w,
                  height: b.h,
                  backgroundColor: accentDark,
                  opacity: b.opacity,
                  top: b.top,
                  left: (b as any).left,
                  right: (b as any).right,
                  bottom: (b as any).bottom,
                },
              ]}
            />
          ))}

          {/* Icon circle */}
          <View style={[styles.iconRing, { borderColor: 'rgba(255,255,255,0.18)' }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Icon color="#ffffff" size={52} strokeWidth={1.5} />
            </View>
          </View>
        </View>

        {/* White card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={i => i.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: onScroll }
        )}
        scrollEventThrottle={16}
      />

      {/* Bottom overlay: dots + buttons (sits on top of card) */}
      <View style={styles.bottomOverlay}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const dotInput = scrollX.interpolate({
              inputRange: [(i - 1) * W, i * W, (i + 1) * W],
              outputRange: [6, 22, 6],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange: [(i - 1) * W, i * W, (i + 1) * W],
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <TouchableOpacity key={i} onPress={() => goTo(i)}>
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      width: dotInput,
                      opacity: dotOpacity,
                      backgroundColor: currentSlide.accent,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Buttons */}
        {isLast ? (
          <View style={styles.finalBtns}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: currentSlide.accent }]}
              onPress={handleGetStarted}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <ArrowRight color="#ffffff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignIn}>
              <Text style={[styles.secondaryBtnText, { color: currentSlide.accent }]}>
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.navBtns}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={[styles.skipText, { color: currentSlide.accent }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: currentSlide.accent }]}
              onPress={handleNext}
            >
              <Text style={styles.nextText}>Next</Text>
              <ArrowRight color="#ffffff" size={18} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  hero: {
    height: HERO_H,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
  iconRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingHorizontal: 32,
    paddingTop: 36,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1D2E',
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#6B7A99',
    lineHeight: 26,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 44,
    backgroundColor: 'transparent',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 32,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  navBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  nextText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  finalBtns: {
    gap: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
