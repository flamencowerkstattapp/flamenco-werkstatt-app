import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
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

export const AdminDashboard: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
    const [stats, setStats] = useState({
    totalMembers: 0,
    contractUsers: 0,
    noContractUsers: 0,
    pendingBookings: 0,
    upcomingEvents: 0,
    adminCount: 0,
    instructorCount: 0,
  });

  // Scroll to top when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const scrollToTop = () => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
      };
      
      scrollToTop();
    }, [])
  );

  useEffect(() => {
    if (!isAuthenticated || !user || !db) {
      return; // Don't load data until authenticated
    }

    // Set up real-time listener for pending bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('status', '==', 'pending')
    );

    let currentPendingCount = 0;

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          studioId: data.studioId,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate(),
          status: data.status,
          purpose: data.purpose,
          recurringPattern: data.recurringPattern,
          recurringGroupId: data.recurringGroupId,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          recurringEndDate: data.recurringEndDate ? data.recurringEndDate.toDate() : undefined,
        };
      }) as Booking[];

      setPendingBookings(bookingsData);
      currentPendingCount = bookingsData.length;
    });

    // Set up real-time listener for users (for stats)
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (usersSnapshot) => {
      let totalMembers = 0;
      let contractUsers = 0;
      let noContractUsers = 0;
      let adminCount = 0;
      let instructorCount = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        
        // Count all users
        totalMembers++;
        
        // Count contract vs no-contract users
        if (userData.noMembership === true) {
          noContractUsers++;
        } else {
          contractUsers++;
        }
        
        if (userData.role === 'admin') {
          adminCount++;
        }
        if (userData.isInstructor === true) {
          instructorCount++;
        }
      });

      // Get upcoming events count
      const eventsQuery = query(collection(db!, 'specialEvents'), where('endDate', '>=', new Date()));
      getDocs(eventsQuery).then((eventsSnapshot) => {
        setStats({
          totalMembers,
          contractUsers,
          noContractUsers,
          pendingBookings: currentPendingCount,
          upcomingEvents: eventsSnapshot.size,
          adminCount,
          instructorCount,
        });
        setLoading(false);
      }).catch(() => {
        setStats({
          totalMembers,
          contractUsers,
          noContractUsers,
          pendingBookings: currentPendingCount,
          upcomingEvents: 0,
          adminCount,
          instructorCount,
        });
        setLoading(false);
      });
    });

    // Cleanup listeners
    return () => {
      unsubscribeBookings();
      unsubscribeUsers();
    };
  }, [isAuthenticated, user, db]);

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
    
    try {
      const bookingsQuery = query(
        collection(db!, 'bookings'),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(bookingsQuery);
      
      const bookingsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          recurringEndDate: data.recurringEndDate ? data.recurringEndDate.toDate() : undefined,
        };
      }) as Booking[];

      setPendingBookings(bookingsData);

      // Try to load additional stats with graceful fallback
      let totalMembers = 0;
      let contractUsers = 0;
      let noContractUsers = 0;
      let upcomingEvents = 0;
      let adminCount = 0;
      let instructorCount = 0;
      
      try {
        const usersQuery = query(collection(db!, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        
        // Count users by role and membership status
        usersSnapshot.docs.forEach((doc) => {
          const userData = doc.data();
          
          // Count all users
          totalMembers++;
          
          // Count contract vs no-contract users
          if (userData.noMembership === true) {
            noContractUsers++;
          } else {
            contractUsers++;
          }
          
          if (userData.role === 'admin') {
            adminCount++;
          }
          if (userData.isInstructor === true) {
            instructorCount++;
          }
        });
      } catch (usersError) {
        // Silently handle users query failure
        console.error('Error loading users count:', usersError);
        totalMembers = 0;
        contractUsers = 0;
        noContractUsers = 0;
        adminCount = 0;
        instructorCount = 0;
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
        contractUsers,
        noContractUsers,
        pendingBookings: bookingsData.length,
        upcomingEvents,
        adminCount,
        instructorCount,
      });
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRecurringGroup = async (recurringGroupId: string) => {
    try {
      const bookingsToApprove = pendingBookings.filter(b => b.recurringGroupId === recurringGroupId);
      
      await Promise.all(
        bookingsToApprove.map(booking =>
          updateDoc(doc(db!, 'bookings', booking.id), {
            status: 'approved',
            approvedBy: user?.id,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
        )
      );

      Alert.alert(t('common.success'), `${bookingsToApprove.length} recurring bookings approved`);
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const handleRejectRecurringGroup = async (recurringGroupId: string) => {
    const reason = 'Rejected by admin';

    try {
      const bookingsToReject = pendingBookings.filter(b => b.recurringGroupId === recurringGroupId);
      
      await Promise.all(
        bookingsToReject.map(booking =>
          updateDoc(doc(db!, 'bookings', booking.id), {
            status: 'rejected',
            rejectionReason: reason,
            updatedAt: new Date(),
          })
        )
      );

      Alert.alert(t('common.success'), `${bookingsToReject.length} recurring bookings rejected`);
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      await updateDoc(doc(db!, 'bookings', bookingId), {
        status: 'approved',
        approvedBy: user?.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert(t('common.success'), 'Booking approved');
    } catch (error) {
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    // For web compatibility, use a simple confirmation. In production, replace with a custom modal.
    const reason = 'Rejected by admin'; // You can replace this with a custom modal input later.

    try {
      await updateDoc(doc(db!, 'bookings', bookingId), {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date(),
      });

      Alert.alert(t('common.success'), 'Booking rejected');
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
                <Ionicons name="document-text-outline" size={32} color={theme.colors.success} />
                <Text style={styles.statValue}>{stats.contractUsers}</Text>
                <Text style={styles.statLabel}>{t('admin.contractUsers')}</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="close-circle-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={styles.statValue}>{stats.noContractUsers}</Text>
                <Text style={styles.statLabel}>{t('admin.noContractUsers')}</Text>
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

              <View style={styles.statCard}>
                <Ionicons name="shield-checkmark-outline" size={32} color={theme.colors.error} />
                <Text style={styles.statValue}>{stats.adminCount}</Text>
                <Text style={styles.statLabel}>{t('admin.adminCount')}</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="school-outline" size={32} color={theme.colors.info} />
                <Text style={styles.statValue}>{stats.instructorCount}</Text>
                <Text style={styles.statLabel}>{t('admin.instructorCount')}</Text>
              </View>
            </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.pendingBookings')}</Text>

          {pendingBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('admin.noPendingBookings')}</Text>
            </View>
          ) : (
            (() => {
              // Group bookings by recurringGroupId
              const groupedBookings: { [key: string]: Booking[] } = {};
              const standaloneBookings: Booking[] = [];

              pendingBookings.forEach(booking => {
                if (booking.recurringGroupId) {
                  if (!groupedBookings[booking.recurringGroupId]) {
                    groupedBookings[booking.recurringGroupId] = [];
                  }
                  groupedBookings[booking.recurringGroupId].push(booking);
                } else {
                  standaloneBookings.push(booking);
                }
              });

              // Sort bookings within each group by startTime
              Object.keys(groupedBookings).forEach(groupId => {
                groupedBookings[groupId].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
              });

              // Render recurring groups first, then standalone bookings
              const recurringGroupCards = Object.entries(groupedBookings).map(([groupId, bookings]) => {
                const firstBooking = bookings[0];
                const lastBooking = bookings[bookings.length - 1];
                const studio =
                  firstBooking.studioId === 'studio-1-big' ? STUDIOS.BIG : 
                  firstBooking.studioId === 'studio-2-small' ? STUDIOS.SMALL : STUDIOS.OFFSITE;

                return (
                  <View key={groupId} style={[styles.bookingCard, styles.recurringBookingCard]}>
                    <View style={[styles.studioIndicator, { backgroundColor: studio.color }]} />
                    <View style={styles.bookingContent}>
                      <View style={styles.bookingHeader}>
                        <View style={styles.recurringBadgeContainer}>
                          <Ionicons name="repeat-outline" size={16} color={theme.colors.primary} style={styles.recurringBadgeIcon} />
                          <Text style={styles.recurringBadge}>{t('calendar.recurringBooking')}</Text>
                        </View>
                        <View style={styles.studioBadge}>
                          <Text style={styles.studioBadgeText}>{studio.name}</Text>
                        </View>
                      </View>

                      <Text style={styles.bookingUser}>{firstBooking.userName}</Text>

                      <View style={styles.bookingDetail}>
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.bookingDetailText}>
                          {bookings.length} bookings: {formatDateTime(firstBooking.startTime).split(',')[0]} - {formatDateTime(lastBooking.startTime).split(',')[0]}
                        </Text>
                      </View>

                      <View style={styles.bookingDetail}>
                        <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.bookingDetailText}>
                          {firstBooking.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - {firstBooking.endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>

                      <View style={styles.bookingDetail}>
                        <Ionicons name="repeat-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.bookingDetailText}>
                          {firstBooking.recurringPattern ? t(`calendar.recurringPattern.${firstBooking.recurringPattern}`) : 'Weekly'}
                        </Text>
                      </View>

                      {firstBooking.purpose && (
                        <View style={styles.bookingDetail}>
                          <Ionicons name="document-text-outline" size={16} color={theme.colors.textSecondary} />
                          <Text style={styles.bookingDetailText}>{firstBooking.purpose}</Text>
                        </View>
                      )}

                      <View style={styles.bookingActions}>
                        <Button
                          title={t('admin.approveAll', { count: bookings.length })}
                          onPress={() => handleApproveRecurringGroup(groupId)}
                          variant="success"
                          size="small"
                          style={styles.actionButton}
                        />
                        <Button
                          title={t('admin.rejectAll', { count: bookings.length })}
                          onPress={() => handleRejectRecurringGroup(groupId)}
                          variant="danger"
                          size="small"
                          style={styles.actionButton}
                        />
                      </View>
                    </View>
                  </View>
                );
              });

              const standaloneCards = standaloneBookings.map((booking) => {
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
              });

              return [...recurringGroupCards, ...standaloneCards];
            })()
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
            onPress={() => navigation.navigate('ManageGroups')}
          >
            <Ionicons name="people-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.actionCardText}>{t('admin.manageGroups')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SessionCards')}
          >
            <Ionicons name="card-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.actionCardText}>{t('admin.sessionCards')}</Text>
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
    flexWrap: 'wrap',
    padding: theme.spacing.md,
  },
  statCard: {
    minWidth: 100,
    flexBasis: '18%',
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    margin: theme.spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    marginBottom: theme.spacing.xs,
  },
  bookingDetailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  bookingActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
  },
  recurringBookingCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  recurringBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
  },
  recurringBadgeIcon: {
    marginRight: 4,
  },
  recurringBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
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
