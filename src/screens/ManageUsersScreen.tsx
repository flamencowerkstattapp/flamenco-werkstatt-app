import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl, SafeAreaView, TextInput, Modal, TouchableOpacity, ViewStyle, Dimensions } from 'react-native';
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

const MEMBERSHIP_OPTIONS = [
  { value: '1-class', labelKey: 'user.membershipTypes.1-class', priceKey: 'user.membershipPricing.1-class' },
  { value: '2-classes', labelKey: 'user.membershipTypes.2-classes', priceKey: 'user.membershipPricing.2-classes' },
  { value: '3-classes', labelKey: 'user.membershipTypes.3-classes', priceKey: 'user.membershipPricing.3-classes' },
  { value: 'all-you-can-dance', labelKey: 'user.membershipTypes.all-you-can-dance', priceKey: 'user.membershipPricing.all-you-can-dance' },
] as const;

export const ManageUsersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, signUp } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const modalScrollViewRef = useRef<ScrollView>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{userId: string; currentRole: UserRole; userName: string} | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set()); // Track completed actions
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    membershipType: '1-class' as '1-class' | '2-classes' | '3-classes' | 'all-you-can-dance',
    role: 'member' as UserRole,
    emergencyContact: '',
    emergencyPhone: '',
    danceLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced' | 'professional',
    preferredStyles: '',
  });

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

  const toggleUserRole = (userId: string, currentRole: UserRole) => {
    const actionKey = `role-${userId}`;
    if (completedActions.has(actionKey)) return; // Prevent duplicate actions
    
    const user = users.find(u => u.id === userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'User';
    
    // Show confirmation modal
    setConfirmAction({ userId, currentRole, userName });
    setShowConfirmModal(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!confirmAction) return;
    
    const { userId, currentRole } = confirmAction;
    const actionKey = `role-${userId}`;
    const newRole: UserRole = currentRole === 'admin' ? 'member' : 'admin';
    
    setShowConfirmModal(false);
    
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
    } finally {
      setConfirmAction(null);
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

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      membershipType: '1-class',
      role: 'member',
      emergencyContact: '',
      emergencyPhone: '',
      danceLevel: 'beginner',
      preferredStyles: '',
    });
    setEditingUserId(null);
  };

  const openAddUserModal = () => {
    resetForm();
    setShowUserModal(true);
  };

  const openEditUserModal = (userToEdit: User) => {
    setFormData({
      firstName: userToEdit.firstName || '',
      lastName: userToEdit.lastName || '',
      email: userToEdit.email || '',
      phone: userToEdit.phone || '',
      password: '', // Not used for editing existing users
      membershipType: userToEdit.membershipType || '1-class',
      role: userToEdit.role,
      emergencyContact: userToEdit.emergencyContact || '',
      emergencyPhone: userToEdit.emergencyPhone || '',
      danceLevel: userToEdit.danceLevel || 'beginner',
      preferredStyles: userToEdit.preferredStyles || '',
    });
    setEditingUserId(userToEdit.id);
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.firstName || !formData.email || !formData.phone) {
      Alert.alert(t('common.error'), t('admin.fillRequiredFields'));
      return;
    }

    // For new users, require password
    if (!editingUserId && !formData.password) {
      Alert.alert(t('common.error'), 'Password is required for new users');
      return;
    }

    // Validate password length for new users
    if (!editingUserId && formData.password.length < 6) {
      Alert.alert(t('common.error'), 'Password must be at least 6 characters');
      return;
    }

    try {
      if (editingUserId) {
        // Update existing user
        await updateDoc(doc(getFirestoreDB(), 'users', editingUserId), {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          membershipType: formData.membershipType,
          emergencyContact: formData.emergencyContact,
          emergencyPhone: formData.emergencyPhone,
          danceLevel: formData.danceLevel,
          preferredStyles: formData.preferredStyles,
          updatedAt: new Date(),
        });
        Alert.alert(
          t('admin.userUpdatedTitle'),
          t('admin.userUpdatedBody', { name: `${formData.firstName} ${formData.lastName}` })
        );
      } else {
        // Create new user with Firebase Auth
        await signUp(formData.email, formData.password, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          preferredLanguage: 'de',
        });
        
        // Wait a moment for the user to be created in Firestore
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find the newly created user and update with all additional fields
        const usersSnapshot = await getDocs(
          query(collection(getFirestoreDB(), 'users'), where('email', '==', formData.email))
        );
        
        if (!usersSnapshot.empty) {
          const newUserId = usersSnapshot.docs[0].id;
          await updateDoc(doc(getFirestoreDB(), 'users', newUserId), {
            role: formData.role,
            membershipType: formData.membershipType,
            emergencyContact: formData.emergencyContact,
            emergencyPhone: formData.emergencyPhone,
            danceLevel: formData.danceLevel,
            preferredStyles: formData.preferredStyles,
          });
        }
        
        Alert.alert(
          t('admin.userAddedTitle'),
          t('admin.userAddedBody', { name: `${formData.firstName} ${formData.lastName}` })
        );
      }
      
      setShowUserModal(false);
      resetForm();
      await loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      let errorMessage = editingUserId ? t('admin.errorUpdatingUser') : t('admin.errorAddingUser');
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      
      Alert.alert(t('common.error'), errorMessage);
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
          <Button
            title={t('admin.addUser')}
            onPress={openAddUserModal}
            variant="primary"
            style={styles.addButton}
          />
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
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} style={styles.detailItemIcon} />
                    <Text style={styles.detailText}>{t('admin.joined')}: {formatDateTime(user.memberSince)}</Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Ionicons name="globe-outline" size={16} color={theme.colors.textSecondary} style={styles.detailItemIcon} />
                    <Text style={styles.detailText}>Language: {user.preferredLanguage.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.userActions}>
                <Button
                  title={t('common.edit')}
                  onPress={() => openEditUserModal(user)}
                  variant="outline"
                  size="small"
                  style={styles.actionButton}
                />
                
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

      {/* Add/Edit User Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView ref={modalScrollViewRef} contentContainerStyle={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUserId ? t('admin.editUser') : t('admin.addNewUser')}
              </Text>
              <Button
                title={t('common.cancel')}
                onPress={() => {
                  setShowUserModal(false);
                  resetForm();
                }}
                variant="outline"
                size="small"
              />
            </View>

            <View style={styles.form}>
              <Text style={styles.sectionTitle}>{t('user.basicInformation')}</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.firstName')} *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({...formData, firstName: text})}
                  placeholder={t('user.enterFirstName')}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.lastName')} *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({...formData, lastName: text})}
                  placeholder={t('user.enterLastName')}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.email')} *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder={t('user.enterEmailAddress')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.phone')} *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder={t('user.enterPhoneNumber')}
                  keyboardType="phone-pad"
                />
              </View>

              {!editingUserId && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={(text) => setFormData({...formData, password: text})}
                    placeholder="Enter password (min 6 characters)"
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </View>
              )}

              <Text style={styles.sectionTitle}>{t('user.membershipDetails')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.membershipType')}</Text>
                <View style={styles.membershipOptions}>
                  {MEMBERSHIP_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.membershipOption,
                        formData.membershipType === option.value && styles.selectedMembership
                      ]}
                      onPress={() => setFormData({...formData, membershipType: option.value})}
                    >
                      <Text style={[
                        styles.membershipText,
                        formData.membershipType === option.value && styles.selectedMembershipText
                      ]}>
                        {t(option.labelKey)}
                      </Text>
                      <Text style={[
                        styles.membershipPrice,
                        formData.membershipType === option.value && styles.selectedMembershipPrice
                      ]}>
                        {t(option.priceKey)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.role')}</Text>
                <View style={styles.roleOptions}>
                  {(['member', 'admin'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        formData.role === role && styles.selectedRole
                      ]}
                      onPress={() => setFormData({...formData, role})}
                    >
                      <Text style={[
                        styles.roleText,
                        formData.role === role && styles.selectedRoleText
                      ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionTitle}>{t('user.emergencyContact')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.emergencyContactName')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.emergencyContact}
                  onChangeText={(text) => setFormData({...formData, emergencyContact: text})}
                  placeholder={t('user.enterEmergencyContactName')}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.emergencyContactPhone')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.emergencyPhone}
                  onChangeText={(text) => setFormData({...formData, emergencyPhone: text})}
                  placeholder={t('user.enterEmergencyContactPhone')}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.sectionTitle}>{t('user.danceInformation')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.danceLevel')}</Text>
                <View style={styles.levelOptions}>
                  {(['beginner', 'intermediate', 'advanced', 'professional'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.levelOption,
                        formData.danceLevel === level && styles.selectedLevel
                      ]}
                      onPress={() => setFormData({...formData, danceLevel: level})}
                    >
                      <Text style={[
                        styles.levelText,
                        formData.danceLevel === level && styles.selectedLevelText
                      ]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.preferredDanceStyles')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.preferredStyles}
                  onChangeText={(text) => setFormData({...formData, preferredStyles: text})}
                  placeholder={t('user.danceStylesExample')}
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  title={editingUserId ? t('common.save') : t('admin.addUser')}
                  onPress={handleSaveUser}
                  variant="primary"
                  style={styles.submitButton}
                />
              </View>
            </View>
          </ScrollView>
        
          <ScrollToTopButton scrollViewRef={modalScrollViewRef} />
        </SafeAreaView>
      </Modal>

      {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}

      {/* Role Change Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="warning" size={48} color={theme.colors.warning} />
              <Text style={styles.confirmModalTitle}>Confirm Role Change</Text>
            </View>
            
            {confirmAction && (
              <Text style={styles.confirmModalMessage}>
                Are you sure you want to change {confirmAction.userName}'s role from {confirmAction.currentRole} to {confirmAction.currentRole === 'admin' ? 'member' : 'admin'}?
                {'\n\n'}
                This action will modify their access permissions.
              </Text>
            )}
            
            <View style={styles.confirmModalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                variant="outline"
                style={styles.confirmModalButton}
              />
              <Button
                title="Confirm"
                onPress={handleConfirmRoleChange}
                variant="danger"
                style={styles.confirmModalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: theme.spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  detailItemIcon: {
    marginRight: theme.spacing.xs,
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
  addButton: {
    minWidth: 100,
  },
  // Modal styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalContainer: {
    padding: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  form: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  // Membership options
  membershipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  membershipOption: {
    flex: 1,
    minWidth: '45%',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  selectedMembership: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  membershipText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  membershipPrice: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedMembershipText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  selectedMembershipPrice: {
    color: theme.colors.surface,
    fontWeight: '500',
  },
  // Role options
  roleOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  roleOption: {
    flex: 1,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  selectedRole: {
    backgroundColor: theme.colors.warning,
    borderColor: theme.colors.warning,
  },
  roleText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedRoleText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  // Dance level options
  levelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  levelOption: {
    width: '48%',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  selectedLevel: {
    backgroundColor: theme.colors.info,
    borderColor: theme.colors.info,
  },
  levelText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  selectedLevelText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  modalActions: {
    marginTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  submitButton: {
    marginBottom: theme.spacing.xl,
  },
  // Confirmation Modal styles
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  confirmModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.large,
  },
  confirmModalHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  confirmModalButton: {
    flex: 1,
  },
});
