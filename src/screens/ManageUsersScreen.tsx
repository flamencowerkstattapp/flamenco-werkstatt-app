import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl, SafeAreaView, TextInput, Modal, TouchableOpacity, ViewStyle, Dimensions, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where, updateDoc, doc } from 'firebase/firestore';
import { getFirestoreDB } from '../services/firebase';
import { Button } from '../components/Button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { PaymentModal } from '../components/PaymentModal';
import { useAuth } from '../contexts/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { theme } from '../constants/theme';
import { STUDIOS } from '../constants/studios';
import { t } from '../locales';
import { User, UserRole, Payment, PaymentType } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import { parseCSV } from '../utils/csvParser';
import { importUsersFromCSV, downloadCSVTemplate, ImportResult } from '../services/csvImportService';
import { createPayment, getUserPayments, checkMonthlyPaymentStatus } from '../services/paymentService';

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
  const [showMembershipConfirmModal, setShowMembershipConfirmModal] = useState(false);
  const [pendingMembershipChange, setPendingMembershipChange] = useState<boolean | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedUserForPayment, setSelectedUserForPayment] = useState<User | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('weekly-class');
  const [userPayments, setUserPayments] = useState<{[userId: string]: Payment[]}>({});
  const [expandedPaymentHistory, setExpandedPaymentHistory] = useState<Set<string>>(new Set()); // Track completed actions
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    membershipType: '1-class' as '1-class' | '2-classes' | '3-classes' | 'all-you-can-dance',
    noMembership: false,
    role: 'member' as UserRole,
    isInstructor: false,
    emergencyContact: '',
    emergencyPhone: '',
    danceLevel: 'beginner' as 'beginner' | 'intermediate' | 'advanced' | 'professional',
    preferredStyles: '',
    preferredLanguage: 'de' as 'de' | 'en' | 'es',
  });

  // Responsive design
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
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

  // Determine columns based on screen width
  const getColumns = () => {
    if (screenWidth >= 768) return 4; // Desktop - 4 columns
    if (screenWidth >= 600) return 3; // Tablet - 3 columns
    if (screenWidth >= 480) return 2; // Large mobile - 2 columns
    return 1; // Small mobile (<480px / <7.5cm) - 1 column
  };
  
  const getCardWidth = () => {
    const columns = getColumns();
    if (columns === 1) return 100; // Full width for single column
    const gap = 2; // 2% gap for multi-column
    return (100 - gap * (columns - 1)) / columns;
  };

  const formatMonthDisplay = (monthStr: string | undefined, language: 'de' | 'en' | 'es') => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const locale = language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUserPayments = async (userId: string) => {
    try {
      const payments = await getUserPayments(userId, 5);
      setUserPayments(prev => ({ ...prev, [userId]: payments }));
    } catch (error) {
      console.error('Error loading user payments:', error);
    }
  };

  const togglePaymentHistory = (userId: string) => {
    const newExpanded = new Set(expandedPaymentHistory);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      if (!userPayments[userId]) {
        loadUserPayments(userId);
      }
    }
    setExpandedPaymentHistory(newExpanded);
  };

  const openPaymentModal = (user: User, type: PaymentType) => {
    setSelectedUserForPayment(user);
    setPaymentType(type);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    if (!selectedUserForPayment || !user) return;

    try {
      let paymentNote = paymentData.notes || '';
      
      // Add membership type info for weekly class payments
      if (paymentData.membershipType) {
        const membershipLabel = t(`user.membershipTypes.${paymentData.membershipType}`);
        paymentNote = paymentNote ? `${membershipLabel} - ${paymentNote}` : membershipLabel;
      }
      
      // Add special class type info for special class payments
      if (paymentData.specialClassType) {
        const specialClassLabel = paymentData.specialClassType === 'technique' 
          ? t('payments.techniqueClass') 
          : t('payments.specialEventClass');
        paymentNote = paymentNote ? `${specialClassLabel} - ${paymentNote}` : specialClassLabel;
      }

      await createPayment({
        userId: selectedUserForPayment.id,
        userName: `${selectedUserForPayment.firstName} ${selectedUserForPayment.lastName}`,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentType: paymentData.paymentType,
        date: paymentData.date,
        month: paymentData.month,
        membershipType: paymentData.membershipType,
        specialClassType: paymentData.specialClassType,
        classId: paymentData.classId,
        notes: paymentNote,
        recordedBy: user.id,
        recordedByName: `${user.firstName} ${user.lastName}`,
        updateUserMembership: paymentData.paymentType === 'weekly-class' && 
                              paymentData.membershipType !== selectedUserForPayment.membershipType,
      });

      Alert.alert(
        t('common.success'),
        t('payments.paymentRecorded')
      );

      loadUserPayments(selectedUserForPayment.id);
      loadUsers(); // Reload users to reflect membership type change
      setShowPaymentModal(false);
      setSelectedUserForPayment(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert(t('common.error'), t('payments.errorRecordingPayment'));
    }
  };

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

  const handleMembershipStatusChange = (newValue: boolean) => {
    setPendingMembershipChange(newValue);
    setShowMembershipConfirmModal(true);
  };

  const handleConfirmMembershipChange = () => {
    if (pendingMembershipChange !== null) {
      // If setting to "No Contract", clear the membershipType to prevent revenue calculation
      if (pendingMembershipChange === true) {
        setFormData({...formData, noMembership: true, membershipType: undefined as any});
      } else {
        // If setting to "Contract", keep existing membershipType or default to '1-class'
        setFormData({
          ...formData, 
          noMembership: false,
          membershipType: formData.membershipType || '1-class'
        });
      }
    }
    setShowMembershipConfirmModal(false);
    setPendingMembershipChange(null);
  };

  const handleCancelMembershipChange = () => {
    setShowMembershipConfirmModal(false);
    setPendingMembershipChange(null);
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
      noMembership: false,
      role: 'member',
      isInstructor: false,
      emergencyContact: '',
      emergencyPhone: '',
      danceLevel: 'beginner',
      preferredStyles: '',
      preferredLanguage: 'de',
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
      noMembership: userToEdit.noMembership || false,
      role: userToEdit.role,
      isInstructor: userToEdit.isInstructor || false,
      emergencyContact: userToEdit.emergencyContact || '',
      emergencyPhone: userToEdit.emergencyPhone || '',
      danceLevel: userToEdit.danceLevel || 'beginner',
      preferredStyles: userToEdit.preferredStyles || '',
      preferredLanguage: userToEdit.preferredLanguage || 'de',
    });
    setEditingUserId(userToEdit.id);
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.firstName || !formData.email || (!editingUserId && !formData.phone)) {
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
        const updateData: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          isInstructor: formData.isInstructor,
          noMembership: formData.noMembership,
          emergencyContact: formData.emergencyContact,
          emergencyPhone: formData.emergencyPhone,
          danceLevel: formData.danceLevel,
          preferredStyles: formData.preferredStyles,
          preferredLanguage: formData.preferredLanguage,
          updatedAt: new Date(),
        };

        // Only include membershipType if it has a value (not undefined)
        if (formData.membershipType) {
          updateData.membershipType = formData.membershipType;
        } else {
          // Explicitly delete the field if it's undefined
          updateData.membershipType = null;
        }

        await updateDoc(doc(getFirestoreDB(), 'users', editingUserId), updateData);
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
          preferredLanguage: formData.preferredLanguage,
        });
        
        // Wait a moment for the user to be created in Firestore
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find the newly created user and update with all additional fields
        const usersSnapshot = await getDocs(
          query(collection(getFirestoreDB(), 'users'), where('email', '==', formData.email))
        );
        
        if (!usersSnapshot.empty) {
          const newUserId = usersSnapshot.docs[0].id;
          const newUserData: any = {
            role: formData.role,
            isInstructor: formData.isInstructor,
            noMembership: formData.noMembership,
            emergencyContact: formData.emergencyContact,
            emergencyPhone: formData.emergencyPhone,
            danceLevel: formData.danceLevel,
            preferredStyles: formData.preferredStyles,
            preferredLanguage: formData.preferredLanguage,
          };

          // Only include membershipType if it has a value
          if (formData.membershipType) {
            newUserData.membershipType = formData.membershipType;
          } else {
            newUserData.membershipType = null;
          }

          await updateDoc(doc(getFirestoreDB(), 'users', newUserId), newUserData);
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

  const handleCSVImport = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setShowImportModal(true);

    try {
      const text = await file.text();
      const parseResult = parseCSV(text);

      if (!parseResult.success) {
        setImportResult({
          success: false,
          totalRows: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: parseResult.errors.length,
          errors: parseResult.errors.slice(0, 50),
          details: [],
        });
        setImporting(false);
        return;
      }

      if (parseResult.data.length === 0) {
        setImportResult({
          success: false,
          totalRows: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: 1,
          errors: ['CSV file contains no valid data rows'],
          details: [],
        });
        setImporting(false);
        return;
      }

      const result = await importUsersFromCSV(parseResult.data, user?.id || '');
      setImportResult(result);
      
      if (result.success) {
        await loadUsers();
      }
    } catch (error) {
      setImportResult({
        success: false,
        totalRows: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Failed to import CSV'],
        details: [],
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    downloadCSVTemplate();
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
          <View style={styles.headerStats}>
            <Text style={styles.totalUsers}>{t('admin.totalUsers')}: {users.length}</Text>
            <Text style={styles.activeUsers}>{t('admin.activeUsers')}: {users.filter(u => u.isActive).length}</Text>
          </View>
          <View style={[styles.headerActions, screenWidth < 360 && styles.headerActionsNarrow]}>
            <TouchableOpacity
              style={[styles.templateButton, screenWidth < 360 && styles.iconOnlyButton]}
              onPress={handleDownloadTemplate}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="download-outline" size={20} color={theme.colors.primary} />
                {screenWidth >= 360 && <Text style={styles.templateButtonText}>CSV Template</Text>}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importButton, screenWidth < 360 && styles.iconOnlyButton]}
              onPress={() => {
                const input = document.getElementById('csv-upload') as HTMLInputElement;
                if (input) input.click();
              }}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.primary} />
                {screenWidth >= 360 && <Text style={styles.importButtonText}>Import CSV</Text>}
              </View>
            </TouchableOpacity>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              style={{ display: 'none' }}
            />
            <Button
              title={screenWidth < 360 ? '+' : t('admin.addUser')}
              onPress={openAddUserModal}
              variant="primary"
              style={StyleSheet.flatten([
                styles.addButton,
                screenWidth < 360 ? styles.addButtonNarrow : null,
              ])}
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('admin.searchUsers')}
            placeholderTextColor={theme.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
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
          {users
            .filter(user => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
              const email = user.email.toLowerCase();
              const phone = user.phone?.toLowerCase() || '';
              const role = user.role.toLowerCase();
              return fullName.includes(query) || 
                     email.includes(query) || 
                     phone.includes(query) || 
                     role.includes(query);
            })
            .map((user) => (
            <View key={user.id} style={[
              styles.userCard,
              { width: `${getCardWidth()}%` }
            ]}>
              <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                  <View style={styles.badgeContainer}>
                    <View style={[styles.roleBadge, { backgroundColor: user.role === 'admin' ? theme.colors.warning : theme.colors.info }]}>
                      <Text style={styles.roleBadgeText}>{user.role}</Text>
                    </View>
                    {user.isInstructor && <View style={[styles.instructorBadge, { backgroundColor: theme.colors.success }]}>
                      <Ionicons name="school-outline" size={12} color="#fff" style={screenWidth >= 768 ? styles.instructorBadgeIcon : undefined} />
                      {screenWidth >= 768 && <Text style={styles.roleBadgeText}>{t('user.instructor')}</Text>}
                    </View>}
                    <View style={[styles.contractBadge, { backgroundColor: user.noMembership ? theme.colors.textSecondary : theme.colors.success }]}>
                      <Ionicons name={user.noMembership ? "close-circle-outline" : "document-text-outline"} size={12} color="#fff" style={screenWidth >= 768 ? styles.contractBadgeIcon : undefined} />
                      {screenWidth >= 768 && <Text style={styles.roleBadgeText}>{user.noMembership ? t('user.noMembership') : t('user.hasMembership')}</Text>}
                    </View>
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

              <View style={styles.paymentSection}>
                <View style={styles.paymentButtons}>
                  <TouchableOpacity style={styles.paymentButton} onPress={() => openPaymentModal(user, 'weekly-class')}>
                    <View style={styles.paymentButtonContent}>
                      <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                      <Text style={styles.paymentButtonText}>{t('payments.recordClass')}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.paymentButton} onPress={() => openPaymentModal(user, 'special-class')}>
                    <View style={styles.paymentButtonContent}>
                      <Ionicons name="star-outline" size={18} color={theme.colors.success} />
                      <Text style={styles.paymentButtonText}>{t('payments.recordSpecialClass')}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.paymentHistoryToggle}
                  onPress={() => togglePaymentHistory(user.id)}
                >
                  <View style={styles.paymentHistoryToggleContent}>
                    <Text style={styles.paymentHistoryToggleText}>{t('payments.paymentHistory')}</Text>
                    <Ionicons 
                      name={expandedPaymentHistory.has(user.id) ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={theme.colors.textSecondary} 
                    />
                  </View>
                </TouchableOpacity>

                {expandedPaymentHistory.has(user.id) && (
                  <View style={styles.paymentHistoryContainer}>
                    {userPayments[user.id] && userPayments[user.id].length > 0 ? (
                      userPayments[user.id].map((payment) => (
                        <View key={payment.id} style={styles.paymentHistoryItem}>
                          <View style={styles.paymentHistoryHeader}>
                            <View style={styles.paymentHistoryLeft}>
                              <Ionicons 
                                name={payment.paymentMethod === 'cash' ? "cash-outline" : "card-outline"} 
                                size={16} 
                                color={theme.colors.primary} 
                                style={styles.paymentHistoryIcon}
                              />
                              <Text style={styles.paymentHistoryAmount}>€{payment.amount.toFixed(2)}</Text>
                            </View>
                            <Text style={styles.paymentHistoryDate}>
                              {formatDateTime(payment.date)}
                            </Text>
                          </View>
                          <Text style={styles.paymentHistoryType}>
                            {payment.paymentType === 'weekly-class' 
                              ? `${t('payments.weeklyClass')} - ${formatMonthDisplay(payment.month, user.preferredLanguage)}` 
                              : `${t('payments.specialClass')} - ${formatMonthDisplay(payment.month, user.preferredLanguage)}`}
                          </Text>
                          {payment.notes && (
                            <Text style={styles.paymentHistoryNotes}>{payment.notes}</Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noPaymentsText}>{t('payments.noPayments')}</Text>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  onPress={() => openEditUserModal(user)}
                  style={styles.iconButton}
                >
                  <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.iconButtonText}>{t('common.edit')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => toggleUserRole(user.id, user.role)}
                  disabled={completedActions.has(`role-${user.id}`)}
                  style={[
                    styles.iconButton,
                    { backgroundColor: user.role === 'admin' ? STUDIOS.SMALL.color : STUDIOS.BIG.color },
                    completedActions.has(`role-${user.id}`) && styles.iconButtonDisabled
                  ]}
                >
                  <Ionicons 
                    name={user.role === 'admin' ? "person-outline" : "shield-checkmark-outline"} 
                    size={20} 
                    color="#000" 
                  />
                  <Text style={[styles.iconButtonText, { color: '#000' }]}>
                    {user.role === 'admin' ? t('admin.makeMember') : t('admin.makeAdmin')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => toggleUserStatus(user.id, user.isActive)}
                  disabled={completedActions.has(`status-${user.id}`)}
                  style={[
                    styles.iconButton,
                    { backgroundColor: user.isActive ? theme.colors.error : theme.colors.success },
                    completedActions.has(`status-${user.id}`) && styles.iconButtonDisabled
                  ]}
                >
                  <Ionicons 
                    name={user.isActive ? "close-circle-outline" : "checkmark-circle-outline"} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                  <Text style={[styles.iconButtonText, { color: '#FFFFFF' }]}>
                    {user.isActive ? t('admin.deactivate') : t('admin.activate')}
                  </Text>
                </TouchableOpacity>
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
                      <View>
                        <Text style={[
                          styles.roleText,
                          formData.role === role && styles.selectedRoleText
                        ]}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.instructorStatus')}</Text>
                <View style={styles.instructorOptions}>
                  <TouchableOpacity
                    style={[
                      styles.instructorOption,
                      !formData.isInstructor && styles.selectedInstructor
                    ]}
                    onPress={() => setFormData({...formData, isInstructor: false})}
                  >
                    <Text style={[
                      styles.instructorText,
                      !formData.isInstructor && styles.selectedInstructorText
                    ]}>
                      {t('user.regularMember')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.instructorOption,
                      formData.isInstructor && styles.selectedInstructor
                    ]}
                    onPress={() => setFormData({...formData, isInstructor: true})}
                  >
                    <Text style={[
                      styles.instructorText,
                      formData.isInstructor && styles.selectedInstructorText
                    ]}>
                      {t('user.isInstructor')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.membershipStatus')}</Text>
                <View style={styles.instructorOptions}>
                  <TouchableOpacity
                    style={[
                      styles.instructorOption,
                      !formData.noMembership && styles.selectedInstructor
                    ]}
                    onPress={() => handleMembershipStatusChange(false)}
                  >
                    <Text style={[
                      styles.instructorText,
                      !formData.noMembership && styles.selectedInstructorText
                    ]}>
                      {t('user.hasMembership')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.instructorOption,
                      formData.noMembership && styles.selectedInstructor
                    ]}
                    onPress={() => handleMembershipStatusChange(true)}
                  >
                    <Text style={[
                      styles.instructorText,
                      formData.noMembership && styles.selectedInstructorText
                    ]}>
                      {t('user.noMembership')}
                    </Text>
                  </TouchableOpacity>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('user.preferredLanguage')}</Text>
                <View style={styles.languageOptions}>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      formData.preferredLanguage === 'de' && styles.selectedLanguage
                    ]}
                    onPress={() => setFormData({...formData, preferredLanguage: 'de'})}
                  >
                    <Text style={[
                      styles.languageText,
                      formData.preferredLanguage === 'de' && styles.selectedLanguageText
                    ]}>
                      Deutsch
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      formData.preferredLanguage === 'en' && styles.selectedLanguage
                    ]}
                    onPress={() => setFormData({...formData, preferredLanguage: 'en'})}
                  >
                    <Text style={[
                      styles.languageText,
                      formData.preferredLanguage === 'en' && styles.selectedLanguageText
                    ]}>
                      English
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      formData.preferredLanguage === 'es' && styles.selectedLanguage
                    ]}
                    onPress={() => setFormData({...formData, preferredLanguage: 'es'})}
                  >
                    <Text style={[
                      styles.languageText,
                      formData.preferredLanguage === 'es' && styles.selectedLanguageText
                    ]}>
                      Español
                    </Text>
                  </TouchableOpacity>
                </View>
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

      {/* CSV Import Result Modal */}
      <Modal
        visible={showImportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.importModalOverlay}>
          <View style={styles.importModalContent}>
            <View style={styles.importModalHeader}>
              <Text style={styles.importModalTitle}>CSV Import</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {importing ? (
              <View style={styles.importingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.importingText}>Importing users...</Text>
              </View>
            ) : importResult ? (
              <ScrollView style={styles.importResultScroll}>
                <View style={styles.importSummary}>
                  <Text style={styles.importSummaryTitle}>Import Summary</Text>
                  <View style={styles.importSummaryRow}>
                    <Text style={styles.importSummaryLabel}>Total Rows:</Text>
                    <Text style={styles.importSummaryValue}>{importResult.totalRows}</Text>
                  </View>
                  <View style={styles.importSummaryRow}>
                    <Text style={[styles.importSummaryLabel, { color: theme.colors.success }]}>Imported:</Text>
                    <Text style={[styles.importSummaryValue, { color: theme.colors.success }]}>{importResult.imported}</Text>
                  </View>
                  <View style={styles.importSummaryRow}>
                    <Text style={[styles.importSummaryLabel, { color: theme.colors.warning }]}>Skipped:</Text>
                    <Text style={[styles.importSummaryValue, { color: theme.colors.warning }]}>{importResult.skipped}</Text>
                  </View>
                  <View style={styles.importSummaryRow}>
                    <Text style={[styles.importSummaryLabel, { color: theme.colors.error }]}>Failed:</Text>
                    <Text style={[styles.importSummaryValue, { color: theme.colors.error }]}>{importResult.failed}</Text>
                  </View>
                </View>

                {importResult.errors.length > 0 && (
                  <View style={styles.importErrors}>
                    <Text style={styles.importErrorsTitle}>Errors:</Text>
                    {importResult.errors.map((error, index) => (
                      <Text key={index} style={styles.importErrorText}>{error}</Text>
                    ))}
                  </View>
                )}

                <Button
                  title="Close"
                  onPress={() => setShowImportModal(false)}
                  variant="primary"
                  style={styles.importCloseButton}
                />
              </ScrollView>
            ) : (
              <View style={styles.importingContainer}>
                <Text style={styles.importingText}>Ready to import</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

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

      {/* Membership Status Change Confirmation Modal */}
      <Modal
        visible={showMembershipConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelMembershipChange}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="warning" size={48} color={theme.colors.warning} />
              <Text style={styles.confirmModalTitle}>{t('user.confirmMembershipChange')}</Text>
            </View>
            
            <Text style={styles.confirmModalMessage}>
              {pendingMembershipChange 
                ? t('user.confirmNoMembershipMessage')
                : t('user.confirmHasMembershipMessage')}
              {'\n\n'}
              {t('user.membershipChangeWarning')}
            </Text>
            
            <View style={styles.confirmModalActions}>
              <Button
                title={t('common.cancel')}
                onPress={handleCancelMembershipChange}
                variant="outline"
                style={styles.confirmModalButton}
              />
              <Button
                title={t('common.confirm')}
                onPress={handleConfirmMembershipChange}
                variant="danger"
                style={styles.confirmModalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      {selectedUserForPayment && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedUserForPayment(null);
          }}
          onSubmit={handlePaymentSubmit}
          user={selectedUserForPayment}
          defaultType={paymentType}
        />
      )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexWrap: 'wrap',
  },
  headerStats: {
    minWidth: 100,
    flex: 1,
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
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  userCard: {
    flexGrow: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    marginRight: '1%',
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
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.xs,
  },
  instructorBadgeIcon: {
    marginRight: 4,
  },
  contractBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.xs,
  },
  contractBadgeIcon: {
    marginRight: 4,
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
    marginTop: theme.spacing.md,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  iconButton: {
    flex: 1,
    minWidth: 80,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.xs,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  iconButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 12,
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
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
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
    marginBottom: theme.spacing.md,
  },
  roleOption: {
    flex: 1,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
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
  // Instructor options
  instructorOptions: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  instructorOption: {
    flex: 1,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  selectedInstructor: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  instructorText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedInstructorText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  // Dance level options
  levelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  levelOption: {
    width: '48%',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
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
  // Language options
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  languageOption: {
    width: '31%',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  selectedLanguage: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  languageText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  selectedLanguageText: {
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
  },
  confirmModalButton: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  // CSV Import styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headerActionsNarrow: {
    width: '100%',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  templateButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    minWidth: 100,
    marginRight: theme.spacing.sm,
  },
  iconOnlyButton: {
    minWidth: 40,
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  importButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    minWidth: 100,
    marginRight: theme.spacing.sm,
  },
  addButtonNarrow: {
    minWidth: 40,
    paddingHorizontal: theme.spacing.sm,
  },
  importButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  importModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    ...theme.shadows.large,
  },
  importModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  importModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  importingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  importingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  importResultScroll: {
    maxHeight: 400,
  },
  importSummary: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  importSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  importSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  importSummaryLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  importSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  importErrors: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  importErrorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  importErrorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  importCloseButton: {
    marginTop: theme.spacing.md,
  },
  paymentSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  paymentButtons: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  paymentButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  paymentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  paymentHistoryToggle: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  paymentHistoryToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentHistoryToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  paymentHistoryContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  paymentHistoryItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  paymentHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  paymentHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentHistoryIcon: {
    marginRight: theme.spacing.xs,
  },
  paymentHistoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  paymentHistoryDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  paymentHistoryType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  paymentHistoryNotes: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  noPaymentsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  clearSearchButton: {
    padding: theme.spacing.xs,
  },
});
