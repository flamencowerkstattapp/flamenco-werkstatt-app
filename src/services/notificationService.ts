import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getFirestoreDB } from './firebase';
import { AppNotification, NotificationPreferences, NotificationType } from '../types';

const getVapidKey = (): string => {
  const env = process.env as Record<string, string | undefined>;
  if (env.EXPO_PUBLIC_FIREBASE_VAPID_KEY) return env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  if (typeof window !== 'undefined' && (window as any).__ENV__?.EXPO_PUBLIC_FIREBASE_VAPID_KEY) {
    return (window as any).__ENV__.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  }
  return '';
};

const VAPID_KEY = getVapidKey();

export class NotificationService {
  private db = getFirestoreDB();
  private notificationsCollection = collection(this.db, 'notifications');
  private preferencesCollection = collection(this.db, 'notificationPreferences');
  private messaging: Messaging | null = null;
  private unsubscribeListeners: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        this.messaging = getMessaging();
      } catch (error) {
        console.warn('Firebase Messaging not available:', error);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async getFCMToken(userId: string): Promise<string | null> {
    if (!this.messaging) {
      console.warn('Firebase Messaging not initialized');
      return null;
    }

    try {
      const permission = await this.requestPermission();
      if (!permission) {
        console.log('Notification permission denied');
        return null;
      }

      const token = await getToken(this.messaging, { vapidKey: VAPID_KEY });
      
      if (token) {
        await this.saveFCMToken(userId, token);
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      const prefsRef = doc(this.preferencesCollection, userId);
      await setDoc(prefsRef, {
        userId,
        fcmToken: token,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  setupForegroundMessageListener(callback: (notification: any) => void): void {
    if (!this.messaging) return;

    try {
      onMessage(this.messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
        
        if (payload.notification) {
          this.showBrowserNotification(
            payload.notification.title || 'New Notification',
            payload.notification.body || '',
            payload.notification.image
          );
        }
      });
    } catch (error) {
      console.error('Error setting up foreground message listener:', error);
    }
  }

  showBrowserNotification(title: string, body: string, icon?: string): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      new Notification(title, {
        body,
        icon: icon || '/icon.png',
        badge: '/icon.png',
        tag: 'flamenco-notification',
      });
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    referenceId?: string,
    imageUrl?: string
  ): Promise<string> {
    try {
      const notificationData = {
        userId,
        type,
        title,
        body,
        referenceId: referenceId || null,
        imageUrl: imageUrl || null,
        isRead: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(this.notificationsCollection, notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  async createBulkNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    referenceId?: string,
    imageUrl?: string
  ): Promise<void> {
    try {
      const batch = writeBatch(this.db);
      
      userIds.forEach((userId) => {
        const notificationRef = doc(this.notificationsCollection);
        batch.set(notificationRef, {
          userId,
          type,
          title,
          body,
          referenceId: referenceId || null,
          imageUrl: imageUrl || null,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw new Error('Failed to create bulk notifications');
    }
  }

  subscribeToUserNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void
  ): () => void {
    try {
      const q = query(
        this.notificationsCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(this.convertDocToNotification);
        callback(notifications);
      });

      this.unsubscribeListeners.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return () => {};
    }
  }

  async getUserNotifications(userId: string, limit?: number): Promise<AppNotification[]> {
    try {
      const q = query(
        this.notificationsCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      let notifications = snapshot.docs.map(this.convertDocToNotification);
      
      if (limit) {
        notifications = notifications.slice(0, limit);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        this.notificationsCollection,
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(this.notificationsCollection, notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        this.notificationsCollection,
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(this.db);

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.notificationsCollection, notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      const q = query(
        this.notificationsCollection,
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(this.db);

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const prefsRef = doc(this.preferencesCollection, userId);
      const prefsDoc = await getDocs(query(this.preferencesCollection, where('userId', '==', userId)));
      
      if (prefsDoc.empty) {
        return await this.createDefaultPreferences(userId);
      }

      const data = prefsDoc.docs[0].data();
      return {
        userId: data.userId,
        enablePushNotifications: data.enablePushNotifications ?? true,
        enableMessageNotifications: data.enableMessageNotifications ?? true,
        enableNewsNotifications: data.enableNewsNotifications ?? true,
        enableEventNotifications: data.enableEventNotifications ?? true,
        enableSystemNotifications: data.enableSystemNotifications ?? true,
        fcmToken: data.fcmToken,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const defaultPrefs: NotificationPreferences = {
        userId,
        enablePushNotifications: true,
        enableMessageNotifications: true,
        enableNewsNotifications: true,
        enableEventNotifications: true,
        enableSystemNotifications: true,
        updatedAt: new Date(),
      };

      const prefsRef = doc(this.preferencesCollection, userId);
      await setDoc(prefsRef, {
        ...defaultPrefs,
        updatedAt: serverTimestamp(),
      });

      return defaultPrefs;
    } catch (error) {
      console.error('Error creating default preferences:', error);
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const q = query(this.preferencesCollection, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await this.createDefaultPreferences(userId);
        return this.updatePreferences(userId, preferences);
      }

      const prefsRef = snapshot.docs[0].ref;
      await updateDoc(prefsRef, {
        ...preferences,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  private convertDocToNotification(doc: any): AppNotification {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      referenceId: data.referenceId,
      imageUrl: data.imageUrl,
      isRead: data.isRead,
      createdAt: data.createdAt?.toDate() || new Date(),
      readAt: data.readAt?.toDate(),
    };
  }

  cleanup(): void {
    this.unsubscribeListeners.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeListeners = [];
  }
}

export const notificationService = new NotificationService();
export const getNotificationService = () => notificationService;
