import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { t } from '../locales';

interface LocationToggleProps {
  isOnsite: boolean;
  onChange: (isOnsite: boolean, location?: string) => void;
  currentLocation?: string;
}

export const LocationToggle: React.FC<LocationToggleProps> = ({
  isOnsite,
  onChange,
  currentLocation,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempOnsite, setTempOnsite] = useState(isOnsite);
  const [tempLocation, setTempLocation] = useState(currentLocation || '');

  const handlePress = () => {
    setTempOnsite(isOnsite);
    // Set default to Big Studio if on-site and no location is set
    setTempLocation(currentLocation || (isOnsite ? 'Big Studio' : ''));
    setShowModal(true);
  };

  const handleConfirm = () => {
    // Ensure a studio is selected for on-site events
    const finalLocation = tempOnsite ? (tempLocation || 'Big Studio') : undefined;
    onChange(tempOnsite, finalLocation);
    setShowModal(false);
  };

  const getDisplayText = () => {
    if (isOnsite) {
      return currentLocation ? `${t('events.onsite')}: ${currentLocation}` : t('events.onsiteLocation');
    }
    return t('events.offsiteEvent');
  };

  const getDisplayIcon = () => {
    return isOnsite ? 'location-outline' : 'airplane-outline';
  };

  const getDisplayColor = () => {
    return isOnsite ? theme.colors.success : theme.colors.warning;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggleButton} onPress={handlePress}>
        <Ionicons name={getDisplayIcon()} size={20} color={getDisplayColor()} />
        <Text style={styles.toggleText}>{getDisplayText()}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Image source={require('../../assets/logo.png')} style={styles.modalLogo} />
            <Text style={styles.modalTitle}>{t('events.eventLocation')}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('events.locationType')}</Text>
              <View style={styles.locationOptions}>
                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    tempOnsite && styles.locationOptionActive,
                    { borderLeftColor: tempOnsite ? theme.colors.success : theme.colors.border },
                  ]}
                  onPress={() => setTempOnsite(true)}
                >
                  <View style={styles.optionHeader}>
                    <Ionicons 
                      name="location-outline" 
                      size={24} 
                      color={tempOnsite ? theme.colors.success : theme.colors.textSecondary} 
                    />
                    <View style={styles.optionContent}>
                      <Text style={[
                        styles.optionTitle,
                        tempOnsite && styles.optionTitleActive,
                      ]}>
                        {t('events.onsiteLocation')}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {t('events.onsiteDescription')}
                      </Text>
                    </View>
                    <View style={[
                      styles.radioButton,
                      tempOnsite && styles.radioButtonActive,
                    ]}>
                      {tempOnsite && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationOption,
                    !tempOnsite && styles.locationOptionActive,
                    { borderLeftColor: !tempOnsite ? theme.colors.warning : theme.colors.border },
                  ]}
                  onPress={() => setTempOnsite(false)}
                >
                  <View style={styles.optionHeader}>
                    <Ionicons 
                      name="airplane-outline" 
                      size={24} 
                      color={!tempOnsite ? theme.colors.warning : theme.colors.textSecondary} 
                    />
                    <View style={styles.optionContent}>
                      <Text style={[
                        styles.optionTitle,
                        !tempOnsite && styles.optionTitleActive,
                      ]}>
                        {t('events.offsiteEvent')}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {t('events.offsiteDescription')}
                      </Text>
                    </View>
                    <View style={[
                      styles.radioButton,
                      !tempOnsite && styles.radioButtonActive,
                    ]}>
                      {!tempOnsite && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {tempOnsite && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('events.selectStudio')}</Text>
                <Text style={styles.sectionDescription}>
                  {t('events.chooseStudio')}
                </Text>
                <View style={styles.studioOptions}>
                  <TouchableOpacity
                    style={[
                      styles.studioButton,
                      tempLocation === 'Big Studio' && styles.studioButtonActive,
                    ]}
                    onPress={() => setTempLocation('Big Studio')}
                  >
                    <Ionicons 
                      name="business-outline" 
                      size={24} 
                      color={tempLocation === 'Big Studio' ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <View style={styles.studioButtonContent}>
                      <Text style={[
                        styles.studioButtonTitle,
                        tempLocation === 'Big Studio' && styles.studioButtonTitleActive,
                      ]}>
                        {t('events.bigStudio')}
                      </Text>
                      <Text style={styles.studioButtonDescription}>
                        {t('events.bigStudioDescription')}
                      </Text>
                    </View>
                    {tempLocation === 'Big Studio' && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.studioButton,
                      tempLocation === 'Small Studio' && styles.studioButtonActive,
                    ]}
                    onPress={() => setTempLocation('Small Studio')}
                  >
                    <Ionicons 
                      name="home-outline" 
                      size={24} 
                      color={tempLocation === 'Small Studio' ? theme.colors.primary : theme.colors.textSecondary} 
                    />
                    <View style={styles.studioButtonContent}>
                      <Text style={[
                        styles.studioButtonTitle,
                        tempLocation === 'Small Studio' && styles.studioButtonTitleActive,
                      ]}>
                        {t('events.smallStudio')}
                      </Text>
                      <Text style={styles.studioButtonDescription}>
                        {t('events.smallStudioDescription')}
                      </Text>
                    </View>
                    {tempLocation === 'Small Studio' && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!tempOnsite && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('events.offsiteInformation')}</Text>
                <Text style={styles.sectionDescription}>
                  {t('events.offsiteCalendarNote')}
                </Text>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoText}>
                      {t('events.offsiteCalendarInfo')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,  },
  toggleText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  locationOptions: {  },
  locationOption: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  locationOptionActive: {
    borderColor: theme.colors.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionTitleActive: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: theme.colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  studioOptions: {  },
  studioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,  },
  studioButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0F7FF',
  },
  studioButtonContent: {
    flex: 1,
  },
  studioButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  studioButtonTitleActive: {
    color: theme.colors.primary,
  },
  studioButtonDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
  },
  modalActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
