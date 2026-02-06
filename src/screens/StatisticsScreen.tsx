import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { AppHeader } from '../components/AppHeader';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { getPaymentStats } from '../services/paymentService';

// Membership pricing structure
const MEMBERSHIP_PRICING = {
  '1-class': 55,
  '2-classes': 90,
  '3-classes': 120,
  'all-you-can-dance': 130,
} as const;

interface Statistics {
  totalUsers: number;
  activeUsers: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  expectedMonthlyRevenue: number;
  cashPayments: number;
  bankPayments: number;
  upcomingEvents: number;
  publishedNews: number;
  studioUtilization: {
    studioBig: number;
    studioSmall: number;
  };
  userGrowth: {
    thisMonth: number;
    lastMonth: number;
  };
  bookingTrends: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export const StatisticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  const loadStatistics = async () => {
    setLoading(true);
    
    try {
      // In a real app, these would be actual Firebase queries
      const usersQuery = query(collection(db!, 'users'));
      const bookingsQuery = query(collection(db!, 'bookings'));
      const eventsQuery = query(collection(db!, 'specialEvents'));
      const newsQuery = query(collection(db!, 'news'));

      const [usersSnapshot, bookingsSnapshot, eventsSnapshot, newsSnapshot] = await Promise.all([
        getDocs(usersQuery),
        getDocs(bookingsQuery),
        getDocs(eventsQuery),
        getDocs(newsQuery),
      ]);

      // Calculate revenue from user memberships
      const usersData = usersSnapshot.docs.map(doc => doc.data());
      const membershipRevenue = usersData.reduce((total, user) => {
        // Only include users who:
        // 1. Are active
        // 2. Have a contract (noMembership is false, null, or undefined)
        // 3. Have a membershipType set
        if (user.isActive && user.noMembership !== true && user.membershipType) {
          return total + MEMBERSHIP_PRICING[user.membershipType as keyof typeof MEMBERSHIP_PRICING];
        }
        return total;
      }, 0);

      // Calculate user growth
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthUsers = usersData.filter(user => {
        const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        return createdAt >= thisMonthStart;
      }).length;

      const lastMonthUsers = usersData.filter(user => {
        const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
      }).length;

      // Calculate booking trends
      const bookingsData = bookingsSnapshot.docs.map(doc => doc.data());
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const dailyBookings = bookingsData.filter(booking => {
        const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
        return createdAt >= todayStart;
      }).length;

      const weeklyBookings = bookingsData.filter(booking => {
        const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
        return createdAt >= weekStart;
      }).length;

      const monthlyBookings = bookingsData.filter(booking => {
        const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
        return createdAt >= thisMonthStart;
      }).length;

      // Calculate studio utilization (percentage of time booked)
      const monthHours = 30 * 12; // Assume 12 hours/day available for 30 days
      const bigStudioBookings = bookingsData.filter(b => b.studioId === 'studio-1-big');
      const smallStudioBookings = bookingsData.filter(b => b.studioId === 'studio-2-small');

      const bigStudioHours = bigStudioBookings.reduce((total, booking) => {
        const start = booking.startTime?.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
        const end = booking.endTime?.toDate ? booking.endTime.toDate() : new Date(booking.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);

      const smallStudioHours = smallStudioBookings.reduce((total, booking) => {
        const start = booking.startTime?.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
        const end = booking.endTime?.toDate ? booking.endTime.toDate() : new Date(booking.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);

      const bigStudioUtilization = Math.min(Math.round((bigStudioHours / monthHours) * 100), 100);
      const smallStudioUtilization = Math.min(Math.round((smallStudioHours / monthHours) * 100), 100);

      // Get actual payment data
      let paymentStats = {
        totalRevenue: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        cashPayments: 0,
        bankPayments: 0,
      };

      try {
        paymentStats = await getPaymentStats();
      } catch (error) {
        console.error('Error loading payment stats:', error);
      }

      // Calculate statistics from real data
      const stats: Statistics = {
        totalUsers: usersSnapshot.size,
        activeUsers: usersSnapshot.docs.filter(doc => doc.data().isActive).length,
        totalBookings: bookingsSnapshot.size,
        pendingBookings: bookingsSnapshot.docs.filter(doc => doc.data().status === 'pending').length,
        completedBookings: bookingsSnapshot.docs.filter(doc => doc.data().status === 'completed').length,
        totalRevenue: paymentStats.totalRevenue,
        monthlyRevenue: paymentStats.monthlyRevenue,
        yearlyRevenue: paymentStats.yearlyRevenue,
        expectedMonthlyRevenue: membershipRevenue,
        cashPayments: paymentStats.cashPayments,
        bankPayments: paymentStats.bankPayments,
        upcomingEvents: eventsSnapshot.docs.filter(doc => doc.data().isPublished).length,
        publishedNews: newsSnapshot.docs.filter(doc => doc.data().isPublished).length,
        studioUtilization: {
          studioBig: bigStudioUtilization,
          studioSmall: smallStudioUtilization,
        },
        userGrowth: {
          thisMonth: thisMonthUsers,
          lastMonth: lastMonthUsers,
        },
        bookingTrends: {
          daily: dailyBookings,
          weekly: weeklyBookings,
          monthly: monthlyBookings,
        },
      };

      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    subtitle?: string;
  }) => (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={32} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ProgressCard = ({ title, value, maxValue, color }: {
    title: string;
    value: number;
    maxValue: number;
    color: string;
  }) => {
    const percentage = (value / maxValue) * 100;
    
    return (
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>{title}</Text>
          <Text style={styles.progressValue}>{value}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${percentage}%`, backgroundColor: color }
            ]} 
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
          <AppHeader title={t('admin.statistics')} />
          <FlamencoLoading 
            message={t('admin.loadingStatistics')} 
            size="large" 
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!statistics) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
          <AppHeader title={t('admin.statistics')} />
          <View style={styles.errorContainer}>
            <Text>{t('admin.loadingStatistics')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <AppHeader title={t('admin.statistics')} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.overview')}</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('admin.totalMembers')}
              value={statistics.totalUsers}
              icon="people-outline"
              color={theme.colors.primary}
              subtitle={`${statistics.activeUsers} ${t('admin.activeUsers')}`}
            />
            <StatCard
              title={t('admin.totalBookings')}
              value={statistics.totalBookings}
              icon="calendar-outline"
              color={theme.colors.success}
              subtitle={`${statistics.pendingBookings} ${t('calendar.pending')}`}
            />
            <StatCard
              title={t('admin.totalPaymentsReceived')}
              value={`€${statistics.totalRevenue.toFixed(2)}`}
              icon="cash-outline"
              color={theme.colors.success}
              subtitle={`€${statistics.monthlyRevenue.toFixed(2)} ${t('admin.thisMonth')}`}
            />
            <StatCard
              title={t('admin.expectedMonthlyRevenue')}
              value={`€${statistics.expectedMonthlyRevenue.toFixed(2)}`}
              icon="card-outline"
              color={theme.colors.warning}
              subtitle={t('admin.fromActiveContracts')}
            />
            <StatCard
              title={t('admin.content')}
              value={statistics.upcomingEvents + statistics.publishedNews}
              icon="library-outline"
              color={theme.colors.info}
              subtitle={`${statistics.upcomingEvents} ${t('admin.events')}, ${statistics.publishedNews} ${t('admin.news')}`}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.studioUtilization')}</Text>
          <ProgressCard
            title={t('events.bigStudio')}
            value={statistics.studioUtilization.studioBig}
            maxValue={100}
            color={theme.colors.studioBig}
          />
          <ProgressCard
            title={t('events.smallStudio')}
            value={statistics.studioUtilization.studioSmall}
            maxValue={100}
            color={theme.colors.studioSmall}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.userGrowth')}</Text>
          <View style={styles.growthContainer}>
            <View style={styles.growthCard}>
              <Text style={styles.growthLabel}>{t('admin.thisMonth')}</Text>
              <Text style={styles.growthValue}>+{statistics.userGrowth.thisMonth}</Text>
              <Text style={styles.growthDescription}>{t('admin.newUsers')}</Text>
            </View>
            <View style={styles.growthCard}>
              <Text style={styles.growthLabel}>{t('admin.lastMonth')}</Text>
              <Text style={styles.growthValue}>+{statistics.userGrowth.lastMonth}</Text>
              <Text style={styles.growthDescription}>{t('admin.newUsers')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.bookingTrends')}</Text>
          <View style={styles.trendsContainer}>
            <StatCard
              title={t('admin.daily')}
              value={statistics.bookingTrends.daily}
              icon="today-outline"
              color={theme.colors.primary}
            />
            <StatCard
              title={t('admin.weekly')}
              value={statistics.bookingTrends.weekly}
              icon="calendar-outline"
              color={theme.colors.success}
            />
            <StatCard
              title={t('admin.monthly')}
              value={statistics.bookingTrends.monthly}
              icon="calendar-number-outline"
              color={theme.colors.warning}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.performanceMetrics')}</Text>
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                <Text style={styles.metricTitle}>{t('admin.completionRate')}</Text>
              </View>
              <Text style={styles.metricValue}>
                {((statistics.completedBookings / statistics.totalBookings) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.metricDescription}>
                {statistics.completedBookings} {t('admin.of')} {statistics.totalBookings} {t('admin.bookingsCompleted')}
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="trending-up" size={24} color={theme.colors.primary} />
                <Text style={styles.metricTitle}>{t('admin.growthRate')}</Text>
              </View>
              <Text style={styles.metricValue}>
                {statistics.userGrowth.lastMonth > 0 
                  ? (((statistics.userGrowth.thisMonth - statistics.userGrowth.lastMonth) / statistics.userGrowth.lastMonth) * 100).toFixed(1)
                  : '0'}%
              </Text>
              <Text style={styles.metricDescription}>
                {t('admin.userGrowthCompared')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    paddingBottom: 100, // Add padding for bottom tabs
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  section: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl, // Extra padding at bottom
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
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
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  growthContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
  },
  growthCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flex: 1,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  growthLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  growthValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginVertical: theme.spacing.xs,
  },
  growthDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  trendsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
  },
  metricsContainer: {  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',    marginBottom: theme.spacing.sm,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  metricDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
