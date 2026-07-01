import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/services/supabase';
import { Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!displayName.trim()) {
      errors.displayName = 'Display name is required';
    } else if (displayName.length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptedTerms) {
      errors.terms = 'You must accept the terms to continue';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    await signUp(email, password);

    // Check if there was an error (error state is set in the store)
    if (error) {
      return;
    }

    // Create user profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email || email,
          display_name: displayName || email.split('@')[0]
        });
    }

    setSuccess(true);
  };

  const getErrorMessage = (err: string): string => {
    if (err.includes('already registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (err.includes('Password') && err.includes('weak')) {
      return 'Password is too weak. Please use a stronger password.';
    }
    if (err.includes('network') || err.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    return err || 'Failed to create account. Please try again.';
  };

  const getPasswordStrength = (): { level: number; text: string; color: string } => {
    if (password.length === 0) return { level: 0, text: '', color: '#e2e8f0' };
    if (password.length < 6) return { level: 1, text: 'Too short', color: '#ef4444' };
    if (password.length < 8) return { level: 2, text: 'Weak', color: '#f59e0b' };
    if (!(/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password))) {
      return { level: 3, text: 'Good', color: '#fcd34d' };
    }
    return { level: 4, text: 'Strong', color: '#16a34a' };
  };

  const strength = getPasswordStrength();

  if (success) {
    return (
      <View style={styles.successContainer}>
        <CheckCircle color="#16a34a" size={64} />
        <Text style={styles.successTitle}>Account Created!</Text>
        <Text style={styles.successText}>
          We sent a confirmation email to {email}. Click the link to verify your account.
        </Text>
        <TouchableOpacity
          style={styles.successButton}
          onPress={() => router.push('/sign-in')}
        >
          <Text style={styles.successButtonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logoText}>VocalForge</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join VocalForge to create personalized voice models
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle color="#ef4444" size={20} />
            <Text style={styles.errorBannerText}>{getErrorMessage(error)}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={[styles.inputContainer, validationErrors.email && styles.inputError]}>
            <Mail color="#6b7280" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#9ca3af"
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

          <Text style={styles.inputLabel}>Display Name</Text>
          <View style={[styles.inputContainer, validationErrors.displayName && styles.inputError]}>
            <User color="#6b7280" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#9ca3af"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>
          {validationErrors.displayName && (
            <Text style={styles.fieldError}>{validationErrors.displayName}</Text>
          )}

          <Text style={styles.inputLabel}>Password</Text>
          <View style={[styles.inputContainer, validationErrors.password && styles.inputError]}>
            <Lock color="#6b7280" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min 8 characters"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              {showPassword ? (
                <EyeOff color="#6b7280" size={20} />
              ) : (
                <Eye color="#6b7280" size={20} />
              )}
            </TouchableOpacity>
          </View>
          {validationErrors.password && (
            <Text style={styles.fieldError}>{validationErrors.password}</Text>
          )}

          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: level <= strength.level ? strength.color : '#e2e8f0' }
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthText, { color: strength.color }]}>
                {strength.text}
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={[styles.inputContainer, validationErrors.confirmPassword && styles.inputError]}>
            <Lock color="#6b7280" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            {confirmPassword.length > 0 && password === confirmPassword && (
              <CheckCircle color="#16a34a" size={20} />
            )}
          </View>
          {validationErrors.confirmPassword && (
            <Text style={styles.fieldError}>{validationErrors.confirmPassword}</Text>
          )}

          <TouchableOpacity
            style={[styles.termsRow, validationErrors.terms && styles.termsError]}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && <CheckCircle color="#ffffff" size={16} />}
            </View>
            <Text style={styles.termsText}>
              I agree to the terms of service and ethical use policy. I understand
              that voice models are for personal use only.
            </Text>
          </TouchableOpacity>
          {validationErrors.terms && (
            <Text style={styles.fieldError}>{validationErrors.terms}</Text>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Create Account</Text>
                <ArrowRight color="#ffffff" size={20} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/sign-in')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ethicalNotice}>
          <AlertCircle color="#2563eb" size={20} />
          <Text style={styles.ethicalTitle}>Ethical Use Commitment</Text>
          <Text style={styles.ethicalText}>
            By creating an account, you commit to using VocalForge responsibly.
            All voice models require explicit consent from the voice owner.
            Impersonation, fraud, or deceptive use is prohibited.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeButton: {
    padding: 4,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },
  strengthContainer: {
    marginBottom: 12,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginTop: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    marginTop: 12,
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  termsError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#2563eb',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 16,
  },
  footerLink: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  ethicalNotice: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
  },
  ethicalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginTop: 8,
    marginBottom: 8,
  },
  ethicalText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  successButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  successButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
