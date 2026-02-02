import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { Input } from '../components/Input';
import { theme } from '../constants/theme';
import { STUDIOS, BOOKING_HOURS } from '../constants/studios';
import { t, getLocale } from '../locales';
import { isWithinBookingHours, hasTimeConflict, isWeekend, parseTimeInput } from '../utils/dateUtils';
import { validateBookingTime } from '../utils/validation';


export const BookStudioScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { date, studioId } = route.params;

  // Scroll to top when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const scrollToTop = () => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
      };
      
      // Small delay to ensure the component is fully mounted
      const timeoutId = setTimeout(scrollToTop, 100);
      
      return () => clearTimeout(timeoutId);
    }, [])
  );

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState('');

  // Auto-normalize time input when user finishes typing
  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    setBookingSuccess(false); // Reset success state when user edits
    setBookingSubmitted(false); // Reset lock when user edits
    // Clear error when user types
    if (errors.startTime) {
      setErrors(prev => ({ ...prev, startTime: '' }));
    }
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    setBookingSuccess(false); // Reset success state when user edits
    setBookingSubmitted(false); // Reset lock when user edits
    // Clear error when user types
    if (errors.endTime) {
      setErrors(prev => ({ ...prev, endTime: '' }));
    }
  };

  const handlePurposeChange = (value: string) => {
    setPurpose(value);
    setBookingSuccess(false); // Reset success state when user edits
    setBookingSubmitted(false); // Reset lock when user edits
    // Clear error when user types
    if (errors.purpose) {
      setErrors(prev => ({ ...prev, purpose: '' }));
    }
  };

  const handleStartTimeBlur = () => {
    if (startTime) {
      const parsed = parseTimeInput(startTime);
      if (parsed) {
        setStartTime(parsed);
      }
    }
  };

  const handleEndTimeBlur = () => {
    if (endTime) {
      const parsed = parseTimeInput(endTime);
      if (parsed) {
        setEndTime(parsed);
      }
    }
  };

  const studio = studioId === 'studio-1-big' ? STUDIOS.BIG : studioId === 'studio-2-small' ? STUDIOS.SMALL : STUDIOS.OFFSITE;
  const isWeekendDay = isWeekend(new Date(date));
  const bookingHours = isWeekendDay ? BOOKING_HOURS.WEEKEND : BOOKING_HOURS.WEEKDAY;

  const generateRecurringDates = (startDate: Date, pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly', endDateStr: string): Date[] => {
    const dates: Date[] = [];
    const endDate = new Date(endDateStr);
    let currentDate = new Date(startDate);
    
    // Limit to 52 weeks (1 year) to prevent excessive bookings
    const maxIterations = 365;
    let iterations = 0;
    
    while (currentDate <= endDate && iterations < maxIterations) {
      dates.push(new Date(currentDate));
      
      switch (pattern) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
      
      iterations++;
    }
    
    return dates;
  };

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!startTime) {
      newErrors.startTime = t('common.required');
    }

    if (!endTime) {
      newErrors.endTime = t('common.required');
    }

    if (startTime && endTime) {
      // Parse and normalize time inputs
      const parsedStartTime = parseTimeInput(startTime);
      const parsedEndTime = parseTimeInput(endTime);

      if (!parsedStartTime) {
        newErrors.startTime = 'Invalid time format. Use HH:MM, 5 pm, or similar.';
      }

      if (!parsedEndTime) {
        newErrors.endTime = 'Invalid time format. Use HH:MM, 5 pm, or similar.';
      }

      if (parsedStartTime && parsedEndTime) {
        const startDateTime = new Date(`${date}T${parsedStartTime}`);
        const endDateTime = new Date(`${date}T${parsedEndTime}`);

        const timeValidation = validateBookingTime(startDateTime, endDateTime);
        if (!timeValidation.valid) {
          newErrors.endTime = timeValidation.message || '';
        }

        // Validate booking hours with specific messages for weekday vs weekend
        const startHour = startDateTime.getHours();
        const endHour = endDateTime.getHours();
        const endMinute = endDateTime.getMinutes();
        
        if (isWeekendDay) {
          // Weekend: 08:00-22:00
          if (startHour < 8 || startHour >= 22 || endHour > 22 || (endHour === 22 && endMinute > 0)) {
            newErrors.startTime = 'Weekend bookings: 08:00-22:00 only';
          }
        } else {
          // Weekday: 16:00-22:00
          if (startHour < 16 || startHour >= 22 || endHour > 22 || (endHour === 22 && endMinute > 0)) {
            newErrors.startTime = 'Weekday bookings: 16:00-22:00 only';
          }
        }

        const hasConflict = await checkForConflicts(startDateTime, endDateTime);
        if (hasConflict) {
          newErrors.startTime = t('calendar.doubleBookingError');
        }
      }
    }

    if (!purpose) {
      newErrors.purpose = t('common.required');
    }

    // Validate recurring booking fields
    if (isRecurring) {
      if (!recurringEndDate) {
        newErrors.recurringEndDate = t('common.required');
      } else {
        const endDate = new Date(recurringEndDate);
        const startDate = new Date(date);
        
        if (isNaN(endDate.getTime())) {
          newErrors.recurringEndDate = 'Invalid date format. Use YYYY-MM-DD';
        } else if (endDate <= startDate) {
          newErrors.recurringEndDate = 'End date must be after start date';
        } else {
          // Check if end date is too far in the future (max 1 year)
          const oneYearFromNow = new Date(startDate);
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          if (endDate > oneYearFromNow) {
            newErrors.recurringEndDate = 'End date cannot be more than 1 year from start date';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForConflicts = async (start: Date, end: Date): Promise<boolean> => {
    try {
      const startOfDay = new Date(start);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);

      const eventsQuery = query(collection(db!, 'events'), where('studioId', '==', studioId),
        where('startTime', '>=', Timestamp.fromDate(startOfDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay))
      );

      const bookingsQuery = query(
        collection(db!, 'bookings'),
        where('studioId', '==', studioId),
        where('status', 'in', ['pending', 'approved']),
        where('startTime', '>=', Timestamp.fromDate(startOfDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay))
      );

      const [eventsSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(bookingsQuery),
      ]);

      for (const doc of eventsSnapshot.docs) {
        const event = doc.data();
        if (hasTimeConflict(start, end, event.startTime.toDate(), event.endTime.toDate())) {
          return true;
        }
      }

      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        if (hasTimeConflict(start, end, booking.startTime.toDate(), booking.endTime.toDate())) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!(await validate())) return;

    setLoading(true);
    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      // Generate recurring group ID if this is a recurring booking
      const recurringGroupId = isRecurring ? `recurring_${Date.now()}_${user?.id}` : undefined;

      // Calculate all booking dates if recurring
      const bookingDates = isRecurring ? generateRecurringDates(new Date(date), recurringPattern, recurringEndDate) : [new Date(date)];
      
      console.log('BOOKING: Is recurring:', isRecurring);
      console.log('BOOKING: Recurring pattern:', recurringPattern);
      console.log('BOOKING: Recurring end date:', recurringEndDate);
      console.log('BOOKING: Generated booking dates:', bookingDates.length, bookingDates.map(d => d.toISOString().split('T')[0]));

      // Create bookings for all dates
      const bookingPromises = bookingDates.map(async (bookingDate) => {
        const bookingStartTime = new Date(bookingDate);
        bookingStartTime.setHours(startDateTime.getHours(), startDateTime.getMinutes());
        const bookingEndTime = new Date(bookingDate);
        bookingEndTime.setHours(endDateTime.getHours(), endDateTime.getMinutes());

        const bookingData = {
          userId: user?.id,
          userName: `${user?.firstName} ${user?.lastName}`,
          studioId,
          startTime: Timestamp.fromDate(bookingStartTime),
          endTime: Timestamp.fromDate(bookingEndTime),
          status: 'pending',
          purpose,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isRecurring: isRecurring || undefined,
          recurringPattern: isRecurring ? recurringPattern : undefined,
          recurringEndDate: isRecurring && recurringEndDate ? Timestamp.fromDate(new Date(recurringEndDate)) : undefined,
          recurringGroupId: recurringGroupId || undefined,
        };

        return addDoc(collection(db!, 'bookings'), bookingData);
      });

      const results = await Promise.all(bookingPromises);
      
      console.log('Booking(s) created successfully:', results.length, 'booking(s)');
      console.log('Booking data:', {
        userId: user?.id,
        studioId,
        date,
        startTime,
        endTime,
        purpose,
        status: 'pending'
      });
      
      // Create friendly success message
      const studioName = studioId === 'studio-1-big' ? 'Studio 1 (Big)' : 
                        studioId === 'studio-2-small' ? 'Studio 2 (Small)' : 'Offsite';
      
      const successMessage = isRecurring 
        ? t('calendar.recurringBookingSubmittedBody', {
            studio: studioName,
            count: bookingDates.length,
            pattern: t(`calendar.recurringPattern.${recurringPattern}`),
            startDate: new Date(date).toLocaleDateString(),
            endDate: new Date(recurringEndDate).toLocaleDateString(),
            startTime,
            endTime
          })
        : t('calendar.bookingSubmittedBody', { 
            studio: studioName,
            date: new Date(date).toLocaleDateString(),
            startTime,
            endTime
          });
      
      Alert.alert(
        t('calendar.bookingSubmittedTitle'),
        successMessage,
        [
          {
            text: t('calendar.viewMyBookings'),
            onPress: () => navigation.navigate('Calendar'),
          },
          {
            text: t('calendar.bookAnother'),
            onPress: () => {
              // Reset form for another booking
              setStartTime('');
              setEndTime('');
              setPurpose('');
              setIsRecurring(false);
              setRecurringPattern('weekly');
              setRecurringEndDate('');
              setBookingSuccess(false);
              setBookingSubmitted(false); // Reset the lock for new booking
              navigation.goBack();
            },
          },
        ]
      );
      
      // Show success state briefly
      setBookingSuccess(true);
      setBookingSubmitted(true); // Lock the button after successful booking
      setTimeout(() => setBookingSuccess(false), 2000);
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef} 
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('calendar.bookStudio')}</Text>
        </View>

        <View style={styles.studioInfo}>
          <View style={[styles.studioColorBar, { backgroundColor: studio.color }]} />
          <View style={styles.studioDetails}>
            <Text style={styles.studioName}>{studio.name}</Text>
            <Text style={styles.studioDate}>
              {new Date(date).toLocaleDateString(getLocale() === 'de' ? 'de-DE' : getLocale() === 'es' ? 'es-ES' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            {isWeekendDay
              ? `Weekend hours: ${bookingHours.start}:00 - ${bookingHours.end}:00`
              : `Weekday hours: ${bookingHours.start}:00 - ${bookingHours.end}:00`}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label={t('calendar.startTime')}
            placeholder="e.g., 16:00, 4pm, 16,00"
            value={startTime}
            onChangeText={handleStartTimeChange}
            onBlur={handleStartTimeBlur}
            icon="time-outline"
            error={errors.startTime}
          />

          <Input
            label={t('calendar.endTime')}
            placeholder="e.g., 18:00, 6pm, 18,00"
            value={endTime}
            onChangeText={handleEndTimeChange}
            onBlur={handleEndTimeBlur}
            icon="time-outline"
            error={errors.endTime}
          />

          <Input
            label={t('calendar.purpose')}
            placeholder="Practice, rehearsal, etc."
            value={purpose}
            onChangeText={handlePurposeChange}
            multiline
            numberOfLines={3}
            icon="document-text-outline"
            error={errors.purpose}
          />

          {user?.role === 'admin' && (
            <View style={styles.recurringSection}>
              <View style={styles.recurringToggle}>
                <View style={styles.recurringToggleLeft}>
                  <Ionicons name="repeat-outline" size={20} color={theme.colors.primary} style={styles.recurringIcon} />
                  <Text style={styles.recurringLabel}>{t('calendar.recurringBooking')}</Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={isRecurring ? theme.colors.surface : theme.colors.textSecondary}
                />
              </View>

              {isRecurring && (
                <View style={styles.recurringOptions}>
                  <Text style={styles.recurringOptionsLabel}>{t('calendar.recurringPattern.label')}</Text>
                  <View style={styles.patternButtons}>
                    <TouchableOpacity
                      style={[styles.patternButton, recurringPattern === 'weekly' && styles.patternButtonActive]}
                      onPress={() => setRecurringPattern('weekly')}
                    >
                      <Text style={[styles.patternButtonText, recurringPattern === 'weekly' && styles.patternButtonTextActive]}>
                        {t('calendar.recurringPattern.weekly')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.patternButton, recurringPattern === 'biweekly' && styles.patternButtonActive]}
                      onPress={() => setRecurringPattern('biweekly')}
                    >
                      <Text style={[styles.patternButtonText, recurringPattern === 'biweekly' && styles.patternButtonTextActive]}>
                        {t('calendar.recurringPattern.biweekly')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.patternButton, recurringPattern === 'monthly' && styles.patternButtonActive]}
                      onPress={() => setRecurringPattern('monthly')}
                    >
                      <Text style={[styles.patternButtonText, recurringPattern === 'monthly' && styles.patternButtonTextActive]}>
                        {t('calendar.recurringPattern.monthly')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Input
                    label={t('calendar.recurringEndDate')}
                    placeholder="YYYY-MM-DD"
                    value={recurringEndDate}
                    onChangeText={setRecurringEndDate}
                    icon="calendar-outline"
                    error={errors.recurringEndDate}
                  />
                </View>
              )}
            </View>
          )}

          <View style={styles.noticeBox}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.noticeText}>{t('calendar.cancellationNotice')}</Text>
          </View>

          <Button
            title={bookingSuccess ? t('calendar.booked') : bookingSubmitted ? t('calendar.booked') : t('common.submit')}
            onPress={handleSubmit}
            loading={loading}
            loadingText={loading ? t('calendar.booking') : bookingSuccess ? t('calendar.booked') : undefined}
            variant={bookingSuccess ? 'success' : bookingSubmitted ? 'success' : 'primary'}
            disabled={bookingSubmitted}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
      
      {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  studioInfo: {
    flexDirection: 'row',
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  studioColorBar: {
    width: 8,
  },
  studioDetails: {
    padding: theme.spacing.md,
    flex: 1,
  },
  studioName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  studioDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    flex: 1,
  },
  form: {
    padding: theme.spacing.lg,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,  },
  noticeText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
  submitButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 250,
  },
  recurringSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurringToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurringIcon: {
    marginRight: theme.spacing.sm,
  },
  recurringLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  recurringOptions: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  recurringOptionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  patternButtons: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  patternButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginRight: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  patternButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  patternButtonText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  patternButtonTextActive: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
});
