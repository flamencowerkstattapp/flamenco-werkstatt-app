import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  Firestore,
  DocumentData,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { getFirestoreDB } from './firebase';
import { Message, User } from '../types';
import { notificationHelpers } from '../utils/notificationHelpers';

export interface CreateMessageData {
  senderId: string;
  senderName: string;
  recipientIds: string[];
  recipientType: 'individual' | 'group' | 'all-members' | 'all-instructors';
  subject: string;
  body: string;
}

export class MessageService {
  private db: Firestore;

  constructor(database?: Firestore) {
    if (!database) {
      throw new Error('Firestore instance is required for MessageService');
    }
    this.db = database;
  }

  async createMessage(messageData: CreateMessageData): Promise<string> {
    try {
      // Validate input
      if (!messageData.senderId || !messageData.subject || !messageData.body || !messageData.recipientIds.length) {
        throw new Error('Invalid message data: missing required fields');
      }

      // Initialize tracking fields
      const isRead: { [userId: string]: boolean } = {};
      const readStatus: { [userId: string]: 'unread' | 'read' | 'replied' } = {};
      const deliveryTracking: { [userId: string]: any } = {};
      const readTracking: { [userId: string]: any } = {};
      
      messageData.recipientIds.forEach(recipientId => {
        isRead[recipientId] = false;
        readStatus[recipientId] = 'unread';
        
        // Initialize delivery tracking for each recipient
        deliveryTracking[recipientId] = {
          status: 'sent',
          deliveredAt: new Date(),
          retryCount: 0
        };
        
        // Initialize read tracking for each recipient
        readTracking[recipientId] = {
          isRead: false,
          accessCount: 0
        };
      });
      
      // Sender has read their own message
      isRead[messageData.senderId] = true;
      readStatus[messageData.senderId] = 'read';
      
      // Sender's delivery and read tracking
      deliveryTracking[messageData.senderId] = {
        status: 'delivered',
        deliveredAt: new Date(),
        retryCount: 0
      };
      
      readTracking[messageData.senderId] = {
        isRead: true,
        readAt: new Date(),
        accessCount: 1,
        lastAccessedAt: new Date()
      };

      const docRef = await addDoc(collection(this.db, 'messages'), {
        ...messageData,
        isRead,
        readStatus,
        deliveryStatus: 'sent',
        deliveryTracking,
        readTracking,
        replyChain: [messageData.senderId], // Start reply chain with sender
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const messageId = docRef.id;

      notificationHelpers.notifyNewMessage(
        messageData.recipientIds,
        messageData.senderName,
        messageData.subject,
        messageId
      ).catch(err => console.error('Failed to send message notifications:', err));

      return messageId;
    } catch (error) {
      console.error('Error creating message:', error);
      throw new Error('Failed to create message');
    }
  }

  async getMessage(messageId: string): Promise<Message | null> {
    try {
      const messageDoc = await getDoc(doc(this.db, 'messages', messageId));
      
      if (!messageDoc.exists()) {
        return null;
      }

      const data = messageDoc.data();
      return {
        ...data,
        id: messageDoc.id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Message;
    } catch (error) {
      console.error('Error getting message:', error);
      throw new Error('Failed to get message');
    }
  }

  async getInboxMessages(userId: string): Promise<Message[]> {
    try {
      const messagesQuery = query(
        collection(this.db, 'messages'),
        where('recipientIds', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(messagesQuery);
      const messages = snapshot.docs.map(doc => this.convertDocToMessage(doc));
      return this.filterDeletedMessages(messages, userId);
    } catch (error) {
      console.error('Error getting inbox messages:', error);
      
      // Fallback: Get messages without ordering, then sort in JavaScript
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.warn('Using fallback query without index - please create Firebase index');
        try {
          const fallbackQuery = query(
            collection(this.db, 'messages'),
            where('recipientIds', 'array-contains', userId)
          );
          
          const snapshot = await getDocs(fallbackQuery);
          const messages = snapshot.docs.map(doc => this.convertDocToMessage(doc));
          
          // Sort by createdAt descending in JavaScript and filter soft-deleted
          return this.filterDeletedMessages(
            messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
            userId
          );
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error('Failed to get inbox messages');
        }
      }
      
      throw new Error('Failed to get inbox messages');
    }
  }

  async getSentMessages(userId: string): Promise<Message[]> {
    try {
      const messagesQuery = query(
        collection(this.db, 'messages'),
        where('senderId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(messagesQuery);
      const messages = snapshot.docs.map(doc => this.convertDocToMessage(doc));
      return this.filterDeletedMessages(messages, userId);
    } catch (error) {
      console.error('Error getting sent messages:', error);
      
      // Fallback: Get messages without ordering, then sort in JavaScript
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.warn('Using fallback query without index - please create Firebase index');
        try {
          const fallbackQuery = query(
            collection(this.db, 'messages'),
            where('senderId', '==', userId)
          );
          
          const snapshot = await getDocs(fallbackQuery);
          const messages = snapshot.docs.map(doc => this.convertDocToMessage(doc));
          
          // Sort by createdAt descending in JavaScript and filter soft-deleted
          return this.filterDeletedMessages(
            messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
            userId
          );
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error('Failed to get sent messages');
        }
      }
      
      throw new Error('Failed to get sent messages');
    }
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const messageRef = doc(this.db, 'messages', messageId);
      
      await updateDoc(messageRef, {
        [`isRead.${userId}`]: true,
        [`readStatus.${userId}`]: 'read',
        [`readTracking.${userId}.isRead`]: true,
        [`readTracking.${userId}.readAt`]: Timestamp.now(),
        [`readTracking.${userId}.lastAccessedAt`]: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw new Error('Failed to mark message as read');
    }
  }

  async trackMessageAccess(messageId: string, userId: string, readDuration?: number): Promise<void> {
    try {
      const now = new Date();
      const updateData: any = {
        [`readTracking.${userId}.lastAccessedAt`]: Timestamp.fromDate(now),
        [`readTracking.${userId}.accessCount`]: increment(1),
        updatedAt: Timestamp.now(),
      };
      
      if (readDuration) {
        updateData[`readTracking.${userId}.readDuration`] = readDuration;
      }
      
      await updateDoc(doc(this.db, 'messages', messageId), updateData);
    } catch (error) {
      console.error('Error tracking message access:', error);
      throw new Error('Failed to track message access');
    }
  }

  async markAsDelivered(messageId: string, userId: string): Promise<void> {
    try {
      const now = new Date();
      await updateDoc(doc(this.db, 'messages', messageId), {
        [`deliveryTracking.${userId}.status`]: 'delivered',
        [`deliveryTracking.${userId}.deliveredAt`]: Timestamp.fromDate(now),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking message as delivered:', error);
      throw new Error('Failed to mark message as delivered');
    }
  }

  async markDeliveryFailed(messageId: string, userId: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'messages', messageId), {
        [`deliveryTracking.${userId}.status`]: 'failed',
        [`deliveryTracking.${userId}.failedReason`]: reason,
        [`deliveryTracking.${userId}.retryCount`]: increment(1),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking delivery failed:', error);
      throw new Error('Failed to mark delivery failed');
    }
  }

  async markAsReplied(messageId: string, userId: string, replyMessageId: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'messages', messageId), {
        [`isRead.${userId}`]: true,
        [`readStatus.${userId}`]: 'replied',
        lastReplyId: replyMessageId,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking message as replied:', error);
      throw new Error('Failed to mark message as replied');
    }
  }

  async updateDeliveryStatus(messageId: string, status: 'pending' | 'sent' | 'delivered' | 'failed'): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'messages', messageId), {
        deliveryStatus: status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw new Error('Failed to update delivery status');
    }
  }

  async markAsUnread(messageId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'messages', messageId), {
        [`isRead.${userId}`]: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error marking message as unread:', error);
      throw new Error('Failed to mark message as unread');
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      if (!messageId || !userId) {
        throw new Error('Message ID and User ID are required');
      }

      const messageRef = doc(this.db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        return; // Message already deleted
      }

      // Soft-delete: add userId to deletedBy array
      // The message document stays in Firestore but is filtered out of
      // this user's inbox/sent queries. The other party keeps their copy.
      await updateDoc(messageRef, {
        deletedBy: arrayUnion(userId),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  private isDeletedByUser(message: Message, userId: string): boolean {
    return Array.isArray(message.deletedBy) && message.deletedBy.includes(userId);
  }

  private filterDeletedMessages(messages: Message[], userId: string): Message[] {
    return messages.filter(msg => !this.isDeletedByUser(msg, userId));
  }

  async getActiveUsers(): Promise<User[]> {
    try {
      const usersQuery = query(
        collection(this.db, 'users'),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        console.warn('No active users found in database');
        return [];
      }
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          memberSince: data.memberSince instanceof Date ? data.memberSince : new Date(data.memberSince),
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
        } as User;
      });
    } catch (error) {
      console.error('Error getting active users:', error);
      throw new Error('Failed to get active users');
    }
  }

  // New method for non-admin users to get limited user access
  async getAvailableRecipients(currentUserId: string): Promise<User[]> {
    try {
      // For non-admin users, we need a different approach
      // This method should be accessible to non-admin users with proper permissions
      const usersQuery = query(
        collection(this.db, 'users'),
        where('isActive', '==', true),
        where('role', 'in', ['member', 'instructor']) // Only non-admin roles
      );

      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        console.warn('No available recipients found');
        return [];
      }
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          memberSince: data.memberSince instanceof Date ? data.memberSince : new Date(data.memberSince),
        } as User;
      });
    } catch (error) {
      console.error('Error getting available recipients:', error);
      // Return empty array for non-admin users if they don't have permission
      return [];
    }
  }

  // New method to find a specific user by name (for replies)
  async findUserByName(name: string): Promise<User | null> {
    try {
      const usersQuery = query(
        collection(this.db, 'users'),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(usersQuery);
      
      if (snapshot.empty) {
        return null;
      }
      
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          memberSince: data.memberSince instanceof Date ? data.memberSince : new Date(data.memberSince),
        } as User;
      });

      // Find user by matching first name + last name
      return users.find(user => `${user.firstName} ${user.lastName}` === name) || null;
    } catch (error) {
      console.error('Error finding user by name:', error);
      return null;
    }
  }

  subscribeToInboxMessages(
    userId: string, 
    callback: (messages: Message[]) => void
  ): () => void {
    const messagesQuery = query(
      collection(this.db, 'messages'),
      where('recipientIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => this.convertDocToMessage(doc));
      callback(this.filterDeletedMessages(messages, userId));
    }, (error) => {
      console.error('Error subscribing to inbox messages:', error);
    });

    return unsubscribe;
  }

  subscribeToSentMessages(
    userId: string, 
    callback: (messages: Message[]) => void
  ): () => void {
    const messagesQuery = query(
      collection(this.db, 'messages'),
      where('senderId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => this.convertDocToMessage(doc));
      callback(this.filterDeletedMessages(messages, userId));
    }, (error) => {
      console.error('Error subscribing to sent messages:', error);
    });

    return unsubscribe;
  }

  subscribeToMessage(
    messageId: string,
    callback: (message: Message | null) => void
  ): () => void {
    const unsubscribe = onSnapshot(doc(this.db, 'messages', messageId), (doc) => {
      if (doc.exists()) {
        const message = this.convertDocToMessage(doc);
        callback(message);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error subscribing to message:', error);
    });

    return unsubscribe;
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const messagesQuery = query(
        collection(this.db, 'messages'),
        where('recipientIds', 'array-contains', userId),
        where(`isRead.${userId}`, '==', false)
      );

      const snapshot = await getDocs(messagesQuery);
      const messages = snapshot.docs.map(doc => this.convertDocToMessage(doc));
      return this.filterDeletedMessages(messages, userId).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      
      // Fallback: Get all messages and filter in JavaScript
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.warn('Using fallback query for unread count - please create Firebase index');
        try {
          const fallbackQuery = query(
            collection(this.db, 'messages'),
            where('recipientIds', 'array-contains', userId)
          );
          
          const snapshot = await getDocs(fallbackQuery);
          const messages = snapshot.docs.map(doc => this.convertDocToMessage(doc));
          
          // Filter unread and non-deleted messages in JavaScript
          return this.filterDeletedMessages(messages, userId)
            .filter(msg => !msg.isRead[userId]).length;
        } catch (fallbackError) {
          console.error('Fallback query for unread count failed:', fallbackError);
          return 0;
        }
      }
      
      return 0;
    }
  }

  private convertDocToMessage(doc: any): Message {
    const data = doc.data() as DocumentData;
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Message;
  }
}

export const messageService = (() => {
  try {
    return new MessageService(getFirestoreDB());
  } catch (error) {
    console.error('Failed to initialize message service:', error);
    return null;
  }
})();

export const getMessageService = () => {
  if (!messageService) {
    throw new Error('Message service is not available. Please check your Firebase configuration.');
  }
  return messageService;
};
