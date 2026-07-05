import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/services/supabase';
import { Eye, EyeOff, AlertCircle, CheckCircle, Check } from 'lucide-react-native';

const { height } = Dimensions.get('window');

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

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setValidationErrors({});
    clearError();
  }, [email, password, confirmPassword, displayName]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!displayName.trim() || displayName.length < 2) errors.displayName = 'Name must be at least 2 characters';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email address';
    if (!password || password.length < 8) errors.password = 'At least 8 characters';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!acceptedTerms) errors.terms = 'Please accept the terms';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (password.length < 8) return { level: 2, label: 'Fair', color: '#f59e0b' };
    if (/[A-Z]/.test(password) && /\d/.test(password)) return { level: 4, label: 'Strong', color: '#16a34a' };
    return { level: 3, label: 'Good', color: '#3B6EE8' };
  };

  const getErrorMessage = (err: string) => {
    if (err.includes('already registered')) return 'This email is already registered.';
    if (err.includes('network') || err.includes('fetch')) return 'Network error. Check your connection.';
    return err || 'Sign up failed. Please try again.';
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    await signUp(email, password);
    if (error) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_profiles').insert({
        id: user.id,
        email: user.email || email,
        display_name: displayName || email.split('@')[0]
      });
    }
    setSuccess(true);
  };

  const strength = getPasswordStrength();

  if (success) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successBackground}>
          <View style={[styles.bubble, styles.bubble1]} />
          <View style={[styles.bubble, styles.bubble2]} />
          <View style={[styles.bubble, styles.bubble3]} />
        </View>
        <View style={styles.successCard}>
          <CheckCircle color={BRAND.blue} size={60} />
          <Text style={styles.successTitle}>You're in!</Text>
          <Text style={styles.successText}>
            Account created for {email}.{'\n'}Check your inbox to verify.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/sign-in')}>
            <Text style={styles.primaryBtnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

        <View style={styles.heroContent}>
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Get Started</Text>
          <Text style={styles.heroSubtitle}>Create your VocalForge account</Text>
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
          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle color="#ef4444" size={16} />
              <Text style={styles.errorBannerText}>{getErrorMessage(error)}</Text>
            </View>
          )}

          {/* Full Name */}
          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={[styles.inputWrapper, validationErrors.displayName && styles.inputWrapperError]}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter Full Name"
              placeholderTextColor="#A0AABA"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>
          {validationErrors.displayName && (
            <Text style={styles.fieldError}>{validationErrors.displayName}</Text>
          )}

          {/* Email */}
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.inputWrapper, validationErrors.email && styles.inputWrapperError]}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter Email"
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
              placeholder="Enter Password"
              placeholderTextColor="#A0AABA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              {showPassword ? <EyeOff color="#A0AABA" size={18} /> : <Eye color="#A0AABA" size={18} />}
            </TouchableOpacity>
          </View>
          {validationErrors.password && (
            <Text style={styles.fieldError}>{validationErrors.password}</Text>
          )}
          {strength && (
            <View style={styles.strengthRow}>
              {[1, 2, 3, 4].map(l => (
                <View key={l} style={[styles.strengthBar, { backgroundColor: l <= strength.level ? strength.color : '#E4E9F2' }]} />
              ))}
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          {/* Confirm Password */}
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <View style={[styles.inputWrapper, validationErrors.confirmPassword && styles.inputWrapperError]}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="Re-enter Password"
              placeholderTextColor="#A0AABA"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            {confirmPassword.length > 0 && password === confirmPassword && (
              <Check color="#16a34a" size={18} />
            )}
          </View>
          {validationErrors.confirmPassword && (
            <Text style={styles.fieldError}>{validationErrors.confirmPassword}</Text>
          )}

          {/* Terms */}
          <TouchableOpacity
            style={[styles.termsRow, validationErrors.terms && styles.termsError]}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
              {acceptedTerms && <Check color="#ffffff" size={14} />}
            </View>
            <Text style={styles.termsText}>
              I agree to the processing of{' '}
              <Text style={styles.termsLink}>Personal data</Text>
              {' '}and ethical use policy
            </Text>
          </TouchableOpacity>
          {validationErrors.terms && (
            <Text style={styles.fieldError}>{validationErrors.terms}</Text>
          )}

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={styles.primaryBtnText}>Sign up</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/sign-in')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.blue,
  },
  background: {
    height: height * 0.30,
    backgroundColor: BRAND.blue,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingBottom: 28,
    paddingHorizontal: 28,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
  bubble1: {
    width: 160,
    height: 160,
    backgroundColor: BRAND.bubbleC,
    top: -40,
    right: -20,
  },
  bubble2: {
    width: 100,
    height: 100,
    backgroundColor: BRAND.bubbleA,
    top: 20,
    left: -10,
  },
  bubble3: {
    width: 70,
    height: 70,
    backgroundColor: BRAND.bubbleB,
    top: 60,
    right: 50,
  },
  bubble4: {
    width: 50,
    height: 50,
    backgroundColor: BRAND.bubbleA,
    bottom: 20,
    left: 60,
  },
  heroContent: {
    zIndex: 10,
  },
  backRow: {
    marginBottom: 12,
  },
  backText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
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
    marginBottom: 6,
    marginLeft: 2,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  termsError: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: BRAND.blue,
    borderColor: BRAND.blue,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7A99',
    lineHeight: 20,
  },
  termsLink: {
    color: BRAND.blue,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: BRAND.blue,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
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
  successScreen: {
    flex: 1,
    backgroundColor: BRAND.blue,
  },
  successBackground: {
    flex: 1,
    overflow: 'hidden',
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 40,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: BRAND.blue,
    marginTop: 16,
  },
  successText: {
    fontSize: 15,
    color: '#6B7A99',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    marginBottom: 28,
  },
});
