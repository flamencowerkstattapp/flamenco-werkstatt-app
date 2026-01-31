import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ConfirmModal } from './ConfirmModal';
import { theme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../locales';

interface AppHeaderProps {
  title?: string;
  showLogo?: boolean;
  showComposeButton?: boolean;
  onComposePress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  title, 
  showLogo = true, 
  showComposeButton = false, 
  onComposePress 
}) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [isVeryNarrowScreen, setIsVeryNarrowScreen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const onChange = (result: { window: { width: number } }) => {
      const { width } = result.window;
      setScreenWidth(width);
      setIsNarrowScreen(width < 380); // Threshold for narrow screens
      setIsVeryNarrowScreen(width < 320); // Threshold for very narrow screens
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    
    // Set initial value
    setIsNarrowScreen(screenWidth < 380);
    setIsVeryNarrowScreen(screenWidth < 320);

    return () => subscription?.remove();
  }, [screenWidth]);

  const handleLogoPress = () => {
    // Navigate to Calendar as the home page
    navigation.navigate('Calendar' as never);
  };

  const handleLogout = () => {
    const confirmAndLogout = async () => {
      try {
        await logout();
        setShowLogoutModal(false);
      } catch (err) {
        Alert.alert(t('common.error'), t('errors.general'));
        setShowLogoutModal(false);
      }
    };

    if (Platform.OS === 'web') {
      // Use custom modal for web
      setShowLogoutModal(true);
      return;
    }

    // Use Alert for mobile platforms
    Alert.alert(t('common.logoutConfirmTitle'), t('common.logoutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: async () => {
          await confirmAndLogout();
        },
      },
    ]);
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {showLogo && !isNarrowScreen && (
          <TouchableOpacity onPress={handleLogoPress} style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        {title && (
          <Text 
            style={[
              styles.title, 
              isNarrowScreen && styles.titleCompact,
              isNarrowScreen && showLogo && styles.titleWithLogo
            ]} 
            numberOfLines={isNarrowScreen ? 1 : 2}
          >
            {title}
          </Text>
        )}
      </View>
      <View style={[styles.rightSection, isVeryNarrowScreen && styles.rightSectionCompact]}>
        {showComposeButton && onComposePress && !isVeryNarrowScreen && (
          <TouchableOpacity 
            style={[
              styles.composeButton,
              isNarrowScreen && styles.composeButtonCompact
            ]} 
            onPress={onComposePress}
          >
            <Ionicons name="create" size={isNarrowScreen ? 18 : 20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {user && (
          <TouchableOpacity 
            style={[
              styles.iconButton,
              isNarrowScreen && styles.iconButtonCompact
            ]} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={isNarrowScreen ? 20 : 22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {!isNarrowScreen && <LanguageSwitcher />}
      </View>
      
      <ConfirmModal
        visible={showLogoutModal}
        title={t('common.logoutConfirmTitle')}
        message={t('common.logoutConfirmMessage')}
        confirmText={t('common.logout')}
        cancelText={t('common.cancel')}
        onConfirm={async () => {
          try {
            await logout();
            setShowLogoutModal(false);
          } catch (err) {
            Alert.alert(t('common.error'), t('errors.general'));
            setShowLogoutModal(false);
          }
        }}
        onCancel={() => setShowLogoutModal(false)}
        destructive={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.medium,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rightSectionCompact: {
    gap: theme.spacing.xs,
  },
  logoContainer: {
    // Add subtle visual feedback for touch
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  titleCompact: {
    fontSize: 16,
  },
  titleWithLogo: {
    marginLeft: theme.spacing.sm,
  },
  composeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
