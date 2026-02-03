import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomDateTimePicker } from './DateTimePicker';
import { Input } from './Input';
import { Button } from './Button';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { Booking, StudioType } from '../types';
import { STUDIOS } from '../constants/studios';

interface EditBookingModalProps {
  visible: boolean;
  booking: Booking;
  onClose: () => void;
  onSave: (updatedBooking: Partial<Booking>) => Promise<void>;
}

const { width: screenWidth } = Dimensions.get('window');

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  visible,
  booking,
  onClose,
  onSave,
}) => {
  const [startTime, setStartTime] = useState<Date>(booking.startTime);
  const [endTime, setEndTime] = useState<Date>(booking.endTime);
  const [purpose, setPurpose] = useState(booking.purpose || '');
  const [selectedStudio, setSelectedStudio] = useState<StudioType>(booking.studioId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setStartTime(booking.startTime);
      setEndTime(booking.endTime);
      setPurpose(booking.purpose || '');
      setSelectedStudio(booking.studioId);
    }
  }, [visible, booking]);

  const handleSave = async () => {
    if (endTime <= startTime) {
      Alert.alert(t('common.error'), 'End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        startTime,
        endTime,
        purpose: purpose.trim(),
        studioId: selectedStudio,
      });
      onClose();
    } catch (error) {
      console.error('Error saving booking:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setSaving(false);
    }
  };

  const studios = [
    { id: 'studio-1-big' as StudioType, ...STUDIOS.BIG },
    { id: 'studio-2-small' as StudioType, ...STUDIOS.SMALL },
    { id: 'offsite' as StudioType, ...STUDIOS.OFFSITE },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('calendar.editBooking')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('calendar.studio')}</Text>
              {studios.map((studio) => (
                <TouchableOpacity
                  key={studio.id}
                  style={[
                    styles.studioOption,
                    selectedStudio === studio.id && styles.studioOptionSelected,
                  ]}
                  onPress={() => setSelectedStudio(studio.id)}
                >
                  <View style={[styles.studioColorIndicator, { backgroundColor: studio.color }]} />
                  <Text
                    style={[
                      styles.studioOptionText,
                      selectedStudio === studio.id && styles.studioOptionTextSelected,
                    ]}
                  >
                    {studio.name}
                  </Text>
                  {selectedStudio === studio.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <CustomDateTimePicker
                label={t('calendar.startTime')}
                value={startTime}
                onChange={setStartTime}
                mode="datetime"
                icon="calendar-outline"
              />
            </View>

            <View style={styles.section}>
              <CustomDateTimePicker
                label={t('calendar.endTime')}
                value={endTime}
                onChange={setEndTime}
                mode="datetime"
                icon="calendar-outline"
                minimumDate={startTime}
              />
            </View>

            <View style={styles.section}>
              <Input
                label={t('calendar.purpose')}
                value={purpose}
                onChangeText={setPurpose}
                placeholder={t('calendar.purposePlaceholder')}
                icon="document-text-outline"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              onPress={onClose}
              variant="secondary"
              style={styles.actionButton}
            />
            <Button
              title={t('common.save')}
              onPress={handleSave}
              loading={saving}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: Math.min(screenWidth * 0.95, 500),
    maxHeight: '90%',
    ...theme.shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  content: {
    padding: theme.spacing.lg,
    maxHeight: 500,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  studioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  studioOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  studioColorIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: theme.spacing.md,
  },
  studioOptionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  studioOptionTextSelected: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
});
