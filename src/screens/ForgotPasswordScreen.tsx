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
import { theme } from '../constants/theme';
import { t } from '../locales';
import { validateEmail } from '../utils/validation';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    setError('');

    if (!email) {
      setError(t('auth.emailRequired'));
      return;
    }

    if (!validateEmail(email)) {
      setError(t('errors.invalidEmail'));
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email);
      
      Alert.alert(
        t('auth.resetPasswordSuccessTitle'),
        t('auth.resetPasswordSuccessMessage') + '\n\nCheck your spam/junk folder if you don\'t see the email.',
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      let errorMessage = t('auth.resetPasswordError');
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = t('errors.userNotFound');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('errors.invalidEmail');
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = t('errors.tooManyRequests');
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = t('errors.networkError');
      }
      
      setError(errorMessage);
      Alert.alert(t('common.error'), errorMessage);
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
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>{t('auth.resetPassword')}</Text>
            <Text style={styles.subtitle}>{t('auth.resetPasswordInstructions')}</Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="off"
              icon="mail-outline"
              error={error}
            />

            <Button
              title={t('auth.sendResetLink')}
              onPress={handleResetPassword}
              loading={loading}
              loadingText={t('auth.sendingResetLink')}
              style={styles.resetButton}
            />

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backToLogin}
            >
              <Text style={styles.backToLoginText}>{t('auth.backToLogin')}</Text>
            </TouchableOpacity>
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
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: theme.spacing.lg,
    borderRadius: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.white,
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: theme.spacing.md,
  },
  formContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  resetButton: {
    marginTop: theme.spacing.md,
  },
  backToLogin: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  backToLoginText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
