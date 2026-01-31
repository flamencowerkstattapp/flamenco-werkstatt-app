import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl, SafeAreaView, TouchableOpacity, ViewStyle, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where, updateDoc, doc } from 'firebase/firestore';
import { getFirestoreDB } from '../services/firebase';
import { Button } from '../components/Button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { useAuth } from '../contexts/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { theme } from '../constants/theme';
import { STUDIOS } from '../constants/studios';
import { t } from '../locales';
import { User, UserRole } from '../types';
import { formatDateTime } from '../utils/dateUtils';


export const ManageUsersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set()); // Track completed actions

  // Responsive design
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Determine columns based on screen width
  const getColumns = () => {
    if (screenWidth >= 768) return 4; // Desktop - 4 columns
    if (screenWidth >= 480) return 3; // Tablet - 3 columns
    if (screenWidth >= 360) return 2; // Large mobile - 2 columns
    return 1; // Small mobile - 1 column
  };
  
  const getCardWidth = () => {
    const columns = getColumns();
    const gap = columns > 1 ? 2 : 0; // 2% gap for multi-column
    return (100 - gap * (columns - 1)) / columns;
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getRoleButtonStyle = (userRole: UserRole): ViewStyle => {
    return {
      ...styles.actionButton,
      backgroundColor: userRole === 'admin' ? STUDIOS.SMALL.color : STUDIOS.BIG.color,
      borderColor: userRole === 'admin' ? STUDIOS.SMALL.color : STUDIOS.BIG.color,
    };
  };

  const loadUsers = async () => {
    setLoading(true);
    
    try {
      const usersQuery = query(collection(getFirestoreDB(), 'users'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        memberSince: doc.data().memberSince?.toDate() || new Date(),
      })) as User[];

      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert(t('common.error'), 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const toggleUserRole = async (userId: string, currentRole: UserRole) => {
    const actionKey = `role-${userId}`;
    if (completedActions.has(actionKey)) return; // Prevent duplicate actions
    
    const newRole: UserRole = currentRole === 'admin' ? 'member' : 'admin';
    
    try {
      await updateDoc(doc(getFirestoreDB(), 'users', userId), { role: newRole });
      await loadUsers();
      Alert.alert(
        t('admin.userRoleChangedTitle'),
        t('admin.userRoleChangedBody', { role: newRole })
      );
      setCompletedActions(prev => new Set(prev).add(actionKey)); // Lock this action
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert(t('common.error'), t('admin.errorUpdatingUserRole'));
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const actionKey = `status-${userId}`;
    if (completedActions.has(actionKey)) return; // Prevent duplicate actions
    
    const newStatus = !currentStatus;
    
    try {
      await updateDoc(doc(getFirestoreDB(), 'users', userId), { isActive: newStatus });
      await loadUsers();
      Alert.alert(
        t('admin.userStatusChangedTitle'),
        t('admin.userStatusChangedBody', { 
          status: t(`admin.user${newStatus ? 'Activated' : 'Deactivated'}`) 
        })
      );
      setCompletedActions(prev => new Set(prev).add(actionKey)); // Lock this action
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert(t('common.error'), t('admin.errorUpdatingUserStatus'));
    }
  };



  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <AppHeader title={t('admin.manageUsers')} />

        <View style={styles.header}>
          <View>
            <Text style={styles.totalUsers}>{t('admin.totalUsers')}: {users.length}</Text>
            <Text style={styles.activeUsers}>{t('admin.activeUsers')}: {users.filter(u => u.isActive).length}</Text>
          </View>
        </View>

        {loading ? (
          <FlamencoLoading 
            message={t('admin.loadingUsers')} 
            size="large" 
          />
        ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.usersGrid}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {users.map((user) => (
            <View key={user.id} style={[
              styles.userCard,
              { width: `${getCardWidth()}%` }
            ]}>
              <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: user.role === 'admin' ? theme.colors.warning : theme.colors.info }]}>
                    <Text style={styles.roleBadgeText}>{user.role}</Text>
                  </View>
                </View>
                
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.phone && <Text style={styles.userEmail}>{user.phone}</Text>}
                
                <View style={styles.userDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>{t('admin.joined')}: {formatDateTime(user.memberSince)}</Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Ionicons name="globe-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>Language: {user.preferredLanguage.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.userActions}>
                <Button
                  title={user.role === 'admin' ? t('admin.makeMember') : t('admin.makeAdmin')}
                  onPress={() => toggleUserRole(user.id, user.role)}
                  variant="outline"
                  size="small"
                  disabled={completedActions.has(`role-${user.id}`)}
                  style={getRoleButtonStyle(user.role)}
                  textStyle={{
                    color: '#000',
                    fontWeight: '600'
                  }}
                />
                
                <Button
                  title={user.isActive ? t('admin.deactivate') : t('admin.activate')}
                  onPress={() => toggleUserStatus(user.id, user.isActive)}
                  variant={user.isActive ? 'danger' : 'success'}
                  size="small"
                  disabled={completedActions.has(`status-${user.id}`)}
                  style={styles.actionButton}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      </View>

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
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingBottom: 100, // Add padding for bottom tabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  totalUsers: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  activeUsers: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  usersGrid: {
    padding: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
  },
  userCard: {
    width: '23.5%',
    minWidth: 200,
    flexGrow: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  roleBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  userDetails: {
    gap: theme.spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  userActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
