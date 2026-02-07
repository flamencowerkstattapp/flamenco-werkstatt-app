import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import { getMessageService } from '../services/messageService';
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

/**
 * Update the app icon badge count on supported platforms.
 * - Web: Uses the Badging API (navigator.setAppBadge) and updates document title
 * - Mobile: Badge is handled via push notification payload from server
 */
// Store the original favicon href so we can restore it
let originalFaviconHref: string | null = null;

const updateAppBadge = (count: number) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Web Badging API (supported in Chrome, Edge, and installed PWAs)
    try {
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          (navigator as any).setAppBadge(count);
        } else {
          (navigator as any).clearAppBadge();
        }
      }
    } catch (error) {
      // Badging API not supported or not a PWA — silently ignore
    }

    // Update document title with unread count prefix
    try {
      const baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
      document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
    } catch (error) {
      // Ignore title update errors
    }

    // Update favicon with badge overlay
    updateFaviconBadge(count);
  }
};

const updateFaviconBadge = (count: number) => {
  try {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) return;

    // Store original favicon on first call
    if (!originalFaviconHref) {
      originalFaviconHref = favicon.href;
    }

    if (count === 0) {
      // Restore original favicon
      favicon.href = originalFaviconHref;
      return;
    }

    // Draw badge on favicon using canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw original favicon
      ctx.drawImage(img, 0, 0, size, size);

      // Draw red badge circle
      const badgeSize = count > 9 ? 28 : 24;
      const badgeX = size - badgeSize / 2 - 2;
      const badgeY = badgeSize / 2 + 2;

      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeSize / 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#B00020';
      ctx.fill();

      // Draw white border around badge
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw count text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${count > 9 ? 14 : 16}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(count > 99 ? '99+' : String(count), badgeX, badgeY);

      // Update favicon
      favicon.href = canvas.toDataURL('image/png');
    };
    img.src = originalFaviconHref;
  } catch (error) {
    // Ignore favicon update errors
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Combined unread count from notifications + messages
  const unreadCount = unreadNotificationCount + unreadMessageCount;

  // Update app icon badge and browser tab title when unread count changes
  useEffect(() => {
    updateAppBadge(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      setPreferences(null);
      updateAppBadge(0);
      return;
    }

    // Subscribe to app notifications
    const unsubscribeNotifications = notificationService.subscribeToUserNotifications(
      user.id,
      (newNotifications) => {
        setNotifications(newNotifications);
        // Exclude message-type notifications from this count because
        // unread messages are already counted separately via
        // subscribeToInboxMessages. Including them here would double-count.
        const unread = newNotifications.filter(
          (n) => !n.isRead && n.type !== 'message'
        ).length;
        setUnreadNotificationCount(unread);
      }
    );

    // Subscribe to unread messages
    let unsubscribeMessages: (() => void) | null = null;
    try {
      const messageService = getMessageService();
      unsubscribeMessages = messageService.subscribeToInboxMessages(user.id, (messages) => {
        const unreadMessages = messages.filter((msg) => {
          const isRead = msg.isRead as Record<string, boolean>;
          return !isRead[user.id];
        });
        setUnreadMessageCount(unreadMessages.length);
      });
    } catch (error) {
      console.warn('Message service not available for unread count:', error);
    }

    setupForegroundListener();
    loadPreferences();

    return () => {
      unsubscribeNotifications();
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
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
      const unread = userNotifications.filter(
        (n) => !n.isRead && n.type !== 'message'
      ).length;
      setUnreadNotificationCount(unread);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Find the notification to check its type before updating counts
      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      // Only decrement notification count for non-message types
      // (message-type notifications are excluded from the count to avoid double-counting)
      if (notification && notification.type !== 'message' && !notification.isRead) {
        setUnreadNotificationCount((prev: number) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationCount(0);
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
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const prefs = await notificationService.getUserPreferences(user.id);
      if (prefs) {
        // Override enablePushNotifications based on this device's actual
        // browser permission. The Firestore preference is shared across
        // devices, but each device may have a different permission state.
        const localPermission =
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          'Notification' in window
            ? Notification.permission === 'granted'
            : false;
        prefs.enablePushNotifications =
          prefs.enablePushNotifications && localPermission;
      }
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
