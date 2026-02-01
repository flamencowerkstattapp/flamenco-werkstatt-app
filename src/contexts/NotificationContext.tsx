import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import { AppNotification, NotificationPreferences } from '../types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  preferences: NotificationPreferences | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
      return;
    }

    const unsubscribe = notificationService.subscribeToUserNotifications(
      user.id,
      (newNotifications) => {
        setNotifications(newNotifications);
        const unread = newNotifications.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      }
    );

    setupForegroundListener();
    loadPreferences();

    return () => {
      unsubscribe();
    };
  }, [user]);

  const setupForegroundListener = () => {
    notificationService.setupForegroundMessageListener((payload) => {
      console.log('Foreground notification received:', payload);
    });
  };

  const refreshNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userNotifications = await notificationService.getUserNotifications(user.id);
      setNotifications(userNotifications);
      const unread = userNotifications.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    if (!user) return;

    try {
      await notificationService.deleteAllNotifications(user.id);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const prefs = await notificationService.getUserPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const refreshPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const prefs = await notificationService.getUserPreferences(user.id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error refreshing preferences:', error);
    }
  }, [user]);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    if (!user) return;

    try {
      await notificationService.updatePreferences(user.id, updates);
      setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }, [user]);

  const requestNotificationPermission = useCallback(async () => {
    if (!user) return false;

    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await notificationService.getFCMToken(user.id);
        await updatePreferences({ enablePushNotifications: true });
      }
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [user, updatePreferences]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    preferences,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    requestNotificationPermission,
    updatePreferences,
    refreshPreferences,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
