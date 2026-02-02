import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { AppHeader } from '../components/AppHeader';
import { AdminPasswordProtection, adminLogout } from '../components/AdminPasswordProtection';
import { AdminFirebaseAuth } from '../components/AdminFirebaseAuth';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { Booking } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import { STUDIOS } from '../constants/studios';

const DEMO_MODE = false; // Production: false, Testing: true

export const AdminDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
    const [stats, setStats] = useState({
    totalMembers: 0,
    pendingBookings: 0,
    upcomingEvents: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      return; // Don't load data until password authenticated
    }
    
    // For now, just require Firebase authentication (we'll add role check later)
    if (!user) {
      return; // Wait for Firebase authentication
    }
    
        
    // Load data when admin is authenticated via password protection AND Firebase auth
    loadDashboardData();
  }, [isAuthenticated, user]);

  // Handle admin logout - clear password protection when Firebase user logs out
  useEffect(() => {
    if (!user && isAuthenticated) {
      // Firebase user logged out, also clear admin password protection
      adminLogout();
      setIsAuthenticated(false);
    }
  }, [user, isAuthenticated]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    if (DEMO_MODE) {
      // Demo mode - simulate data loading
      setTimeout(() => {
        // Sample pending bookings
        const demoBookings: Booking[] = [
          {
            id: 'booking-1',
            userId: 'user-1',
            userName: 'Maria Schmidt',
            studioId: 'studio-1-big',
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Tomorrow + 2 hours
            status: 'pending',
            purpose: 'Flamenco practice for upcoming performance',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
          {
            id: 'booking-2',
            userId: 'user-2',
            userName: 'John Weber',
            studioId: 'studio-2-small',
            startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000), // + 1.5 hours
            status: 'pending',
            purpose: 'Private lesson preparation',
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
          },
          {
            id: 'booking-3',
            userId: 'user-3',
            userName: 'Ana Garcia',
            studioId: 'studio-1-big',
            startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
            endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // + 3 hours
            status: 'pending',
            purpose: 'Group rehearsal for festival',
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
        ];

        setPendingBookings(demoBookings);
        setStats({
          totalMembers: 47,
          pendingBookings: demoBookings.length,
          upcomingEvents: 5,
        });
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const bookingsQuery = query(
        collection(db!, 'bookings'),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(bookingsQuery);
      
      const bookingsData = snapshot.docs.map((doc) => {
        return {
          ...doc.data(),
          id: doc.id,
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime.toDate(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate(),
        };
      }) as Booking[];

      setPendingBookings(bookingsData);

      // Try to load additional stats with graceful fallback
      let totalMembers = 0;
      let upcomingEvents = 0;
      
      try {
        const usersQuery = query(collection(db!, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        totalMembers = usersSnapshot.size;
      } catch (usersError) {
        // Silently handle users query failure
        console.error('Error loading users count:', usersError);
        totalMembers = 0;
      }
      
      try {
        const eventsQuery = query(collection(db!, 'specialEvents'), where('endDate', '>=', new Date()));
        const eventsSnapshot = await getDocs(eventsQuery);
        upcomingEvents = eventsSnapshot.size;
      } catch (eventsError) {
        // Silently handle events query failure
        upcomingEvents = 0;
      }

      setStats({
        totalMembers,
        pendingBookings: bookingsData.length,
        upcomingEvents,
      });
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    if (DEMO_MODE) {
      // Demo mode - simulate approval
      setTimeout(() => {
        setPendingBookings(prev => prev.filter(booking => booking.id !== bookingId));
        setStats(prev => ({ ...prev, pendingBookings: prev.pendingBookings - 1 }));
        Alert.alert(t('common.success'), 'Booking approved');
      }, 500);
      return;
    }

    try {
      await updateDoc(doc(db!, 'bookings', bookingId), {
        status: 'approved',
        approvedBy: user?.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert(t('common.success'), 'Booking approved');
      loadDashboardData();
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    // For web compatibility, use a simple confirmation. In production, replace with a custom modal.
    const reason = 'Rejected by admin'; // You can replace this with a custom modal input later.

    if (DEMO_MODE) {
      // Demo mode - simulate rejection
      setTimeout(() => {
        setPendingBookings(prev => prev.filter(booking => booking.id !== bookingId));
        setStats(prev => ({ ...prev, pendingBookings: prev.pendingBookings - 1 }));
        Alert.alert(t('common.success'), 'Booking rejected');
      }, 500);
      return;
    }

    try {
      await updateDoc(doc(db!, 'bookings', bookingId), {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date(),
      });

      Alert.alert(t('common.success'), 'Booking rejected');
      loadDashboardData();
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.general'));
    };
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  
  return (
    <View style={styles.container}>
      {!isAuthenticated ? (
        <AdminPasswordProtection onAuthenticated={() => setIsAuthenticated(true)} />
      ) : !user || user.role !== 'admin' ? (
        <AdminFirebaseAuth onAuthenticated={() => {}} />
      ) : (
        <>
          <ScrollView 
            ref={scrollViewRef} 
            style={styles.scrollView}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <AppHeader title={t('admin.title')} />

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="people-outline" size={32} color={theme.colors.primary} />
                <Text style={styles.statValue}>{stats.totalMembers}</Text>
                <Text style={styles.statLabel}>{t('admin.totalMembers')}</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={32} color={theme.colors.warning} />
                <Text style={styles.statValue}>{stats.pendingBookings}</Text>
                <Text style={styles.statLabel}>{t('admin.pendingBookings')}</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="calendar-outline" size={32} color={theme.colors.success} />
                <Text style={styles.statValue}>{stats.upcomingEvents}</Text>
                <Text style={styles.statLabel}>{t('admin.upcomingEvents')}</Text>
              </View>
            </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.pendingBookings')}</Text>

          {pendingBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('admin.noPendingBookings')}</Text>
            </View>
          ) : (
            pendingBookings.map((booking) => {
              const studio =
                booking.studioId === 'studio-1-big' ? STUDIOS.BIG : 
                booking.studioId === 'studio-2-small' ? STUDIOS.SMALL : STUDIOS.OFFSITE;

              return (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={[styles.studioIndicator, { backgroundColor: studio.color }]} />
                  <View style={styles.bookingContent}>
                    <View style={styles.bookingHeader}>
                      <Text style={styles.bookingUser}>{booking.userName}</Text>
                      <View style={styles.studioBadge}>
                        <Text style={styles.studioBadgeText}>{studio.name}</Text>
                      </View>
                    </View>

                    <View style={styles.bookingDetail}>
                      <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.bookingDetailText}>
                        {formatDateTime(booking.startTime)}
                      </Text>
                    </View>

                    <View style={styles.bookingDetail}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.bookingDetailText}>
                        {formatDateTime(booking.startTime)} - {formatDateTime(booking.endTime)}
                      </Text>
                    </View>

                    {booking.purpose && (
                      <View style={styles.bookingDetail}>
                        <Ionicons name="document-text-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.bookingDetailText}>{booking.purpose}</Text>
                      </View>
                    )}

                    <View style={styles.bookingActions}>
                      <Button
                        title={t('admin.approveBooking')}
                        onPress={() => handleApproveBooking(booking.id)}
                        variant="success"
                        size="small"
                        style={styles.actionButton}
                      />
                      <Button
                        title={t('admin.rejectBooking')}
                        onPress={() => handleRejectBooking(booking.id)}
                        variant="danger"
                        size="small"
                        style={styles.actionButton}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>{t('admin.quickActions')}</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageUsers')}
          >
            <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.actionCardText}>{t('admin.manageUsers')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageEvents')}
          >
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.actionCardText}>{t('admin.manageEvents')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageNews')}
          >
            <Ionicons name="newspaper-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.actionCardText}>{t('admin.manageNews')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Statistics')}
          >
            <Ionicons name="stats-chart-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.actionCardText}>{t('admin.statistics')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        </ScrollView>
        
        {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}
        </>
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
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  section: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  studioIndicator: {
    width: 4,
  },
  bookingContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  bookingUser: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  studioBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  studioBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,  },
  bookingDetailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bookingActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    maxWidth: 120,
    marginRight: theme.spacing.sm,
  },
  quickActions: {
    padding: theme.spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,    ...theme.shadows.small,
  },
  actionCardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
});
