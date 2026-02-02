import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { AppHeader } from '../components/AppHeader';
import { theme } from '../constants/theme';
import { STUDIOS } from '../constants/studios';
import { t, getLocale } from '../locales';
import { CalendarEvent, Booking, SpecialEvent } from '../types';
import { formatTime, isSchoolHoliday, getCurrentSchoolHoliday, formatDate } from '../utils/dateUtils';

// Configure calendar locales
LocaleConfig.locales['en'] = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};

LocaleConfig.locales['de'] = {
  monthNames: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  monthNamesShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  dayNamesShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  today: 'Heute'
};

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};


export const CalendarScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudio, setSelectedStudio] = useState<'studio-1-big' | 'studio-2-small' | 'offsite'>('studio-1-big');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(getLocale());

  // Set calendar locale based on app language
  useEffect(() => {
    setCurrentLocale(getLocale());
    LocaleConfig.defaultLocale = getLocale();
  }, []);

  // Refresh calendar when language changes
  useEffect(() => {
    const checkLocaleChange = () => {
      const newLocale = getLocale();
      if (newLocale !== currentLocale) {
        setCurrentLocale(newLocale);
        LocaleConfig.defaultLocale = newLocale;
      }
    };

    const interval = setInterval(checkLocaleChange, 1000);
    return () => clearInterval(interval);
  }, [currentLocale]);

  useEffect(() => {
    loadEventsAndBookings();
  }, [selectedDate, selectedStudio]);

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEventsAndBookings();
    });
    return unsubscribe;
  }, [navigation, selectedDate, selectedStudio]);

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

  const loadEventsAndBookings = async () => {
    setLoading(true);
    try {
      console.log('CALENDAR: Loading events and bookings for date:', selectedDate, 'studio:', selectedStudio);
      console.log('CALENDAR: Current user:', user?.id, user?.firstName, user?.lastName, user?.role);
      
      const dateObj = new Date(selectedDate);
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));

      const eventsQuery = query(
        collection(db!, 'events'),
        where('studioId', '==', selectedStudio),
        where('startTime', '>=', Timestamp.fromDate(startOfDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay))
      );

      // Query for special events (from Manage Events screen)
      const specialEventsQuery = query(
        collection(db!, 'specialEvents'),
        where('isPublished', '==', true)
      );

      const bookingsQuery = query(
        collection(db!, 'bookings'),
        where('studioId', '==', selectedStudio),
        where('startTime', '>=', Timestamp.fromDate(startOfDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay))
      );

      console.log('CALENDAR: Executing queries...');
      const [eventsSnapshot, specialEventsSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(specialEventsQuery),
        getDocs(bookingsQuery),
      ]);

      console.log('CALENDAR: Events snapshot size:', eventsSnapshot.size);
      console.log('CALENDAR: Special events snapshot size:', specialEventsSnapshot.size);
      console.log('CALENDAR: Bookings snapshot size:', bookingsSnapshot.size);

      const eventsData = eventsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate(),
      })) as CalendarEvent[];

      // Process special events and filter by date and location
      const allSpecialEvents = specialEventsSnapshot.docs
        .map((doc) => ({
          ...doc.data(),
          id: doc.id,
          startDate: doc.data().startDate.toDate(),
          endDate: doc.data().endDate.toDate(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate(),
        })) as SpecialEvent[];
      
      console.log('CALENDAR: All special events:', allSpecialEvents.map(e => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate.toISOString().split('T')[0],
        location: e.location,
        isOffsite: e.isOffsite
      })));
      
      const specialEventsData = allSpecialEvents.filter((event) => {
        const eventStartDate = new Date(event.startDate);
        const eventEndDate = new Date(event.endDate);
        const selectedDateObj = new Date(selectedDate);
        
        eventStartDate.setHours(0, 0, 0, 0);
        eventEndDate.setHours(23, 59, 59, 999);
        selectedDateObj.setHours(0, 0, 0, 0);
        
        const matchesDate = selectedDateObj >= eventStartDate && selectedDateObj <= eventEndDate;
        
        // Match location: offsite events show in offsite tab, studio events show in respective studio tabs
        // Handle both studio IDs (studio-1-big) and display names (Big Studio, Small Studio)
        const matchesLocation = event.isOffsite 
          ? selectedStudio === 'offsite'
          : (selectedStudio === 'studio-1-big' && (event.location === 'studio-1-big' || event.location === 'Big Studio')) ||
            (selectedStudio === 'studio-2-small' && (event.location === 'studio-2-small' || event.location === 'Small Studio'));
        
        console.log(`CALENDAR: Event "${event.title}" - Date match: ${matchesDate} (${selectedDate} between ${eventStartDate.toISOString().split('T')[0]} and ${eventEndDate.toISOString().split('T')[0]}), Location match: ${matchesLocation} (${event.location} vs ${selectedStudio}, isOffsite: ${event.isOffsite})`);
        
        return matchesDate && matchesLocation;
      });

      const bookingsData = bookingsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate(),
      })) as Booking[];

      console.log('CALENDAR: Processed events:', eventsData.length);
      console.log('CALENDAR: Processed special events:', specialEventsData.length);
      console.log('CALENDAR: Processed bookings:', bookingsData.length);
      
      if (bookingsData.length > 0) {
        console.log('CALENDAR: Booking details:', bookingsData.map(b => ({
          id: b.id,
          userId: b.userId,
          userName: b.userName,
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status
        })));
      }

      setEvents(eventsData);
      setSpecialEvents(specialEventsData);
      setBookings(bookingsData);
      
      console.log('CALENDAR: Data loaded successfully');
    } catch (error) {
      console.error('CALENDAR: Error loading events and bookings:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  const isHoliday = isSchoolHoliday(new Date(selectedDate));
  const currentHoliday = getCurrentSchoolHoliday(new Date(selectedDate));

  const handleBookStudio = () => {
    // Check if user is a member (not admin or instructor)
    if (user?.role === 'member') {
      const selectedDateObj = new Date(selectedDate);
      const dayOfWeek = selectedDateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const isHolidayDate = isSchoolHoliday(selectedDateObj);
      
      // During school holidays, members can book any day
      // Outside school holidays, members can only book on weekends
      if (!isHolidayDate && dayOfWeek >= 1 && dayOfWeek <= 5) {
        Alert.alert(
          t('calendar.bookingRestricted'),
          t('calendar.memberBookingRules'),
          [{ text: t('common.ok') }]
        );
        return;
      }
    }
    
    navigation.navigate('BookStudio', {
      date: selectedDate,
      studioId: selectedStudio,
    });
  };

  const handleCancelBooking = async (bookingId: string, bookingUserName: string) => {
    const confirmed = window.confirm(
      `${t('calendar.cancelBooking')}\n\n${t('calendar.cancelBookingConfirm', { userName: bookingUserName })}`
    );

    if (!confirmed) {
      return;
    }

    try {
      await updateDoc(doc(db!, 'bookings', bookingId), {
        status: 'cancelled',
        cancelledBy: user?.id,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert(t('common.success'), t('calendar.bookingCancelled'));
      loadEventsAndBookings();
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('calendar.title')} />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.studioSelector}>
          <TouchableOpacity
            style={[
              styles.studioButton,
              selectedStudio === 'studio-1-big' && styles.studioButtonActive,
              { backgroundColor: selectedStudio === 'studio-1-big' ? STUDIOS.BIG.color : theme.colors.surface },
            ]}
            onPress={() => setSelectedStudio('studio-1-big')}
          >
            <Text
              style={[
                styles.studioButtonText,
                selectedStudio === 'studio-1-big' && styles.studioButtonTextActive,
              ]}
            >
              {t('calendar.studioBig')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.studioButton,
              selectedStudio === 'studio-2-small' && styles.studioButtonActive,
              { backgroundColor: selectedStudio === 'studio-2-small' ? STUDIOS.SMALL.color : theme.colors.surface },
            ]}
            onPress={() => setSelectedStudio('studio-2-small')}
          >
            <Text
              style={[
                styles.studioButtonText,
                selectedStudio === 'studio-2-small' && styles.studioButtonTextActive,
              ]}
            >
              {t('calendar.studioSmall')}
            </Text>
          </TouchableOpacity>
        </View>

        <Calendar
          current={selectedDate}
          onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: theme.colors.primary },
          }}
          theme={{
            selectedDayBackgroundColor: theme.colors.primary,
            todayTextColor: theme.colors.primary,
            arrowColor: theme.colors.primary,
          }}
        />

        {isHoliday && currentHoliday && (
          <View style={styles.holidayBanner}>
            <Ionicons name="information-circle" size={20} color={theme.colors.warning} style={styles.holidayIcon} />
            <Text style={styles.holidayText}>
              {t('calendar.schoolHolidayWithDates', {
                name: currentHoliday.name,
                startDate: formatDate(currentHoliday.startDate),
                endDate: formatDate(currentHoliday.endDate)
              })}
            </Text>
          </View>
        )}

        <View style={styles.eventsList}>
          <View style={styles.eventsHeader}>
            <Text style={styles.eventsTitle}>
              {new Date(selectedDate).toLocaleDateString(getLocale() === 'de' ? 'de-DE' : getLocale() === 'es' ? 'es-ES' : 'en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {events.length === 0 && specialEvents.length === 0 && bookings.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>No events or bookings</Text>
            </View>
          )}

        {events.map((event) => (
          <View
            key={event.id}
            style={[styles.eventCard, { borderLeftColor: selectedStudio === 'studio-1-big' ? STUDIOS.BIG.color : selectedStudio === 'studio-2-small' ? STUDIOS.SMALL.color : STUDIOS.OFFSITE.color }]}
          >
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              {event.classLevel && (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{event.classLevel}</Text>
                </View>
              )}
            </View>
            <View style={styles.eventDetails}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.eventTime}>
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </Text>
            </View>
            <View style={styles.eventDetails}>
              <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.eventInstructor}>{event.instructorName}</Text>
            </View>
            {event.classType && (
              <View style={styles.eventDetails}>
                <Ionicons name="bookmark-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.eventInstructor}>{event.classType}</Text>
              </View>
            )}
          </View>
        ))}

        {specialEvents.map((event) => (
          <View
            key={event.id}
            style={[styles.eventCard, { borderLeftColor: selectedStudio === 'studio-1-big' ? STUDIOS.BIG.color : selectedStudio === 'studio-2-small' ? STUDIOS.SMALL.color : STUDIOS.OFFSITE.color }]}
          >
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              {event.price !== undefined && event.price > 0 && (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>€{event.price}</Text>
                </View>
              )}
            </View>
            <View style={styles.eventDetails}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.eventTime}>
                {event.dailyStartTime && event.dailyEndTime 
                  ? `${event.dailyStartTime} - ${event.dailyEndTime}` 
                  : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`}
              </Text>
            </View>
            <View style={styles.eventDetails}>
              <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.eventInstructor}>
                {event.isOffsite 
                  ? event.location 
                  : event.location === 'Big Studio' || event.location === 'studio-1-big'
                    ? t('calendar.studioBig')
                    : event.location === 'Small Studio' || event.location === 'studio-2-small'
                      ? t('calendar.studioSmall')
                      : event.location
                }
              </Text>
            </View>
            {event.description && (
              <View style={styles.eventDetails}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.eventInstructor} numberOfLines={2}>{event.description}</Text>
              </View>
            )}
          </View>
        ))}

          {bookings.map((booking) => (
          <View
            key={booking.id}
            style={[styles.bookingCard, { borderLeftColor: selectedStudio === 'studio-1-big' ? STUDIOS.BIG.color : selectedStudio === 'studio-2-small' ? STUDIOS.SMALL.color : STUDIOS.OFFSITE.color }]}
          >
            <View style={styles.eventHeader}>
              <Text style={styles.bookingTitle}>{t('calendar.studioBooking')}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                <Text style={styles.statusText}>{t(`calendar.status.${booking.status}`)}</Text>
              </View>
            </View>
            <View style={styles.eventDetails}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.eventTime}>
                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
              </Text>
            </View>
            <View style={styles.eventDetails}>
              <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.eventInstructor}>
                {booking.userId === user?.id ? t('calendar.yourBooking') : booking.userName}
              </Text>
            </View>
            {booking.purpose && (
              <View style={styles.eventDetails}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={styles.eventPurpose} numberOfLines={2}>{booking.purpose}</Text>
              </View>
            )}
            {booking.userId === user?.id && (
              <TouchableOpacity
                style={styles.viewBookingButton}
                onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })}
              >
                <Text style={styles.viewBookingText}>{t('common.viewDetails')}</Text>
              </TouchableOpacity>
            )}
            {booking.userId !== user?.id && user?.role !== 'admin' && (
              <View style={styles.unavailableSlot}>
                <Ionicons name="lock-closed" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.unavailableText}>{t('calendar.slotUnavailable')}</Text>
              </View>
            )}
            {user?.role === 'admin' && booking.status === 'approved' && (
              <TouchableOpacity
                style={styles.cancelBookingButton}
                onPress={() => handleCancelBooking(booking.id, booking.userName)}
              >
                <Ionicons name="close-circle-outline" size={16} color={theme.colors.error} />
                <Text style={styles.cancelBookingText}>{t('calendar.cancelBooking')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        </View>

        <View style={styles.footer}>
          <Button
            title={t('calendar.bookStudio')}
            onPress={handleBookStudio}
            style={styles.bookButton}
          />
        </View>
      </ScrollView>
      
      {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return theme.colors.success;
    case 'pending':
      return theme.colors.warning;
    case 'rejected':
      return theme.colors.error;
    case 'cancelled':
      return theme.colors.disabled;
    default:
      return theme.colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  studioSelector: {
    flexDirection: 'row',
    padding: theme.spacing.md,  },
  studioButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  studioButtonActive: {
    backgroundColor: theme.colors.surface,
  },
  studioButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  studioButtonTextActive: {
    color: theme.colors.primary,
  },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: theme.spacing.md,
  },
  holidayIcon: {
    marginRight: theme.spacing.sm,
  },
  holidayText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  eventsList: {
    padding: theme.spacing.md,
  },
  eventsHeader: {
    marginBottom: theme.spacing.md,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  eventCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    ...theme.shadows.small,
  },
  bookingCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    ...theme.shadows.small,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
  },
  classTypeBadge: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  classTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,  },
  eventTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  eventInstructor: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  eventLevel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  viewBookingButton: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  viewBookingText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cancelBookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  cancelBookingText: {
    fontSize: 14,
    color: theme.colors.error,
    fontWeight: '600',
    marginLeft: 4,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
  },
  bookButton: {
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 250,
  },
  tableContainer: {
    padding: theme.spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tableCell: {
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    padding: theme.spacing.sm,
    minHeight: 80,
  },
  headerCell: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studioCell: {
    width: 100,
  },
  dayCell: {
    width: 150,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  studioLabelCell: {
    width: 100,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  contentCell: {
    width: 150,
    backgroundColor: '#F9F9F9',
  },
  cellEvent: {
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cellTime: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  cellTitle: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 2,
  },
  cellInstructor: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  levelBadge: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  eventParticipants: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  eventPurpose: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  unavailableSlot: {
    flexDirection: 'row',
    alignItems: 'center',    marginTop: theme.spacing.sm,
    padding: theme.spacing.xs,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  unavailableText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
