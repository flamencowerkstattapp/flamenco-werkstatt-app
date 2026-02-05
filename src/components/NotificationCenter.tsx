import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationContext';
import { theme } from '../constants/theme';
import { AppNotification } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import { t } from '../locales';
import { ConfirmModal } from './ConfirmModal';

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (type: string, referenceId?: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  visible,
  onClose,
  onNavigate,
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    preferences,
    updatePreferences,
    requestNotificationPermission,
  } = useNotifications();

  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'settings'>('all');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const filteredNotifications =
    selectedTab === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (notification.referenceId) {
      onClose();
      onNavigate(notification.type, notification.referenceId);
    }
  };

  const handleDeleteAll = () => {
    deleteAllNotifications();
    setShowDeleteAllConfirm(false);
  };

  const handleTogglePushNotifications = async (value: boolean) => {
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            t('notifications.permissionDenied'),
            t('notifications.permissionDeniedMessage')
          );
        }
      } else {
        await updatePreferences({ enablePushNotifications: false });
      }
    } catch (error) {
      Alert.alert(t('notifications.settingsUpdateError'), t('notifications.settingsUpdateErrorMessage'));
    }
  };

  const handleToggleNotificationType = async (
    key: 'enableMessageNotifications' | 'enableNewsNotifications' | 'enableEventNotifications' | 'enableSystemNotifications',
    value: boolean
  ) => {
    try {
      await updatePreferences({ [key]: value });
    } catch (error) {
      Alert.alert(t('notifications.settingsUpdateError'), t('notifications.settingsUpdateErrorMessage'));
    }
  };

  const getNotificationIcon = (type: string): any => {
    switch (type) {
      case 'message':
        return 'mail';
      case 'news':
        return 'newspaper';
      case 'event':
        return 'calendar';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.notificationItemUnread]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIconContainer}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={24}
          color={item.isRead ? theme.colors.textSecondary : theme.colors.primary}
        />
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.isRead && styles.notificationTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notificationTime}>{formatDateTime(item.createdAt)}</Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          deleteNotification(item.id);
        }}
      >
        <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
            onPress={() => setSelectedTab('all')}
          >
            <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
              {t('notifications.all')} ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'unread' && styles.tabActive]}
            onPress={() => setSelectedTab('unread')}
          >
            <Text style={[styles.tabText, selectedTab === 'unread' && styles.tabTextActive]}>
              {t('notifications.unread')} ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === 'settings' && styles.tabActive]}
            onPress={() => setSelectedTab('settings')}
          >
            <Ionicons 
              name="settings-outline" 
              size={20} 
              color={selectedTab === 'settings' ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {selectedTab === 'settings' ? (
          <ScrollView style={styles.settingsContainer}>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>{t('notifications.pushNotifications')}</Text>
              <Text style={styles.settingsSectionDescription}>
                {t('notifications.pushNotificationsDesc')}
              </Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <Ionicons name="notifications" size={24} color={theme.colors.primary} />
                  <Text style={styles.settingItemText}>{t('notifications.enablePushNotifications')}</Text>
                </View>
                <Switch
                  value={preferences?.enablePushNotifications ?? false}
                  onValueChange={handleTogglePushNotifications}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                  thumbColor="#f4f3f4"
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>{t('notifications.notificationTypes')}</Text>
              <Text style={styles.settingsSectionDescription}>
                {t('notifications.notificationTypesDesc')}
              </Text>

              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <Ionicons name="mail" size={24} color={theme.colors.primary} />
                  <Text style={styles.settingItemText}>{t('notifications.messages')}</Text>
                </View>
                <Switch
                  value={preferences?.enableMessageNotifications ?? true}
                  onValueChange={(value) => handleToggleNotificationType('enableMessageNotifications', value)}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                  thumbColor="#f4f3f4"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <Ionicons name="newspaper" size={24} color={theme.colors.primary} />
                  <Text style={styles.settingItemText}>{t('notifications.newsUpdates')}</Text>
                </View>
                <Switch
                  value={preferences?.enableNewsNotifications ?? true}
                  onValueChange={(value) => handleToggleNotificationType('enableNewsNotifications', value)}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                  thumbColor="#f4f3f4"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <Ionicons name="calendar" size={24} color={theme.colors.primary} />
                  <Text style={styles.settingItemText}>{t('notifications.events')}</Text>
                </View>
                <Switch
                  value={preferences?.enableEventNotifications ?? true}
                  onValueChange={(value) => handleToggleNotificationType('enableEventNotifications', value)}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                  thumbColor="#f4f3f4"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
                  <Text style={styles.settingItemText}>{t('notifications.systemMessages')}</Text>
                </View>
                <Switch
                  value={preferences?.enableSystemNotifications ?? true}
                  onValueChange={(value) => handleToggleNotificationType('enableSystemNotifications', value)}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                  thumbColor="#f4f3f4"
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsNote}>
                {t('notifications.settingsNote')}
              </Text>
            </View>
          </ScrollView>
        ) : (
          <>
            {notifications.length > 0 && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => setShowDeleteAllConfirm(true)} style={styles.actionButton}>
                  <Ionicons name="trash" size={18} color={theme.colors.error} />
                  <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                    {t('notifications.deleteAll')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={filteredNotifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off" size={64} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyStateText}>
                    {selectedTab === 'unread' ? t('notifications.noUnreadNotifications') : t('notifications.noNotifications')}
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>

      <ConfirmModal
        visible={showDeleteAllConfirm}
        title={t('notifications.deleteAll')}
        message={t('notifications.deleteAllConfirm')}
        confirmText={t('notifications.deleteAll')}
        cancelText={t('common.cancel')}
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
        destructive={true}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingTop: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.small,
  },
  notificationItemUnread: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  notificationTitleUnread: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  notificationBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  notificationTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  settingsSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  settingsSectionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemText: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  settingsNote: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
