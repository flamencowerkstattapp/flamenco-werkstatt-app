import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { groupsService } from '../services/groupsService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { ConfirmModal } from '../components/ConfirmModal';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { Group, GroupType, User, ClassLevel, ClassType } from '../types';

export const ManageGroupsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'custom' as GroupType,
    classLevel: undefined as ClassLevel | undefined,
    classType: undefined as ClassType | undefined,
    eventId: '',
    memberIds: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const onChange = (result: { window: { width: number } }) => {
      const { width } = result.window;
      setScreenWidth(width);
      setIsMobileScreen(width <= 768); // All mobile devices
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    
    // Set initial value
    setIsMobileScreen(screenWidth <= 768);

    return () => subscription?.remove();
  }, [screenWidth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsData, usersData] = await Promise.all([
        groupsService.getAllGroups(),
        loadUsers(),
      ]);
      setGroups(groupsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (): Promise<User[]> => {
    try {
      const usersSnapshot = await getDocs(collection(db!, 'users'));
      return usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          memberSince: data.memberSince?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as User;
      });
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'custom',
      classLevel: undefined,
      classType: undefined,
      eventId: '',
      memberIds: [],
      isActive: true,
    });
  };

  const handleCreateGroup = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      type: group.type,
      classLevel: group.classLevel,
      classType: group.classType,
      eventId: group.eventId || '',
      memberIds: group.memberIds,
      isActive: group.isActive,
    });
    setShowEditModal(true);
  };

  const handleManageMembers = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      ...formData,
      memberIds: group.memberIds,
    });
    setShowMembersModal(true);
  };

  const handleSaveGroup = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('groups.nameRequired'));
      return;
    }

    setSaving(true);
    try {
      if (showEditModal && selectedGroup) {
        await groupsService.updateGroup(selectedGroup.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          type: formData.type,
          classLevel: formData.classLevel,
          classType: formData.classType,
          eventId: formData.eventId || undefined,
          memberIds: formData.memberIds,
          isActive: formData.isActive,
        });
        Alert.alert(t('common.success'), t('groups.groupUpdated'));
      } else {
        await groupsService.createGroup({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          type: formData.type,
          classLevel: formData.classLevel,
          classType: formData.classType,
          eventId: formData.eventId || undefined,
          memberIds: formData.memberIds,
          isActive: formData.isActive,
          createdBy: user!.id,
          createdByName: `${user!.firstName} ${user!.lastName}`,
        });
        Alert.alert(t('common.success'), t('groups.groupCreated'));
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving group:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMembers = async () => {
    if (!selectedGroup) return;

    setSaving(true);
    try {
      await groupsService.updateGroup(selectedGroup.id, {
        memberIds: formData.memberIds,
      });
      Alert.alert(t('common.success'), t('groups.membersUpdated'));
      setShowMembersModal(false);
      loadData();
    } catch (error) {
      console.error('Error updating members:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = (group: Group) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    setShowDeleteModal(false);
    setSaving(true);
    try {
      await groupsService.deleteGroup(groupToDelete.id);
      Alert.alert(t('common.success'), t('groups.groupDeleted'));
      setGroupToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting group:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (group: Group) => {
    try {
      await groupsService.toggleGroupStatus(group.id);
      loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      Alert.alert(t('common.error'), t('errors.general'));
    }
  };

  const toggleMember = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId)
        ? prev.memberIds.filter((id) => id !== userId)
        : [...prev.memberIds, userId],
    }));
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  const getGroupTypeIcon = (type: GroupType) => {
    switch (type) {
      case 'class':
        return 'school-outline';
      case 'event':
        return 'calendar-outline';
      case 'custom':
        return 'people-outline';
      default:
        return 'people-outline';
    }
  };

  const getGroupTypeColor = (type: GroupType) => {
    switch (type) {
      case 'class':
        return theme.colors.info;
      case 'event':
        return theme.colors.success;
      case 'custom':
        return theme.colors.secondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderGroupForm = () => (
    <View style={styles.modalContent}>
      <Input
        label={t('groups.groupName')}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder={t('groups.groupNamePlaceholder')}
        icon="people-outline"
      />

      <Input
        label={t('groups.description')}
        value={formData.description}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder={t('groups.descriptionPlaceholder')}
        icon="document-text-outline"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.inputLabel}>{t('groups.groupType')}</Text>
      <View style={styles.typeButtons}>
        {(['class', 'event', 'custom'] as GroupType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              formData.type === type && styles.typeButtonActive,
            ]}
            onPress={() => setFormData({ ...formData, type })}
          >
            <Ionicons
              name={getGroupTypeIcon(type) as any}
              size={20}
              color={formData.type === type ? '#FFFFFF' : theme.colors.text}
            />
            <Text
              style={[
                styles.typeButtonText,
                formData.type === type && styles.typeButtonTextActive,
              ]}
            >
              {t(`groups.type.${type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('groups.isActive')}</Text>
        <TouchableOpacity
          style={[styles.switch, formData.isActive && styles.switchActive]}
          onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
        >
          <View style={[styles.switchThumb, formData.isActive && styles.switchThumbActive]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMembersModal = () => (
    <Modal visible={showMembersModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('groups.manageMembers')} - {selectedGroup?.name}
            </Text>
            <TouchableOpacity onPress={() => setShowMembersModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.membersList}>
            {users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.memberItem}
                onPress={() => toggleMember(user.id)}
              >
                <View style={styles.memberInfo}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.memberName}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={styles.memberRole}>({user.role})</Text>
                </View>
                <Ionicons
                  name={formData.memberIds.includes(user.id) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={formData.memberIds.includes(user.id) ? theme.colors.success : theme.colors.border}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title={t('common.cancel')}
              onPress={() => setShowMembersModal(false)}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button
              title={t('common.save')}
              onPress={handleSaveMembers}
              loading={saving}
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('groups.title')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={t('groups.title')} />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('groups.manageGroups')}</Text>
          <Button
            title={t('groups.createGroup')}
            onPress={handleCreateGroup}
            style={styles.createButton}
          />
        </View>

        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyStateText}>{t('groups.noGroups')}</Text>
            <Text style={styles.emptyStateSubtext}>{t('groups.createFirstGroup')}</Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupTitleRow}>
                  <View
                    style={[
                      styles.groupTypeIndicator,
                      { backgroundColor: getGroupTypeColor(group.type) },
                    ]}
                  >
                    <Ionicons
                      name={getGroupTypeIcon(group.type) as any}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.groupTitleContainer}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupType}>{t(`groups.type.${group.type}`)}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: group.isActive ? theme.colors.success : theme.colors.disabled },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {group.isActive ? t('groups.active') : t('groups.inactive')}
                  </Text>
                </View>
              </View>

              {group.description && (
                <Text style={styles.groupDescription}>{group.description}</Text>
              )}

              <View style={styles.groupStats}>
                <View style={styles.statItem}>
                  <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.statText}>
                    {group.memberIds.length} {t('groups.members')}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.statText}>{group.createdByName}</Text>
                </View>
              </View>

              <View style={styles.groupActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleManageMembers(group)}
                >
                  <Ionicons name="people-outline" size={18} color={theme.colors.primary} />
                  {!isMobileScreen && <Text style={styles.actionButtonText}>{t('groups.members')}</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditGroup(group)}
                >
                  <Ionicons name="create-outline" size={18} color={theme.colors.info} />
                  {!isMobileScreen && <Text style={styles.actionButtonText}>{t('common.edit')}</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleStatus(group)}
                >
                  <Ionicons
                    name={group.isActive ? 'pause-outline' : 'play-outline'}
                    size={18}
                    color={theme.colors.warning}
                  />
                  {!isMobileScreen && (
                    <Text style={styles.actionButtonText}>
                      {group.isActive ? t('groups.deactivate') : t('groups.activate')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteGroup(group)}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  {!isMobileScreen && (
                    <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                      {t('common.delete')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}

      {/* Create/Edit Modal */}
      <Modal visible={showCreateModal || showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showEditModal ? t('groups.editGroup') : t('groups.createGroup')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>{renderGroupForm()}</ScrollView>

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveGroup}
                loading={saving}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Members Modal */}
      {renderMembersModal()}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title={t('groups.deleteGroup')}
        message={t('groups.deleteGroupConfirm', { name: groupToDelete?.name || '' })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDeleteGroup}
        onCancel={() => {
          setShowDeleteModal(false);
          setGroupToDelete(null);
        }}
        destructive={true}
      />
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
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  createButton: {
    minWidth: 120,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  groupCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupTypeIndicator: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  groupTitleContainer: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  groupType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
  },
  groupDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  groupStats: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  groupActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    ...theme.shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalContent: {
    padding: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  typeButtons: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: theme.colors.success,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  membersList: {
    maxHeight: 400,
    padding: theme.spacing.md,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  memberRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
});
