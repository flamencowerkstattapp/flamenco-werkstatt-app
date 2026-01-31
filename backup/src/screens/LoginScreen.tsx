import React, { useState, useEffect } from 'react';
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
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { validateEmail } from '../utils/validation';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const { signIn } = useAuth();

  // Clear errors when component mounts
  useEffect(() => {
    setErrors({});
  }, []);

  const updateField = (field: 'email' | 'password', value: string) => {
    // Clear all errors when user starts typing
    if (errors.email || errors.password || errors.general) {
      setErrors({});
    }
    
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }
  };

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = t('common.required');
    } else if (!validateEmail(email)) {
      newErrors.email = t('errors.invalidCredentials');
    }

    if (!password) {
      newErrors.password = t('common.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    // Clear previous errors
    setErrors({});

    try {
      await signIn(email, password);
      
      // Clear all errors on successful login
      setErrors({});
      
      // Show success feedback
      Alert.alert(
        t('auth.loginSuccessTitle'),
        t('auth.loginSuccessBody'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              // Navigation will be handled by AuthContext
            },
          },
        ]
      );
    } catch (error: any) {
      let title = t('common.error');
      let message = t('errors.general');
      let fieldError: { email?: string; password?: string; general?: string } = {};

      // Handle specific error messages
      switch (error.message) {
        case 'USER_NOT_FOUND':
          title = t('errors.userNotFoundTitle');
          message = t('errors.userNotFoundMessage');
          fieldError.email = t('errors.userNotFound');
          break;
        case 'WRONG_PASSWORD':
          title = t('errors.wrongPasswordTitle');
          message = t('errors.wrongPasswordMessage');
          fieldError.password = t('errors.wrongPassword');
          break;
        case 'INVALID_CREDENTIAL':
          title = t('errors.invalidCredentialTitle');
          message = t('errors.invalidCredentialMessage');
          fieldError.general = t('errors.invalidCredential');
          break;
        case 'INVALID_EMAIL':
          title = t('errors.invalidEmailTitle');
          message = t('errors.invalidEmailMessage');
          fieldError.email = t('errors.invalidEmail');
          break;
        case 'USER_DISABLED':
          title = t('errors.userDisabledTitle');
          message = t('errors.userDisabledMessage');
          fieldError.general = t('errors.userDisabled');
          break;
        case 'TOO_MANY_REQUESTS':
          title = t('errors.tooManyRequestsTitle');
          message = t('errors.tooManyRequestsMessage');
          fieldError.general = t('errors.tooManyRequests');
          break;
        case 'EMAIL_NOT_VERIFIED':
          title = t('errors.emailNotVerifiedTitle');
          message = t('errors.emailNotVerifiedMessage');
          fieldError.general = t('errors.emailNotVerified');
          break;
        case 'NETWORK_ERROR':
          title = t('errors.networkErrorTitle');
          message = t('errors.networkErrorMessage');
          fieldError.general = t('errors.networkError');
          break;
        default:
          message = error.message || t('errors.general');
          fieldError.general = t('errors.loginFailed');
          break;
      }

      // Set inline errors
      setErrors(fieldError);
      
      // Also show alert for more detailed message
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

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
            <View style={styles.languageSwitcherContainer}>
              <LanguageSwitcher variant="light" />
            </View>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>{t('common.appName')}</Text>
            <Text style={styles.subtitle}>{t('common.welcome')}</Text>
          </View>

          <View style={styles.formContainer}>
            {/* General error message */}
            {errors.general && (
              <View style={styles.generalErrorContainer}>
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            <Input
              label={t('auth.email')}
              placeholder={t('auth.email')}
              value={email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="off"
              icon="mail-outline"
              error={errors.email}
            />

            <Input
              label={t('auth.password')}
              placeholder={t('auth.password')}
              value={password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
              autoComplete="off"
              icon="lock-closed-outline"
              error={errors.password}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            <Button
              title={t('auth.signIn')}
              onPress={handleLogin}
              loading={loading}
              loadingText={t('auth.loginLoading')}
              style={styles.loginButton}
            />

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>{t('auth.dontHaveAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signupLink}>{t('auth.signUp')}</Text>
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
    marginBottom: theme.spacing.xxl,
  },
  languageSwitcherContainer: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: theme.spacing.md,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  formContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.large,
  },
  generalErrorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  generalErrorText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  loginButton: {
    marginTop: theme.spacing.md,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  signupText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
});
