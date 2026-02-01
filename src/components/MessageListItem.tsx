import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';
import { MessageStatusIndicator } from './MessageStatusIndicator';
import { theme } from '../constants/theme';

interface MessageListItemProps {
  message: Message;
  currentUserId: string;
  onPress: (message: Message) => void;
  showDetailedStatus?: boolean;
}

export const MessageListItem: React.FC<MessageListItemProps> = ({
  message,
  currentUserId,
  onPress,
  showDetailedStatus = false,
}) => {
  const isFromCurrentUser = message.senderId === currentUserId;
  const userReadStatus = message.readStatus?.[currentUserId] || 'unread';
  const isUnread = !isFromCurrentUser && userReadStatus === 'unread';
  
  const getRecipientDisplay = () => {
    if (isFromCurrentUser) {
      if (message.recipientType === 'individual') {
        return `To: ${message.recipientIds.length === 1 ? 'Individual' : 'Multiple'}`;
      } else {
        return `To: ${message.recipientType.replace('-', ' ')}`;
      }
    } else {
      return `From: ${message.senderName}`;
    }
  };

  const getTimeDisplay = () => {
    const now = new Date();
    const messageDate = message.createdAt;
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const getStatusIndicator = () => {
    if (isFromCurrentUser) {
      return (
        <MessageStatusIndicator
          deliveryStatus={message.deliveryStatus}
          readStatus={userReadStatus}
          isFromCurrentUser={true}
          showDetailedStatus={showDetailedStatus}
        />
      );
    } else {
      return (
        <MessageStatusIndicator
          deliveryStatus={message.deliveryStatus}
          readStatus={userReadStatus}
          isFromCurrentUser={false}
          showDetailedStatus={showDetailedStatus}
        />
      );
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isUnread && styles.unreadContainer,
      ]}
      onPress={() => onPress(message)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.senderInfo}>
            <Text style={[
              styles.senderText,
              isUnread && styles.unreadText,
            ]}>
              {getRecipientDisplay()}
            </Text>
            {isUnread && (
              <View style={styles.unreadDot} />
            )}
          </View>
          <Text style={styles.timeText}>
            {getTimeDisplay()}
          </Text>
        </View>
        
        <Text style={[
          styles.subjectText,
          isUnread && styles.unreadText,
        ]} numberOfLines={1}>
          {message.subject}
        </Text>
        
        <Text style={styles.bodyText} numberOfLines={2}>
          {message.body}
        </Text>
        
        <View style={styles.footer}>
          {getStatusIndicator()}
          {message.lastReplyId && (
            <View style={styles.repliedIndicator}>
              <Ionicons name="arrow-undo" size={12} color={theme.colors.primary} />
              <Text style={styles.repliedText}>Replied</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unreadContainer: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0F8FF',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  unreadText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  subjectText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bodyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  repliedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',  },
  repliedText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});
