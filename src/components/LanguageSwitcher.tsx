import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { setLocale, getLocale } from '../locales';

const LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

interface LanguageSwitcherProps {
  variant?: 'default' | 'light';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'default' }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(getLocale());
  const [forceUpdate, setForceUpdate] = useState(0);

  const handleLanguageChange = (languageCode: string) => {
    setLocale(languageCode as 'de' | 'en' | 'es');
    setCurrentLocale(languageCode);
    setModalVisible(false);
    
    // Force re-render
    setForceUpdate(prev => prev + 1);
    
    // For web, reload the page
    if (Platform.OS === 'web') {
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  useEffect(() => {
    // Update current locale when it changes
    setCurrentLocale(getLocale());
  }, [forceUpdate]);

  const currentLanguage = LANGUAGES.find(lang => lang.code === currentLocale) || LANGUAGES[0];

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.button,
          variant === 'light' && styles.buttonLight
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.flag}>{currentLanguage.flag}</Text>
        <Text style={[
          styles.code,
          variant === 'light' && styles.codeLight
        ]}>
          {currentLanguage.code.toUpperCase()}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={16} 
          color={variant === 'light' ? '#FFFFFF' : theme.colors.text} 
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Image source={require('../../assets/logo.png')} style={styles.modalLogo} />
            <Text style={styles.modalTitle}>Select Language</Text>
            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  currentLocale === language.code && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageChange(language.code)}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={styles.languageName}>{language.name}</Text>
                {currentLocale === language.code && (
                  <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    ...theme.shadows.small,
  },
  buttonLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  flag: {
    fontSize: 20,
  },
  code: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  codeLight: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    minWidth: 250,
    ...theme.shadows.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  modalLogo: {
    width: 60,
    height: 60,
    marginBottom: theme.spacing.md,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  languageOptionActive: {
    backgroundColor: theme.colors.border,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
});
