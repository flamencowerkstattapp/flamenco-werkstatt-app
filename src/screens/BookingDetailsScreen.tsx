import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { ConfirmModal } from '../components/ConfirmModal';
import { EditBookingModal } from '../components/EditBookingModal';
import { AppHeader } from '../components/AppHeader';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { Booking } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import { STUDIOS } from '../constants/studios';

export const BookingDetailsScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelSingleModal, setShowCancelSingleModal] = useState(false);

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId]);

  const loadBookingDetails = async () => {
    try {
      const bookingDoc = await getDoc(doc(db!, 'bookings', bookingId));
      if (bookingDoc.exists()) {
        const bookingData = {
          ...bookingDoc.data(),
          id: bookingDoc.id,
          startTime: bookingDoc.data().startTime.toDate(),
          endTime: bookingDoc.data().endTime.toDate(),
          createdAt: bookingDoc.data().createdAt.toDate(),
          updatedAt: bookingDoc.data().updatedAt.toDate(),
        } as Booking;
        setBooking(bookingData);
      } else {
        Alert.alert(t('common.error'), 'Booking not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
      Alert.alert(t('common.error'), t('errors.general'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = () => {
    console.log('BOOKING DETAILS: Cancel button clicked, showing modal');
    setShowCancelModal(true);
    console.log('BOOKING DETAILS: Modal state set to true');
  };

  const handleCancelSingleBooking = () => {
    setShowCancelSingleModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!booking) return;

    setShowCancelModal(false);
    
    try {
      await updateDoc(doc(db!, 'bookings', bookingId), {
        status: 'cancelled',
        cancellationReason: 'Cancelled by user',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert(t('common.success'), 'Booking cancelled');
      navigation.goBack();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const confirmCancelSingleBooking = async () => {
    if (!booking) return;

    setShowCancelSingleModal(false);
    
    try {
      // Cancel only this single instance of the recurring booking
      await updateDoc(doc(db!, 'bookings', bookingId), {
        status: 'cancelled',
        cancellationReason: 'Single instance cancelled (holiday/sick instructor)',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert(
        t('common.success'), 
        t('calendar.singleBookingCancelled')
      );
      navigation.goBack();
    } catch (error) {
      console.error('Error cancelling single booking:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const handleEditBooking = () => {
    setShowEditModal(true);
  };

  const handleSaveBooking = async (updatedBooking: Partial<Booking>, updateSeries?: boolean) => {
    if (!booking) return;

    try {
      if (updateSeries && booking.isRecurring && booking.recurringGroupId) {
        // Update all bookings in the recurring series
        const seriesQuery = query(
          collection(db!, 'bookings'),
          where('recurringGroupId', '==', booking.recurringGroupId)
        );
        const seriesSnapshot = await getDocs(seriesQuery);
        const batch = writeBatch(db!);

        seriesSnapshot.docs.forEach((bookingDoc) => {
          batch.update(bookingDoc.ref, {
            purpose: updatedBooking.purpose,
            studioId: updatedBooking.studioId,
            updatedAt: new Date(),
          });
        });

        await batch.commit();
        Alert.alert(
          t('common.success'),
          t('calendar.seriesUpdated', { count: seriesSnapshot.size })
        );
      } else {
        // Update only this single booking
        await updateDoc(doc(db!, 'bookings', bookingId), {
          ...updatedBooking,
          updatedAt: new Date(),
        });
        Alert.alert(t('common.success'), t('calendar.bookingUpdated'));
      }

      await loadBookingDetails();
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  };

  const handleDeleteBooking = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteBooking = async () => {
    if (!booking) return;

    setShowDeleteModal(false);
    
    try {
      await deleteDoc(doc(db!, 'bookings', bookingId));

      Alert.alert(t('common.success'), t('calendar.deleteBooking'));
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting booking:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  if (loading || !booking) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('calendar.bookingDetails')} />
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  const studio = booking.studioId === 'studio-1-big' ? STUDIOS.BIG : 
                 booking.studioId === 'studio-2-small' ? STUDIOS.SMALL : STUDIOS.OFFSITE;

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

  return (
    <View style={styles.container}>
      <AppHeader title={t('calendar.bookingDetails')} />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.studioInfo}>
          <View style={[styles.studioColorBar, { backgroundColor: studio.color }]} />
          <View style={styles.studioDetails}>
            <Text style={styles.studioName}>{studio.name}</Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusText}>{t(`calendar.status.${booking.status}`)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('calendar.bookingDetails')}</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.detailLabel}>{t('calendar.bookedBy')}:</Text>
            <Text style={styles.detailValue}>{booking.userName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.detailLabel}>{t('calendar.date')}:</Text>
            <Text style={styles.detailValue}>{formatDateTime(booking.startTime)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.detailLabel}>{t('calendar.time')}:</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
            </Text>
          </View>

          {booking.purpose && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.detailLabel}>{t('calendar.purpose')}:</Text>
              <Text style={styles.detailValue}>{booking.purpose}</Text>
            </View>
          )}

          {booking.isRecurring && booking.recurringPattern && (
            <View style={styles.detailRow}>
              <Ionicons name="repeat-outline" size={20} color={theme.colors.info} />
              <Text style={styles.detailLabel}>{t('calendar.recurringBooking')}:</Text>
              <Text style={styles.detailValue}>
                {t(`calendar.recurringPattern.${booking.recurringPattern}`)}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.detailLabel}>{t('common.createdAt')}:</Text>
            <Text style={styles.detailValue}>{formatDateTime(booking.createdAt)}</Text>
          </View>
        </View>

        {booking.rejectionReason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('calendar.rejectionReason')}</Text>
            <Text style={styles.rejectionReason}>{booking.rejectionReason}</Text>
          </View>
        )}

        {booking.cancellationReason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('calendar.cancellationReason')}</Text>
            <Text style={styles.cancellationReason}>{booking.cancellationReason}</Text>
          </View>
        )}

        {user?.role === 'admin' && (
          <View style={styles.actions}>
            <Button
              title={t('calendar.editBooking')}
              onPress={handleEditBooking}
              style={styles.editButton}
            />
          </View>
        )}

        {user?.role === 'admin' && (
          <View style={styles.actions}>
            <Button
              title={t('calendar.deleteBooking')}
              onPress={handleDeleteBooking}
              variant="danger"
              style={styles.deleteButton}
            />
          </View>
        )}

        {user?.role === 'admin' && booking.isRecurring && booking.status !== 'cancelled' && (
          <View style={styles.actions}>
            <Button
              title={t('calendar.cancelSingleInstance')}
              onPress={handleCancelSingleBooking}
              variant="secondary"
              style={styles.cancelSingleButton}
            />
          </View>
        )}

        {!booking.isRecurring && ((user?.role === 'admin' && (booking.status === 'pending' || booking.status === 'approved')) || 
          (booking.userId === user?.id && booking.status === 'pending' && user?.role !== 'member')) && (
          <View style={styles.actions}>
            <Button
              title={t('calendar.cancelBooking')}
              onPress={handleCancelBooking}
              variant="secondary"
              style={styles.cancelButton}
            />
          </View>
        )}

        <View style={styles.actions}>
          <Button
            title={t('calendar.returnToCalendar')}
            onPress={() => navigation.goBack()}
            style={styles.returnButton}
          />
        </View>
      </ScrollView>
      
      {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}
      
      <ConfirmModal
        visible={showCancelModal}
        title={t('calendar.cancelBooking')}
        message={t('calendar.cancelBookingConfirm', { userName: booking?.userName })}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmCancelBooking}
        onCancel={() => setShowCancelModal(false)}
        destructive={true}
      />

      <ConfirmModal
        visible={showDeleteModal}
        title={t('calendar.deleteBooking')}
        message={t('calendar.deleteBookingConfirm', { userName: booking?.userName })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDeleteBooking}
        onCancel={() => setShowDeleteModal(false)}
        destructive={true}
      />

      <ConfirmModal
        visible={showCancelSingleModal}
        title={t('calendar.cancelSingleInstance')}
        message={t('calendar.cancelSingleInstanceConfirm', { 
          date: booking ? formatDateTime(booking.startTime) : ''
        })}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmCancelSingleBooking}
        onCancel={() => setShowCancelSingleModal(false)}
        destructive={true}
        messageColor={theme.colors.info}
      />
      
      {booking && (
        <EditBookingModal
          visible={showEditModal}
          booking={booking}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveBooking}
        />
      )}
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
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  statusContainer: {
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    minWidth: 80,
    marginLeft: theme.spacing.md,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  rejectionReason: {
    fontSize: 14,
    color: theme.colors.error,
    backgroundColor: '#FFEBEE',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  cancellationReason: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    backgroundColor: '#F5F5F5',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  actions: {
    padding: theme.spacing.lg,
  },
  editButton: {
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 250,
    backgroundColor: theme.colors.secondary,
  },
  cancelButton: {
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 250,
    backgroundColor: theme.colors.warning,
  },
  deleteButton: {
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 250,
  },
  cancelSingleButton: {
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 250,
    backgroundColor: theme.colors.info,
  },
  returnButton: {
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 250,
    backgroundColor: '#999999',
  },
});
