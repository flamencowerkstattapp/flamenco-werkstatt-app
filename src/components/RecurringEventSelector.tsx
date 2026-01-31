import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { theme } from '../constants/theme';
import { RecurringPattern } from '../types';
import { t } from '../locales';

interface RecurringEventSelectorProps {
  value?: RecurringPattern;
  onChange: (pattern: RecurringPattern | undefined) => void;
}

export const RecurringEventSelector: React.FC<RecurringEventSelectorProps> = ({
  value,
  onChange,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempPattern, setTempPattern] = useState<RecurringPattern>({
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [1], // Monday by default
  });

  const weekDays = [
    { label: t('events.monday'), value: 1 },
    { label: t('events.tuesday'), value: 2 },
    { label: t('events.wednesday'), value: 3 },
    { label: t('events.thursday'), value: 4 },
    { label: t('events.friday'), value: 5 },
    { label: t('events.saturday'), value: 6 },
    { label: t('events.sunday'), value: 0 },
  ];

  const handlePress = () => {
    setTempPattern(value || {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [1],
    });
    setShowModal(true);
  };

  const handleConfirm = () => {
    onChange(tempPattern);
    setShowModal(false);
  };

  const handleRemove = () => {
    onChange(undefined);
    setShowModal(false);
  };

  const toggleDay = (day: number) => {
    setTempPattern(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek?.includes(day)
        ? prev.daysOfWeek?.filter(d => d !== day)
        : [...(prev.daysOfWeek || []), day],
    }));
  };

  const getDisplayText = () => {
    if (!value) return t('events.setRecurringPattern');
    
    const { frequency, interval, daysOfWeek } = value;
    let text = `Every ${interval > 1 ? interval : ''}`;
    
    switch (frequency) {
      case 'daily':
        text += interval > 1 ? ` ${t('events.days')}` : ` ${t('events.day')}`;
        break;
      case 'weekly':
        text += interval > 1 ? ` ${t('events.weeks')}` : ` ${t('events.week')}`;
        if (daysOfWeek && daysOfWeek.length > 0) {
          const dayNames = daysOfWeek.map(day => weekDays.find(d => d.value === day)?.label).filter(Boolean);
          text += ` on ${dayNames.join(', ')}`;
        }
        break;
      case 'monthly':
        text += interval > 1 ? ` ${t('events.months')}` : ` ${t('events.month')}`;
        break;
    }
    
    return text;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.selectorButton} onPress={handlePress}>
        <Ionicons name="repeat-outline" size={20} color={theme.colors.textSecondary} />
        <Text style={styles.selectorText}>{getDisplayText()}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {value && (
        <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
          <Ionicons name="remove-circle-outline" size={16} color={theme.colors.error} />
          <Text style={styles.removeText}>{t('events.removeRecurring')}</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Image source={require('../../assets/logo.png')} style={styles.modalLogo} />
            <Text style={styles.modalTitle}>{t('events.recurringPattern')}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('events.frequency')}</Text>
              <View style={styles.frequencyOptions}>
                {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      tempPattern.frequency === freq && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setTempPattern(prev => ({ ...prev, frequency: freq }))}
                  >
                    <Text style={[
                      styles.frequencyText,
                      tempPattern.frequency === freq && styles.frequencyTextActive,
                    ]}>
                      {t(`events.${freq}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('events.interval')}</Text>
              <Text style={styles.intervalDescription}>
                Repeat every {tempPattern.interval} {tempPattern.frequency}
                {tempPattern.interval > 1 ? 's' : ''}
              </Text>
              <View style={styles.intervalControls}>
                <TouchableOpacity
                  style={styles.intervalButton}
                  onPress={() => setTempPattern(prev => ({ 
                    ...prev, 
                    interval: Math.max(1, prev.interval - 1) 
                  }))}
                >
                  <Ionicons name="remove" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.intervalValue}>{tempPattern.interval}</Text>
                <TouchableOpacity
                  style={styles.intervalButton}
                  onPress={() => setTempPattern(prev => ({ 
                    ...prev, 
                    interval: Math.min(12, prev.interval + 1) 
                  }))}
                >
                  <Ionicons name="add" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {tempPattern.frequency === 'weekly' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('events.daysOfWeek')}</Text>
                <View style={styles.daysGrid}>
                  {weekDays.map(day => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayButton,
                        tempPattern.daysOfWeek?.includes(day.value) && styles.dayButtonActive,
                      ]}
                      onPress={() => toggleDay(day.value)}
                    >
                      <Text style={[
                        styles.dayText,
                        tempPattern.daysOfWeek?.includes(day.value) && styles.dayTextActive,
                      ]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title={t('common.cancel')}
              onPress={() => setShowModal(false)}
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title={t('common.confirm')}
              onPress={handleConfirm}
              variant="primary"
              style={styles.actionButton}
            />
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
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  removeText: {
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '600',
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
  frequencyOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  frequencyText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  frequencyTextActive: {
    color: '#FFFFFF',
  },
  intervalDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  intervalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  intervalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  dayButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
