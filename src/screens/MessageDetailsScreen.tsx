import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getMessageService } from '../services/messageService';
import { AppHeader } from '../components/AppHeader';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { MessageStatusIndicator } from '../components/MessageStatusIndicator';
import { LinkableText } from '../components/LinkableText';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { Message, User } from '../types';
import { formatDateTime } from '../utils/dateUtils';

interface MessageDetailsScreenProps {
  route?: {
    params: {
      messageId: string;
    };
  };
  navigation?: any;
}

export const MessageDetailsScreen: React.FC<MessageDetailsScreenProps> = ({ 
  route, 
  navigation 
}) => {
  const { messageId } = route?.params ?? { messageId: '' };
  const { user } = useAuth();
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipientNames, setRecipientNames] = useState<Record<string, string>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]); // Cache all users
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadMessage();
  }, [messageId]);

  const loadRecipientNames = async (message: Message) => {
    const names: Record<string, string> = {};
    
    if (message.recipientType === 'individual') {
      // Use cached users if available, otherwise fetch them
      let users = allUsers;
      if (users.length === 0) {
        try {
          const service = getMessageService();
          users = await service.getActiveUsers();
          setAllUsers(users); // Cache for future use
        } catch (error) {
          // Removed console.error
        }
      }
      
      // Create a map of user ID to full name
      const userMap: Record<string, string> = {};
      users.forEach(user => {
        userMap[user.id] = `${user.firstName} ${user.lastName}`;
      });

      // Use actual names when available, fallback to User ID format
      message.recipientIds.forEach(id => {
        names[id] = userMap[id] || `User ${id.slice(-6)}`;
      });
    }

    setRecipientNames(names);
  };

  const formatRecipientNames = (message: Message) => {
    if (message.recipientType === 'individual') {
      const recipientNamesList = message.recipientIds.map(id => recipientNames[id] || `User ${id.slice(-6)}`);
      if (recipientNamesList.length === 1) {
        return recipientNamesList[0];
      } else {
        return `${recipientNamesList.join(', ')} (${message.recipientIds.length} people)`;
      }
    } else if (message.recipientType === 'all-members') {
      return 'All Members';
    } else if (message.recipientType === 'all-instructors') {
      return 'All Instructors';
    } else if (message.recipientType === 'group') {
      return `Group (${message.recipientIds.length} people)`;
    }
    return message.recipientType;
  };

  const loadMessage = async () => {
    if (!user) return;

    try {
      const service = getMessageService();
      const messageData = await service.getMessage(messageId);
      
      if (messageData) {
        setMessage(messageData);
        
        // Load recipient names for sent messages
        if (!messageData.recipientIds.includes(user.id)) {
          await loadRecipientNames(messageData);
        }

        // Mark as read if it's an inbox message and hasn't been read
        if (messageData.recipientIds.includes(user.id) && 
            (!messageData.isRead[user.id] || messageData.readStatus?.[user.id]?.status !== 'read')) {
          await markAsRead(messageId);
        }
      } else {
        console.error('Message not found');
        navigation?.goBack();
      }
    } catch (error) {
      console.error('Error loading message:', error);
      navigation?.goBack();
    } finally {
      setLoading(false);
    }
  };


  const markAsRead = async (messageId: string) => {
    if (!user) return;

    try {
      const service = getMessageService();
      
      // Mark as read with enhanced tracking
      await service.markAsRead(messageId, user.id);
      
      // Track message access (for analytics and engagement metrics)
      await service.trackMessageAccess(messageId, user.id);
      
      // Mark as delivered if not already
      if (message && message.deliveryTracking?.[user.id]?.status !== 'delivered') {
        await service.markAsDelivered(messageId, user.id);
      }
      
      // Reload message to update local state with new read status
      const updatedMessage = await service.getMessage(messageId);
      if (updatedMessage) {
        setMessage(updatedMessage);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleReply = () => {
    if (!message) return;
    
    navigation?.navigate('ComposeMessage', {
      replyTo: {
        id: message.id,
        senderName: message.senderName,
        subject: message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`,
        body: `\n\n--- ${t('messages.originalMessage')} ---\n${message.body}`,
      },
    });
  };

  const handleDelete = async () => {
    if (!message) return;
    
    // Store message context for modal
    const isInbox = message.recipientIds.includes(user?.id || '');
    const isSent = message.senderId === user?.id;
    
    // Show modal confirmation with context
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    await performDelete();
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const performDelete = async () => {
    if (!message) return;
    
    try {
      setLoading(true);
      const service = getMessageService();
      await service.deleteMessage(message.id);
      
      // Reset loading state and navigate back
      setLoading(false);
      navigation?.goBack();
      
    } catch (error) {
      console.error('Error deleting message:', error);
      setLoading(false);
      // Could show error modal here in the future
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('messages.messageDetails')} />
        <FlamencoLoading 
          message={t('messages.loadingMessage')} 
          size="medium" 
        />
      </View>
    );
  }

  if (!message) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('messages.messageDetails')} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>{t('messages.messageNotFound')}</Text>
        </View>
      </View>
    );
  }

  const isInbox = message.recipientIds.includes(user?.id || '');
  const isRead = message.isRead[user?.id || ''];
  const userReadStatus = message.readStatus?.[user?.id || ''] || 'unread';
  const isFromCurrentUser = message.senderId === user?.id;

  return (
    <View style={styles.container}>
      <AppHeader title={t('messages.messageDetails')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.messageHeader}>
          <View style={styles.senderInfo}>
            <Ionicons
              name={isInbox ? 'mail-outline' : 'send-outline'}
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.senderDetails}>
              <Text style={styles.senderName}>
                {isInbox ? message.senderName : `To: ${formatRecipientNames(message)}`}
              </Text>
              <Text style={styles.recipientType}>
                {isInbox ? t('messages.privateMessage') : ''}
              </Text>
            </View>
          </View>
          <View style={styles.messageMeta}>
            {!isRead && isInbox && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{t('messages.new')}</Text>
              </View>
            )}
            <MessageStatusIndicator
              message={message}
              userId={user?.id}
              isFromCurrentUser={isFromCurrentUser}
              showDetailedStatus={true}
            />
            <Text style={styles.messageDate}>{formatDateTime(message.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.messageContent}>
          <Text style={styles.subject}>{message.subject}</Text>
          <LinkableText style={styles.body}>{message.body}</LinkableText>
        </View>

        {message.updatedAt.getTime() !== message.createdAt.getTime() && (
          <Text style={styles.updatedText}>
            {t('messages.updated')} {formatDateTime(message.updatedAt)}
          </Text>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleReply}>
          <Ionicons name="arrow-undo" size={20} color={theme.colors.primary} />
          <Text style={styles.actionText}>{t('messages.reply')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          <Text style={[styles.actionText, styles.deleteText]}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={24} color={theme.colors.error} />
              <Text style={styles.modalTitle}>{t('messages.deleteMessage')}</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              {message?.recipientIds.includes(user?.id || '') 
                ? t('messages.deleteMessageConfirmInbox')
                : t('messages.deleteMessageConfirmSent')
              }
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Ionicons name="trash" size={16} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  senderDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  senderName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  recipientType: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  messageMeta: {
    alignItems: 'flex-end',
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  unreadText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messageDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  messageContent: {
    flex: 1,
  },
  subject: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  updatedText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.md,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  deleteText: {
    color: theme.colors.error,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    minWidth: 300,
    maxWidth: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalMessage: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,  },
  cancelButton: {
    backgroundColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
