import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from './Input';
import { parseTimeInput } from '../utils/dateUtils';
import { theme } from '../constants/theme';
import { t } from '../locales';

interface DateTimePickerProps {
  label: string;
  value?: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  icon?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
}

export const CustomDateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  mode = 'datetime',
  minimumDate,
  maximumDate,
  icon = 'calendar-outline',
  placeholder = t('events.selectDateTime'),
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());
  const [tempTime, setTempTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [dateInput, setDateInput] = useState('');

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Initialize time when modal opens
  const handlePress = () => {
    setTempDate(value || new Date());
    // Format current time as HH:MM for display
    const currentTime = value || new Date();
    const formattedTime = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    setTempTime(formattedTime);
    setTimeError('');
    // Initialize date input in YYYY-MM-DD format
    const currentDate = value || new Date();
    const formattedDate = currentDate.toISOString().split('T')[0];
    setDateInput(formattedDate);
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (mode === 'datetime') {
      // Parse and validate time
      const parsedTime = parseTimeInput(tempTime);
      if (!parsedTime) {
        setTimeError(t('events.timeFormats'));
        return;
      }
      
      // Combine date and time
      const [hours, minutes] = parsedTime.split(':').map(Number);
      const combinedDate = new Date(tempDate);
      combinedDate.setHours(hours, minutes);
      onChange(combinedDate);
    } else if (mode === 'date') {
      onChange(tempDate);
    } else if (mode === 'time') {
      const parsedTime = parseTimeInput(tempTime);
      if (!parsedTime) {
        setTimeError(t('events.timeFormats'));
        return;
      }
      
      const [hours, minutes] = parsedTime.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes);
      onChange(timeDate);
    }
    setShowModal(false);
  };

  const handleTimeChange = (text: string) => {
    setTempTime(text);
    // Clear error when user types
    if (timeError) {
      setTimeError('');
    }
  };

  const handleTimeBlur = () => {
    if (tempTime) {
      const parsed = parseTimeInput(tempTime);
      if (parsed) {
        setTempTime(parsed);
        setTimeError('');
      } else {
        setTimeError('Invalid time format. Use HH:MM, 5 pm, or similar.');
      }
    }
  };

  const handleDateChange = (text: string) => {
    setDateInput(text);
    // Parse and update date when user types
    // Try multiple date formats
    let parsedDate: Date | null = null;
    
    // Try YYYY-MM-DD format
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1; // JS months are 0-indexed
      const day = parseInt(isoMatch[3]);
      parsedDate = new Date(year, month, day);
    }
    
    // Try DD.MM.YYYY format
    const dmyMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1]);
      const month = parseInt(dmyMatch[2]) - 1;
      const year = parseInt(dmyMatch[3]);
      parsedDate = new Date(year, month, day);
    }
    
    // Try MM/DD/YYYY format
    const mdyMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (mdyMatch) {
      const month = parseInt(mdyMatch[1]) - 1;
      const day = parseInt(mdyMatch[2]);
      const year = parseInt(mdyMatch[3]);
      parsedDate = new Date(year, month, day);
    }
    
    // Try DD/MM/YYYY format
    const dmySlashMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmySlashMatch && !mdyMatch) {
      const day = parseInt(dmySlashMatch[1]);
      const month = parseInt(dmySlashMatch[2]) - 1;
      const year = parseInt(dmySlashMatch[3]);
      parsedDate = new Date(year, month, day);
    }
    
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      setTempDate(parsedDate);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={handlePress}>
        <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
        <Text style={styles.pickerText}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        transparent={true}
        animationType="slide"
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Image source={require('../../assets/logo.png')} style={styles.modalLogo} />
              <Text style={styles.pickerTitle}>
                {mode === 'datetime' ? t('events.selectDateAndTime') : mode === 'date' ? t('events.selectDate') : t('events.selectTime')}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerContent}>
              {(mode === 'date' || mode === 'datetime') && (
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>{t('events.date')}</Text>
                  <Input
                    value={dateInput}
                    onChangeText={handleDateChange}
                    placeholder="e.g., 2024-01-15, 15.01.2024, 15/01/2024"
                    icon="calendar-outline"
                  />
                  <View style={styles.quickDateButtons}>
                    <TouchableOpacity
                      style={styles.quickDateButton}
                      onPress={() => {
                        const today = new Date();
                        const formatted = today.toISOString().split('T')[0];
                        setDateInput(formatted);
                        setTempDate(today);
                      }}
                    >
                      <Text style={styles.quickDateButtonText}>{t('events.today')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickDateButton}
                      onPress={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const formatted = tomorrow.toISOString().split('T')[0];
                        setDateInput(formatted);
                        setTempDate(tomorrow);
                      }}
                    >
                      <Text style={styles.quickDateButtonText}>{t('events.tomorrow')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickDateButton}
                      onPress={() => {
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        const formatted = nextWeek.toISOString().split('T')[0];
                        setDateInput(formatted);
                        setTempDate(nextWeek);
                      }}
                    >
                      <Text style={styles.quickDateButtonText}>{t('events.nextWeek')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {(mode === 'time' || mode === 'datetime') && (
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>{t('events.time')}</Text>
                  <Input
                    value={tempTime}
                    onChangeText={handleTimeChange}
                    onBlur={handleTimeBlur}
                    placeholder="e.g., 16:00, 4pm, 16,00"
                    icon="time-outline"
                    error={timeError}
                  />
                </View>
              )}
            </View>

            <View style={styles.pickerActions}>
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
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingBottom: theme.spacing.lg,
  },
  pickerHeader: {
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
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  pickerContent: {
    padding: theme.spacing.md,
  },
  inputSection: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  quickDateButtons: {
    flexDirection: 'row',    marginTop: theme.spacing.sm,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  quickDateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,  },
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
