import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/services/supabase';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';

const { height } = Dimensions.get('window');

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    setValidationErrors({});
    clearError();
  }, [email, password]);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'At least 6 characters';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    await signIn(email, password);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles').select('id').eq('id', user.id).maybeSingle();
      if (!profile) {
        await supabase.from('user_profiles').insert({
          id: user.id, email: user.email || email, display_name: email.split('@')[0]
        });
      }
    }
  };

  const getErrorMessage = (err: string) => {
    if (err.includes('Invalid login credentials')) return 'Incorrect email or password.';
    if (err.includes('Email not confirmed')) return 'Please verify your email first.';
    if (err.includes('Too many requests')) return 'Too many attempts. Try again later.';
    if (err.includes('network') || err.includes('fetch')) return 'Network error. Check your connection.';
    return err || 'An error occurred. Please try again.';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      {/* Blue gradient background with floating shapes */}
      <View style={styles.background}>
        <View style={[styles.bubble, styles.bubble1]} />
        <View style={[styles.bubble, styles.bubble2]} />
        <View style={[styles.bubble, styles.bubble3]} />
        <View style={[styles.bubble, styles.bubble4]} />
        <View style={[styles.bubble, styles.bubble5]} />

        <View style={styles.heroContent}>
          <Text style={styles.appName}>VocalForge</Text>
          <Text style={styles.heroSubtitle}>Transform Your Voice</Text>
        </View>
      </View>

      {/* White card */}
      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={styles.cardContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle color="#ef4444" size={16} />
              <Text style={styles.errorBannerText}>{getErrorMessage(error)}</Text>
            </View>
          )}

          {/* Email */}
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.inputWrapper, validationErrors.email && styles.inputWrapperError]}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your email"
              placeholderTextColor="#A0AABA"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>
          {validationErrors.email && (
            <Text style={styles.fieldError}>{validationErrors.email}</Text>
          )}

          {/* Password */}
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={[styles.inputWrapper, validationErrors.password && styles.inputWrapperError]}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="Enter your password"
              placeholderTextColor="#A0AABA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              {showPassword ? <EyeOff color="#A0AABA" size={18} /> : <Eye color="#A0AABA" size={18} />}
            </TouchableOpacity>
          </View>
          {validationErrors.password && (
            <Text style={styles.fieldError}>{validationErrors.password}</Text>
          )}

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => Alert.alert('Reset Password', 'Password reset feature coming soon.')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={styles.primaryBtnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/sign-up')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BRAND = {
  blue: '#3B6EE8',
  blueDark: '#1E3A8A',
  blueMid: '#2952CB',
  blueDeep: '#0F2680',
  blueLight: '#6B93F0',
  bubbleA: 'rgba(255,255,255,0.12)',
  bubbleB: 'rgba(107,147,240,0.35)',
  bubbleC: 'rgba(15,38,128,0.6)',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.blue,
  },
  background: {
    height: height * 0.42,
    backgroundColor: BRAND.blue,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingBottom: 32,
    paddingHorizontal: 28,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
  bubble1: {
    width: 180,
    height: 180,
    backgroundColor: BRAND.bubbleC,
    top: -50,
    right: -30,
  },
  bubble2: {
    width: 120,
    height: 120,
    backgroundColor: BRAND.bubbleA,
    top: 30,
    left: -20,
  },
  bubble3: {
    width: 80,
    height: 80,
    backgroundColor: BRAND.bubbleB,
    top: 80,
    right: 60,
  },
  bubble4: {
    width: 60,
    height: 60,
    backgroundColor: BRAND.bubbleC,
    bottom: 60,
    left: 40,
  },
  bubble5: {
    width: 100,
    height: 100,
    backgroundColor: BRAND.bubbleA,
    bottom: -20,
    right: 20,
  },
  heroContent: {
    zIndex: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontWeight: '400',
  },
  cardScroll: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
  },
  cardContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  card: {
    padding: 28,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: BRAND.blue,
    marginBottom: 6,
    marginTop: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#6B7A99',
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorBannerText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E4E9F2',
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 4,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  textInput: {
    fontSize: 15,
    color: '#1A1D2E',
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 2,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 24,
  },
  forgotText: {
    color: BRAND.blue,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: BRAND.blue,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6B7A99',
    fontSize: 14,
  },
  footerLink: {
    color: BRAND.blue,
    fontSize: 14,
    fontWeight: '700',
  },
});
