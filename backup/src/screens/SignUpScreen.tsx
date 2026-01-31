import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { validateEmail, validatePassword, validatePhone } from '../utils/validation';

export const SignUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signUp } = useAuth();

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = t('common.required');
    if (!formData.lastName) newErrors.lastName = t('common.required');

    if (!formData.email) {
      newErrors.email = t('common.required');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('errors.invalidCredentials');
    }

    if (!formData.password) {
      newErrors.password = t('common.required');
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.message || '';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Signup is taking too long. Please check your internet connection and try again.'
              )
            ),
          20000
        )
      );

      await Promise.race([
        signUp(formData.email, formData.password, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          preferredLanguage: 'de',
        }),
        timeoutPromise,
      ]);
      
      // Show success feedback before verification screen
      Alert.alert(
        t('auth.signupSuccessTitle'),
        t('auth.signupSuccessBody'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              // Show verification screen
              setShowVerificationScreen(true);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  // If showing verification screen
  if (showVerificationScreen) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.verificationContainer}>
              <FlamencoLoading 
                message={t('auth.checkEmailForVerification')}
                size="large"
              />
              
              <View style={styles.verificationInfo}>
                <Text style={styles.verificationTitle}>
                  {t('auth.accountCreatedSuccessfully')}
                </Text>
                <Text style={styles.verificationText}>
                  {t('auth.verificationEmailSent')}
                </Text>
                <Text style={styles.emailText}>
                  {formData.email}
                </Text>
                <Text style={styles.verificationText}>
                  {t('auth.checkInboxAndVerify')}
                </Text>
              </View>

              <View style={styles.verificationActions}>
                <Button
                  title={t('auth.backToLogin')}
                  onPress={() => navigation.navigate('Login')}
                  style={styles.loginButton}
                />
                <TouchableOpacity
                  onPress={() => setShowVerificationScreen(false)}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>{t('auth.createAnotherAccount')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>{t('auth.createAccount')}</Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label={t('auth.firstName')}
              placeholder={t('auth.firstName')}
              value={formData.firstName}
              onChangeText={(value) => updateField('firstName', value)}
              autoComplete="off"
              icon="person-outline"
              error={errors.firstName}
            />

            <Input
              label={t('auth.lastName')}
              placeholder={t('auth.lastName')}
              value={formData.lastName}
              onChangeText={(value) => updateField('lastName', value)}
              autoComplete="off"
              icon="person-outline"
              error={errors.lastName}
            />

            <Input
              label={t('auth.email')}
              placeholder={t('auth.email')}
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="off"
              icon="mail-outline"
              error={errors.email}
            />

            <Input
              label={t('auth.phone')}
              placeholder={t('auth.phone')}
              value={formData.phone}
              onChangeText={(value) => updateField('phone', value)}
              keyboardType="phone-pad"
              autoComplete="off"
              icon="call-outline"
              error={errors.phone}
            />

            <Input
              label={t('auth.password')}
              placeholder={t('auth.password')}
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
              autoComplete="off"
              icon="lock-closed-outline"
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry
              autoComplete="off"
              icon="lock-closed-outline"
              error={errors.confirmPassword}
            />

            <Button
              title={t('auth.signUp')}
              onPress={handleSignUp}
              loading={loading}
              loadingText={t('auth.signupLoading')}
              style={styles.signUpButton}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: theme.spacing.md,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.large,
  },
  signUpButton: {
    marginTop: theme.spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  loginText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  // Verification screen styles
  verificationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  verificationInfo: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadows.large,
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  verificationText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 24,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  verificationActions: {
    marginTop: theme.spacing.xl,
    width: '100%',
  },
  loginButton: {
    marginBottom: theme.spacing.md,
  },
  backButton: {
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
