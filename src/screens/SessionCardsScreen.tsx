import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs } from 'firebase/firestore';
import { getFirestoreDB } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { AppHeader } from '../components/AppHeader';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { User, PaymentMethod, SessionCard } from '../types';
import { createSessionCard, getAllSessionCards, getSessionCardStats } from '../services/sessionCardService';
import { formatDateTime } from '../utils/dateUtils';
import { useAppForeground } from '../hooks/useAppForeground';

const SESSION_CARD_PRICES = [
  { value: 95, label: '€95', key: 'standard' },
  { value: 120, label: '€120', key: 'premium' },
] as const;

export const SessionCardsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSales, setRecentSales] = useState<SessionCard[]>([]);
  const [stats, setStats] = useState({ totalCards: 0, totalRevenue: 0, monthlyCards: 0, monthlyRevenue: 0 });

  // Responsive design
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Scroll to top and reload data when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const scrollToTop = () => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
      };
      scrollToTop();
      loadData();
    }, [])
  );

  // Reload data when app returns to foreground
  useAppForeground(() => {
    loadData();
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers([]);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = users.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const loadData = async () => {
    setLoading(true);
    try {
      const db = getFirestoreDB();
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);

      const usersData = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          isInstructor: data.isInstructor || false,
          phone: data.phone,
          memberSince: data.memberSince?.toDate() || new Date(),
          isActive: data.isActive !== false,
          preferredLanguage: data.preferredLanguage || 'de',
          membershipType: data.membershipType,
          noMembership: data.noMembership,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as User;
      });

      // Sort alphabetically by name
      usersData.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
      setUsers(usersData);

      // Load recent sales
      const salesData = await getAllSessionCards();
      setRecentSales(salesData.slice(0, 20));

      // Load stats
      const statsData = await getSessionCardStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  const handleSelectUser = (u: User) => {
    setSelectedUser(u);
    setSearchQuery('');
    setFilteredUsers([]);
  };

  const handleRecordSale = async () => {
    if (!selectedUser) {
      Alert.alert(t('common.error'), t('sessionCards.selectUserFirst'));
      return;
    }
    if (!selectedPrice) {
      Alert.alert(t('common.error'), t('sessionCards.selectPriceFirst'));
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      await createSessionCard({
        userId: selectedUser.id,
        userName: `${selectedUser.firstName} ${selectedUser.lastName}`,
        amount: selectedPrice,
        paymentMethod,
        notes: notes.trim() || undefined,
        recordedBy: user.id,
        recordedByName: `${user.firstName} ${user.lastName}`,
      });

      Alert.alert(
        t('sessionCards.saleRecorded'),
        t('sessionCards.saleRecordedSuccess', { userName: `${selectedUser.firstName} ${selectedUser.lastName}` })
      );

      // Reset form
      setSelectedUser(null);
      setSelectedPrice(null);
      setPaymentMethod('cash');
      setNotes('');

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error recording session card:', error);
      Alert.alert(t('common.error'), t('sessionCards.errorRecordingSale'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
          <AppHeader title={t('sessionCards.title')} />
          <FlamencoLoading />
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
        <AppHeader title={t('sessionCards.title')} />

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="card-outline" size={32} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.totalCards}</Text>
            <Text style={styles.statLabel}>{t('sessionCards.totalCardsSold')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={32} color={theme.colors.success} />
            <Text style={styles.statValue}>{'\u20AC'}{stats.totalRevenue.toFixed(2)}</Text>
            <Text style={styles.statLabel}>{t('sessionCards.totalRevenue')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={32} color={theme.colors.warning} />
            <Text style={styles.statValue}>{stats.monthlyCards}</Text>
            <Text style={styles.statLabel}>{t('sessionCards.monthlyCardsSold')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={32} color={theme.colors.info} />
            <Text style={styles.statValue}>{'\u20AC'}{stats.monthlyRevenue.toFixed(2)}</Text>
            <Text style={styles.statLabel}>{t('sessionCards.monthlyRevenue')}</Text>
          </View>
        </View>

        {/* Sale Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('sessionCards.recordSale')}</Text>

          {/* User Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('sessionCards.selectUser')} *</Text>

            {selectedUser ? (
              <View style={styles.selectedUserCard}>
                <Ionicons name="person-circle-outline" size={36} color={theme.colors.primary} />
                <View style={styles.selectedUserInfo}>
                  <Text style={styles.selectedUserName}>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Text>
                  <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedUser(null)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('sessionCards.searchUsers')}
                  placeholderTextColor={theme.colors.textSecondary}
                />
                {filteredUsers.length > 0 && (
                  <View style={styles.searchResults}>
                    {filteredUsers.slice(0, 8).map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.searchResultItem}
                        onPress={() => handleSelectUser(u)}
                      >
                        <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.8)" />
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>
                            {u.firstName} {u.lastName}
                          </Text>
                          <Text style={styles.searchResultEmail}>{u.email}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Price Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('sessionCards.selectPrice')} *</Text>
            <View style={styles.priceOptions}>
              {SESSION_CARD_PRICES.map((price) => (
                <TouchableOpacity
                  key={price.value}
                  style={[
                    styles.priceOption,
                    selectedPrice === price.value && styles.selectedPriceOption,
                  ]}
                  onPress={() => setSelectedPrice(price.value)}
                >
                  <View>
                    <Text
                      style={[
                        styles.priceLabel,
                        selectedPrice === price.value && styles.selectedPriceLabel,
                      ]}
                    >
                      {t(`sessionCards.${price.key}`)}
                    </Text>
                    <Text
                      style={[
                        styles.priceValue,
                        selectedPrice === price.value && styles.selectedPriceValue,
                      ]}
                    >
                      {price.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('sessionCards.paymentMethod')} *</Text>
            <View style={styles.paymentMethodOptions}>
              <TouchableOpacity
                style={[
                  styles.methodOption,
                  paymentMethod === 'cash' && styles.selectedMethod,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <View style={styles.methodContent}>
                  <Ionicons
                    name="cash-outline"
                    size={24}
                    color={paymentMethod === 'cash' ? '#fff' : theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      paymentMethod === 'cash' && styles.selectedMethodText,
                    ]}
                  >
                    {t('payments.cash')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodOption,
                  paymentMethod === 'bank' && styles.selectedMethod,
                ]}
                onPress={() => setPaymentMethod('bank')}
              >
                <View style={styles.methodContent}>
                  <Ionicons
                    name="card-outline"
                    size={24}
                    color={paymentMethod === 'bank' ? '#fff' : theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      paymentMethod === 'bank' && styles.selectedMethodText,
                    ]}
                  >
                    {t('payments.bank')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('sessionCards.notes')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('sessionCards.notesPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <Button
            title={submitting ? t('sessionCards.recording') : t('sessionCards.recordSale')}
            onPress={handleRecordSale}
            variant="primary"
            disabled={submitting || !selectedUser || !selectedPrice}
          />
        </View>

        {/* Recent Sales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('sessionCards.recentSales')}</Text>

          {recentSales.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>{t('sessionCards.noSales')}</Text>
            </View>
          ) : (
            recentSales.map((sale) => (
              <View key={sale.id} style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <View style={styles.saleUserInfo}>
                    <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.saleUserName}>{sale.userName}</Text>
                  </View>
                  <Text style={styles.saleAmount}>{'\u20AC'}{sale.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.saleDetails}>
                  <View style={styles.saleDetail}>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.saleDetailText}>{formatDateTime(sale.createdAt)}</Text>
                  </View>
                  <View style={styles.saleDetail}>
                    <Ionicons
                      name={sale.paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'}
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.saleDetailText}>
                      {sale.paymentMethod === 'cash' ? t('payments.cash') : t('payments.bank')}
                    </Text>
                  </View>
                </View>
                {sale.notes && (
                  <View style={styles.saleDetail}>
                    <Ionicons name="document-text-outline" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.saleDetailText}>{sale.notes}</Text>
                  </View>
                )}
              </View>
            ))
          )}
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
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
  },
  statCard: {
    minWidth: 100,
    flexBasis: '22%',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  section: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  selectedUserInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectedUserEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  searchResults: {
    backgroundColor: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    maxHeight: 200,
    zIndex: 10,
    ...theme.shadows.medium,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  searchResultEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  priceOptions: {
    flexDirection: 'row',
  },
  priceOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
  },
  selectedPriceOption: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  selectedPriceLabel: {
    color: '#fff',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  selectedPriceValue: {
    color: '#fff',
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
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  saleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  saleUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  saleAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.success,
  },
  saleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  saleDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  saleDetailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
});
