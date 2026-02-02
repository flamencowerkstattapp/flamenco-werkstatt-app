import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Dimensions, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { theme } from '../constants/theme';
import { t, getLocale } from '../locales';
import { PaymentMethod, PaymentType, SpecialClassType, User } from '../types';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (paymentData: {
    amount: number;
    paymentMethod: PaymentMethod;
    paymentType: PaymentType;
    date: Date;
    month: string;
    classId?: string;
    notes?: string;
    membershipType?: string;
    specialClassType?: SpecialClassType;
  }) => void;
  user: User;
  defaultType: PaymentType;
}

const MEMBERSHIP_PRICING = {
  '1-class': 55,
  '2-classes': 90,
  '3-classes': 120,
  'all-you-can-dance': 130,
} as const;

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onSubmit,
  user,
  defaultType,
}) => {
  const { width } = useWindowDimensions();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentType, setPaymentType] = useState<PaymentType>(defaultType);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMembershipType, setSelectedMembershipType] = useState<string>('');
  const [selectedSpecialClassType, setSelectedSpecialClassType] = useState<SpecialClassType>('technique');
  const [notes, setNotes] = useState('');

  // Calculate month button width based on screen size
  // Desktop (>=768px): 4 columns = ~23%
  // Tablet (480-767px): 3 columns = ~31%
  // Mobile (<480px): 2 columns = ~47%
  const getMonthButtonWidth = () => {
    if (width >= 768) return '23%'; // 4 columns
    if (width >= 480) return '31%'; // 3 columns
    return '47%'; // 2 columns
  };

  // Calculate membership type button width based on screen size
  // Desktop (>=768px): 4 columns = ~23%
  // Mobile (<768px): 2 columns = ~47%
  const getMembershipButtonWidth = () => {
    if (width >= 768) return '23%'; // 4 columns
    return '47%'; // 2 columns
  };

  useEffect(() => {
    if (visible) {
      setPaymentType(defaultType);
      
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(monthStr);
      
      if (defaultType === 'weekly-class') {
        // Weekly class payment - use member's membership type
        setSelectedMembershipType(user.membershipType || '1-class');
        const price = MEMBERSHIP_PRICING[user.membershipType || '1-class'];
        setAmount(price.toString());
      } else {
        // Special class payment
        setSelectedSpecialClassType('technique');
        setAmount('');
      }
      
      setPaymentMethod('cash');
      setNotes('');
    }
  }, [visible, defaultType, user.membershipType]);

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Full month names by language to ensure consistency
    const monthNames = {
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    };
    
    // Use current app language, not individual user's preference
    const currentLocale = getLocale() as 'en' | 'de' | 'es';
    const months = monthNames[currentLocale] || monthNames.en;
    
    // Generate all 12 months of current year with full names
    for (let i = 0; i < 12; i++) {
      const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const monthName = months[i];
      options.push({ value: monthStr, label: monthName });
    }
    
    return options;
  }, []);

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert(t('common.error'), t('payments.enterValidAmount'));
      return;
    }

    if (!selectedMonth) {
      Alert.alert(t('common.error'), t('payments.selectMonth'));
      return;
    }

    onSubmit({
      amount: amountNum,
      paymentMethod,
      paymentType,
      date: new Date(),
      month: selectedMonth,
      membershipType: paymentType === 'weekly-class' ? selectedMembershipType : undefined,
      specialClassType: paymentType === 'special-class' ? selectedSpecialClassType : undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {paymentType === 'weekly-class' 
                ? t('payments.recordClassPayment')
                : t('payments.recordSpecialClassPayment')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <Ionicons name="person-circle-outline" size={40} color={theme.colors.primary} />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
              {paymentType === 'weekly-class' && selectedMembershipType && (
                <Text style={styles.userMembership}>
                  {t(`user.membershipTypes.${selectedMembershipType}`)}
                </Text>
              )}
              {paymentType === 'special-class' && (
                <Text style={styles.userMembership}>
                  {t('payments.recordSpecialClass')}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.form}>
            {paymentType === 'weekly-class' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.membershipType')} *</Text>
                <View style={styles.membershipTypeOptions}>
                  {Object.keys(MEMBERSHIP_PRICING).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.membershipTypeOption,
                        { width: getMembershipButtonWidth() },
                        selectedMembershipType === type && styles.selectedMembershipType
                      ]}
                      onPress={() => {
                        setSelectedMembershipType(type);
                        const price = MEMBERSHIP_PRICING[type as keyof typeof MEMBERSHIP_PRICING];
                        setAmount(price.toString());
                      }}
                    >
                      <View>
                        <Text style={[
                          styles.membershipTypeText,
                          selectedMembershipType === type && styles.selectedMembershipTypeText
                        ]}>
                          {t(`user.membershipTypes.${type}`)}
                        </Text>
                        <Text style={[
                          styles.membershipPriceText,
                          selectedMembershipType === type && styles.selectedMembershipPriceText
                        ]}>
                          {t(`user.membershipPricing.${type}`)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {paymentType === 'special-class' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('payments.specialClassType')} *</Text>
                <View style={styles.specialClassTypeOptions}>
                  <TouchableOpacity
                    style={[
                      styles.specialClassTypeOption,
                      selectedSpecialClassType === 'technique' && styles.selectedSpecialClassType
                    ]}
                    onPress={() => setSelectedSpecialClassType('technique')}
                  >
                    <View>
                      <Text style={[
                        styles.specialClassTypeText,
                        selectedSpecialClassType === 'technique' && styles.selectedSpecialClassTypeText
                      ]}>
                        {t('payments.techniqueClass')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.specialClassTypeOption,
                      selectedSpecialClassType === 'special-event' && styles.selectedSpecialClassType
                    ]}
                    onPress={() => setSelectedSpecialClassType('special-event')}
                  >
                    <View>
                      <Text style={[
                        styles.specialClassTypeText,
                        selectedSpecialClassType === 'special-event' && styles.selectedSpecialClassTypeText
                      ]}>
                        {t('payments.specialEventClass')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payments.amount')} (€) *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payments.month')} *</Text>
              <View style={styles.monthOptions}>
                {monthOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.monthOption,
                      { width: getMonthButtonWidth() },
                      selectedMonth === option.value && styles.selectedMonth
                    ]}
                    onPress={() => setSelectedMonth(option.value)}
                  >
                    <Text style={[
                      styles.monthText,
                      selectedMonth === option.value && styles.selectedMonthText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payments.paymentMethod')} *</Text>
              <View style={styles.paymentMethodOptions}>
                <TouchableOpacity
                  style={[
                    styles.methodOption,
                    paymentMethod === 'cash' && styles.selectedMethod
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <View style={styles.methodContent}>
                    <Ionicons 
                      name="cash-outline" 
                      size={24} 
                      color={paymentMethod === 'cash' ? '#fff' : theme.colors.primary} 
                    />
                    <Text style={[
                      styles.methodText,
                      paymentMethod === 'cash' && styles.selectedMethodText
                    ]}>
                      {t('payments.cash')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodOption,
                    paymentMethod === 'bank' && styles.selectedMethod
                  ]}
                  onPress={() => setPaymentMethod('bank')}
                >
                  <View style={styles.methodContent}>
                    <Ionicons 
                      name="card-outline" 
                      size={24} 
                      color={paymentMethod === 'bank' ? '#fff' : theme.colors.primary} 
                    />
                    <Text style={[
                      styles.methodText,
                      paymentMethod === 'bank' && styles.selectedMethodText
                    ]}>
                      {t('payments.bank')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payments.notes')}</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('payments.notesPlaceholder')}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                onPress={onClose}
                variant="outline"
                style={styles.actionButton}
              />
              <Button
                title={t('payments.recordPayment')}
                onPress={handleSubmit}
                variant="primary"
                style={styles.actionButton}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  userDetails: {
    marginLeft: theme.spacing.md,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  userMembership: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  form: {
    marginTop: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  monthOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -theme.spacing.xs,
    marginRight: -theme.spacing.xs,
  },
  monthOption: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    minWidth: 65,
  },
  selectedMonth: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  monthText: {
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedMonthText: {
    color: '#fff',
    fontWeight: '700',
  },
  membershipTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -theme.spacing.xs,
    marginRight: -theme.spacing.xs,
  },
  membershipTypeOption: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginLeft: theme.spacing.xs,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  selectedMembershipType: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  membershipTypeText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  selectedMembershipTypeText: {
    color: '#fff',
    fontWeight: '600',
  },
  membershipPriceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  selectedMembershipPriceText: {
    color: '#fff',
    opacity: 0.9,
  },
  specialClassTypeOptions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  specialClassTypeOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  selectedSpecialClassType: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  specialClassTypeText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedSpecialClassTypeText: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentMethodOptions: {
    flexDirection: 'row',
  },
  methodOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  selectedMethod: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  methodContent: {
    alignItems: 'center',
  },
  methodText: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    fontWeight: '600',
  },
  selectedMethodText: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    marginTop: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
});
