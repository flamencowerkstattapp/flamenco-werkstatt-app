import { notificationService } from '../services/notificationService';
import { User } from '../types';
import { t } from '../locales';

export const notificationHelpers = {
  async notifyNewMessage(
    recipientIds: string[],
    senderName: string,
    subject: string,
    messageId: string
  ): Promise<void> {
    try {
      const title = t('notifications.newMessageFrom', { sender: senderName });
      const body = subject;

      await notificationService.createBulkNotifications(
        recipientIds,
        'message',
        title,
        body,
        messageId
      );
    } catch (error) {
      console.error('Error creating message notifications:', error);
    }
  },

  async notifyNewNews(
    userIds: string[],
    newsTitle: string,
    newsId: string,
    imageUrl?: string
  ): Promise<void> {
    try {
      const title = t('notifications.newsPublishedTitle', { title: newsTitle });
      const body = t('notifications.newsPublishedBody');

      await notificationService.createBulkNotifications(
        userIds,
        'news',
        title,
        body,
        newsId,
        imageUrl || undefined
      );
    } catch (error) {
      console.error('Error creating news notifications:', error);
    }
  },

  async notifyNewEvent(
    userIds: string[],
    eventTitle: string,
    eventId: string,
    imageUrl?: string
  ): Promise<void> {
    try {
      const title = t('notifications.eventPublishedTitle', { title: eventTitle });
      const body = t('notifications.eventPublishedBody');

      await notificationService.createBulkNotifications(
        userIds,
        'event',
        title,
        body,
        eventId,
        imageUrl
      );
    } catch (error) {
      console.error('Error creating event notifications:', error);
    }
  },

  async notifyEventReminder(
    userIds: string[],
    eventTitle: string,
    eventId: string,
    daysUntilEvent: number
  ): Promise<void> {
    try {
      const title = `Event reminder: ${eventTitle}`;
      const body = `This event starts in ${daysUntilEvent} day${daysUntilEvent > 1 ? 's' : ''}`;

      await notificationService.createBulkNotifications(
        userIds,
        'event',
        title,
        body,
        eventId
      );
    } catch (error) {
      console.error('Error creating event reminder notifications:', error);
    }
  },

  async notifySystemMessage(
    userId: string,
    title: string,
    message: string
  ): Promise<void> {
    try {
      await notificationService.createNotification(
        userId,
        'system',
        title,
        message
      );
    } catch (error) {
      console.error('Error creating system notification:', error);
    }
  },
};
