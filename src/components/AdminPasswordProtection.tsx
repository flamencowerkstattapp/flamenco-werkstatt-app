import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { t } from '../locales';

interface AdminPasswordProtectionProps {
  onAuthenticated: () => void;
}

const ADMIN_PASSWORD = 'Flamencowerkstatt2026@'; // Change this to your desired admin password

// Persistent storage using localStorage for web and AsyncStorage for mobile
const persistentStorageGetItem = async (key: string): Promise<string | null> => {
  try {
    // Check if we're in a web environment
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    // For mobile, we'd use AsyncStorage, but for now fallback to memory
    return null;
  } catch (error) {
    console.error('Error getting persistent storage:', error);
    return null;
  }
};

const persistentStorageSetItem = async (key: string, value: string): Promise<void> => {
  try {
    // Check if we're in a web environment
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
    // For mobile, we'd use AsyncStorage here
  } catch (error) {
    console.error('Error setting persistent storage:', error);
  }
};

const persistentStorageRemoveItem = async (key: string): Promise<void> => {
  try {
    // Check if we're in a web environment
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
    // For mobile, we'd use AsyncStorage here
  } catch (error) {
    console.error('Error removing persistent storage:', error);
  }
};

// Export logout function for use in AdminDashboard
export const adminLogout = async (): Promise<void> => {
  try {
    await persistentStorageRemoveItem('adminAuthenticated');
    await persistentStorageRemoveItem('adminAttempts');
    await persistentStorageRemoveItem('adminBlockUntil');
  } catch (error) {
    console.error('Error during admin logout:', error);
  }
};

export const AdminPasswordProtection: React.FC<AdminPasswordProtectionProps> = ({
  onAuthenticated,
}) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);

  useEffect(() => {
    // Check authentication and block status on component mount
    const checkAuthStatus = async () => {
      try {
        // Check if admin is already authenticated
        const isAuthenticated = await persistentStorageGetItem('adminAuthenticated');
        if (isAuthenticated === 'true') {
          onAuthenticated();
          return;
        }

        // Check if user is blocked due to too many failed attempts
        const blockTime = await persistentStorageGetItem('adminBlockUntil');
        if (blockTime) {
          const blockDate = new Date(blockTime);
          if (blockDate > new Date()) {
            setBlockedUntil(blockDate);
          } else {
            await persistentStorageRemoveItem('adminBlockUntil');
          }
        }

        // Load failed attempts
        const attemptsStr = await persistentStorageGetItem('adminAttempts');
        if (attemptsStr) {
          setAttempts(parseInt(attemptsStr, 10));
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };
    
    checkAuthStatus();
  }, [onAuthenticated]);

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      Alert.alert(t('common.error'), t('auth.passwordRequired'));
      return;
    }

    // Check if user is blocked
    if (blockedUntil && blockedUntil > new Date()) {
      const remainingTime = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000 / 60);
      Alert.alert(
        t('common.error'),
        t('admin.tooManyAttempts', { minutes: remainingTime })
      );
      return;
    }

    setIsLoading(true);

    // Simulate verification delay
    setTimeout(async () => {
      if (password === ADMIN_PASSWORD) {
        // Reset attempts on successful login and set persistent auth
        setAttempts(0);
        try {
          await persistentStorageRemoveItem('adminAttempts');
          await persistentStorageRemoveItem('adminBlockUntil');
          await persistentStorageSetItem('adminAuthenticated', 'true');
        } catch (error) {
          console.error('Error setting auth data:', error);
        }
        onAuthenticated();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        try {
          await persistentStorageSetItem('adminAttempts', newAttempts.toString());
        } catch (error) {
          console.error('Error saving attempts:', error);
        }

        // Block user after 3 failed attempts for 5 minutes
        if (newAttempts >= 3) {
          const blockUntil = new Date(Date.now() + 5 * 60 * 1000);
          setBlockedUntil(blockUntil);
          try {
            await persistentStorageSetItem('adminBlockUntil', blockUntil.toISOString());
          } catch (error) {
            console.error('Error setting block:', error);
          }
          Alert.alert(
            t('common.error'),
            t('admin.accountBlocked', { minutes: 5 })
          );
        } else {
          const remainingAttempts = 3 - newAttempts;
          Alert.alert(
            t('common.error'),
            t('admin.incorrectPassword', { remaining: remainingAttempts })
          );
        }
        setPassword('');
      }
      setIsLoading(false);
    }, 1000);
  };

  const getRemainingBlockTime = () => {
    if (!blockedUntil) return 0;
    return Math.ceil((blockedUntil.getTime() - Date.now()) / 1000 / 60);
  };

  if (blockedUntil && blockedUntil > new Date()) {
    return (
      <View style={styles.container}>
        <View style={styles.blockedContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.colors.error} />
          <Text style={styles.blockedTitle}>{t('admin.accessBlocked')}</Text>
          <Text style={styles.blockedMessage}>
            {t('admin.tryAgainLater', { minutes: getRemainingBlockTime() })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <Ionicons name="shield-checkmark" size={64} color={theme.colors.primary} />
          <Text style={styles.title}>{t('admin.adminAccess')}</Text>
          <Text style={styles.subtitle}>{t('admin.passwordRequired')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('admin.enterPassword')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handlePasswordSubmit}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? t('common.verifying') : t('admin.signIn')}
            </Text>
          </TouchableOpacity>

          {attempts > 0 && (
            <Text style={styles.attemptsText}>
              {t('admin.failedAttempts', { count: attempts, remaining: 3 - attempts })}
            </Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: theme.spacing.md,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  eyeIcon: {
    padding: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  attemptsText: {
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontSize: 14,
    color: theme.colors.warning,
  },
  blockedContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  blockedMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
