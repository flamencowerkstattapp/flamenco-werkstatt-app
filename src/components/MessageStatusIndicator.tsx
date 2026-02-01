import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { Message, DeliveryStatus, ReadStatus } from '../types';

interface MessageStatusIndicatorProps {
  message?: Message;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  readStatus?: 'unread' | 'read' | 'replied';
  userId?: string;
  isFromCurrentUser?: boolean;
  showDetailedStatus?: boolean;
  showTimestamp?: boolean;
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  message,
  deliveryStatus = 'sent',
  readStatus = 'unread',
  userId,
  isFromCurrentUser = false,
  showDetailedStatus = false,
  showTimestamp = false,
}) => {
  // Get the actual status from message if provided
  const getActualDeliveryStatus = () => {
    if (message && userId) {
      const userDelivery = message.deliveryTracking?.[userId];
      if (userDelivery) {
        return userDelivery.status;
      }
    }
    return deliveryStatus;
  };

  const getActualReadStatus = () => {
    if (message && userId) {
      const userRead = message.readStatus?.[userId];
      if (userRead) {
        return userRead.status;
      }
    }
    return readStatus;
  };

  const actualDeliveryStatus = getActualDeliveryStatus();
  const actualReadStatus = getActualReadStatus();

  const getDeliveryIcon = () => {
    switch (actualDeliveryStatus) {
      case 'pending':
        return <Ionicons name="time" size={18} color={theme.colors.textSecondary} />;
      case 'sent':
        return <Ionicons name="paper-plane" size={18} color={theme.colors.textSecondary} />;
      case 'delivered':
        return <Ionicons name="checkmark-done-circle" size={18} color={theme.colors.success} />;
      case 'failed':
        return <Ionicons name="close-circle" size={18} color={theme.colors.error} />;
      default:
        return <Ionicons name="help-circle" size={18} color={theme.colors.textSecondary} />;
    }
  };

  const getReadIcon = () => {
    switch (actualReadStatus) {
      case 'unread':
        return <Ionicons name="mail-unread" size={18} color={theme.colors.textSecondary} />;
      case 'read':
        return <Ionicons name="mail-open" size={18} color={theme.colors.primary} />;
      case 'replied':
        return <Ionicons name="mail-unread" size={18} color={theme.colors.success} />;
      default:
        return <Ionicons name="mail" size={18} color={theme.colors.textSecondary} />;
    }
  };

  const getStatusText = () => {
    if (!showDetailedStatus) return '';
    
    const statusTexts = {
      pending: 'Sending...',
      sent: 'Sent',
      delivered: 'Delivered',
      failed: 'Failed to send',
      unread: 'Unread',
      read: 'Read',
      replied: 'Replied',
    };
    
    return isFromCurrentUser 
      ? statusTexts[deliveryStatus] || ''
      : statusTexts[readStatus] || '';
  };

  const getStatusColor = () => {
    if (isFromCurrentUser) {
      switch (deliveryStatus) {
        case 'pending': return theme.colors.textSecondary;
        case 'sent': return theme.colors.textSecondary;
        case 'delivered': return theme.colors.primary;
        case 'failed': return theme.colors.error;
        default: return theme.colors.textSecondary;
      }
    } else {
      switch (readStatus) {
        case 'unread': return theme.colors.textSecondary;
        case 'read': return theme.colors.primary;
        case 'replied': return theme.colors.success;
        default: return theme.colors.textSecondary;
      }
    }
  };

  const getStatusBackgroundColor = () => {
    if (isFromCurrentUser) {
      switch (deliveryStatus) {
        case 'pending': return { backgroundColor: 'rgba(156, 163, 175, 0.1)' };
        case 'sent': return { backgroundColor: 'rgba(156, 163, 175, 0.1)' };
        case 'delivered': return { backgroundColor: 'rgba(34, 197, 94, 0.1)' };
        case 'failed': return { backgroundColor: 'rgba(239, 68, 68, 0.1)' };
        default: return { backgroundColor: 'rgba(156, 163, 175, 0.1)' };
      }
    } else {
      switch (readStatus) {
        case 'unread': return { backgroundColor: 'rgba(156, 163, 175, 0.1)' };
        case 'read': return { backgroundColor: 'rgba(59, 130, 246, 0.1)' };
        case 'replied': return { backgroundColor: 'rgba(34, 197, 94, 0.1)' };
        default: return { backgroundColor: 'rgba(156, 163, 175, 0.1)' };
      }
    }
  };

  if (!showDetailedStatus) {
    return (
      <View style={[styles.compactIndicator, getStatusBackgroundColor()]}>
        {isFromCurrentUser ? getDeliveryIcon() : getReadIcon()}
      </View>
    );
  }

  return (
    <View style={styles.detailedIndicator}>
      {isFromCurrentUser ? getDeliveryIcon() : getReadIcon()}
      <Text style={[styles.statusText, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  compactIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  detailedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
