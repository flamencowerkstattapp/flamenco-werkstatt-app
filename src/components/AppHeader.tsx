import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ConfirmModal } from './ConfirmModal';
import { NotificationBadge } from './NotificationBadge';
import { NotificationCenter } from './NotificationCenter';
import { theme } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
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
  const { unreadCount } = useNotifications();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [isVeryNarrowScreen, setIsVeryNarrowScreen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  useEffect(() => {
    const onChange = (result: { window: { width: number } }) => {
      const { width } = result.window;
      setScreenWidth(width);
      setIsNarrowScreen(width < 380); // Threshold for narrow screens
      setIsVeryNarrowScreen(width <= 360); // Threshold for very narrow screens (6cm)
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    
    // Set initial value
    setIsNarrowScreen(screenWidth < 380);
    setIsVeryNarrowScreen(screenWidth <= 360);

    return () => subscription?.remove();
  }, [screenWidth]);

  const handleLogoPress = () => {
    // Navigate to Calendar as the home page
    navigation.navigate('Calendar' as never);
  };

  const handleNotificationNavigate = (type: string, referenceId?: string) => {
    if (!referenceId) return;

    switch (type) {
      case 'message':
        navigation.navigate('Messages' as never, { screen: 'MessageDetails', params: { messageId: referenceId } } as never);
        break;
      case 'news':
        navigation.navigate('News' as never, { screen: 'NewsDetails', params: { newsId: referenceId } } as never);
        break;
      case 'event':
        navigation.navigate('Events' as never, { screen: 'EventDetails', params: { eventId: referenceId } } as never);
        break;
      default:
        break;
    }
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
              isNarrowScreen && styles.composeButtonCompact,
              isVeryNarrowScreen && styles.composeButtonVeryCompact
            ]} 
            onPress={onComposePress}
          >
            <Ionicons name="create" size={isVeryNarrowScreen ? 16 : isNarrowScreen ? 18 : 20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {user && (
          <View style={[styles.notificationButtonContainer, isVeryNarrowScreen && styles.buttonSpacingCompact]}>
            <TouchableOpacity 
              style={[
                styles.iconButton,
                isNarrowScreen && styles.iconButtonCompact,
                isVeryNarrowScreen && styles.iconButtonVeryCompact
              ]} 
              onPress={() => setShowNotificationCenter(true)}
            >
              <Ionicons name="notifications-outline" size={isVeryNarrowScreen ? 18 : isNarrowScreen ? 20 : 22} color="#FFFFFF" />
            </TouchableOpacity>
            {unreadCount > 0 && (
              <NotificationBadge 
                count={unreadCount} 
                size="small" 
                style={styles.notificationBadge}
              />
            )}
          </View>
        )}
        {user && (
          <TouchableOpacity 
            style={[
              styles.iconButton,
              isNarrowScreen && styles.iconButtonCompact,
              isVeryNarrowScreen && styles.iconButtonVeryCompact,
              isVeryNarrowScreen && styles.buttonSpacingCompact
            ]} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={isVeryNarrowScreen ? 18 : isNarrowScreen ? 20 : 22} color="#FFFFFF" />
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

      <NotificationCenter
        visible={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        onNavigate={handleNotificationNavigate}
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
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSectionCompact: {
    marginLeft: theme.spacing.xs,
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
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  titleCompact: {
    fontSize: 16,
    marginLeft: theme.spacing.xs,
  },
  titleWithLogo: {
    marginLeft: theme.spacing.xs,
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
  composeButtonVeryCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  iconButtonVeryCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  buttonSpacingCompact: {
    marginLeft: 4,
  },
  notificationButtonContainer: {
    position: 'relative',
    marginLeft: theme.spacing.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});
