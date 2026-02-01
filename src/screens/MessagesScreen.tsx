import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { messageService, getMessageService } from '../services/messageService';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { AppHeader } from '../components/AppHeader';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { MessageStatusIndicator } from '../components/MessageStatusIndicator';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { Message, User } from '../types';
import { formatDateTime } from '../utils/dateUtils';

export const MessagesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [recipientNames, setRecipientNames] = useState<Record<string, string>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]); // Cache all users

  useEffect(() => {
    loadMessages();
  }, [activeTab]);

  // Reload messages and scroll to top when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      loadMessages(); // Reload messages to get updated read status
      
      const scrollToTop = () => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToOffset({ offset: 0, animated: false });
        }
      };
      
      // Small delay to ensure the component is fully mounted
      const timeoutId = setTimeout(scrollToTop, 100);
      
      return () => clearTimeout(timeoutId);
    }, [activeTab])
  );

  const loadRecipientNames = async (messages: Message[]) => {
    const names: Record<string, string> = {};
    
    // Get unique recipient IDs from individual messages
    const individualRecipientIds = new Set<string>();
    messages.forEach(msg => {
      if (msg.recipientType === 'individual') {
        msg.recipientIds.forEach(id => individualRecipientIds.add(id));
      }
    });

    // Use cached users if available, otherwise fetch them
    let users = allUsers;
    if (users.length === 0) {
      try {
        const service = getMessageService();
        users = await service.getActiveUsers();
        setAllUsers(users); // Cache for future use
      } catch (error) {
        console.error('Error loading users:', error);
      }
    }
    
    // Create a map of user ID to full name
    const userMap: Record<string, string> = {};
    users.forEach(user => {
      userMap[user.id] = `${user.firstName} ${user.lastName}`;
    });

    // Use actual names when available, fallback to User ID format
    individualRecipientIds.forEach(id => {
      names[id] = userMap[id] || `User ${id.slice(-6)}`;
    });

    setRecipientNames(names);
  };

  const loadMessages = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let messagesData: Message[] = [];

      try {
        const service = getMessageService();
        if (activeTab === 'inbox') {
          messagesData = await service.getInboxMessages(user.id);
        } else {
          messagesData = await service.getSentMessages(user.id);
        }
      } catch (firebaseError) {
        console.error('Firebase messages error:', firebaseError);
        Alert.alert(
          t('common.error'),
          t('messages.errorLoadingMessage'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
        return;
      }

      setMessages(messagesData);
      
      // Load recipient names for sent messages
      if (activeTab === 'sent') {
        loadRecipientNames(messagesData);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert(
        t('common.error'),
        t('messages.errorLoadingMessage')
      );
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isRead = activeTab === 'inbox' ? item.isRead[user?.id || ''] : true;
    const userReadStatus = item.readStatus?.[user?.id || ''] || 'unread';
    const isFromCurrentUser = item.senderId === user?.id;
    const isInbox = activeTab === 'inbox';
    
    const iconName = isInbox ? (isRead ? 'mail-open' : 'mail-outline') : 'send-outline';
    const iconColor = isInbox ? (isRead ? theme.colors.success : theme.colors.error) : theme.colors.primary;

    // Helper function to format recipient names for sent messages
    const formatRecipientNames = (message: Message) => {
      if (message.recipientType === 'individual') {
        const recipientNamesList = message.recipientIds.map(id => recipientNames[id] || `User ${id.slice(-6)}`);
        if (recipientNamesList.length === 1) {
          return `To: ${recipientNamesList[0]}`;
        } else {
          return `To: ${recipientNamesList.join(', ')}`;
        }
      } else if (message.recipientType === 'all-members') {
        return 'To: All Members';
      } else if (message.recipientType === 'all-instructors') {
        return 'To: All Instructors';
      } else if (message.recipientType === 'group') {
        return `To: Group (${message.recipientIds.length} people)`;
      }
      return `To: ${message.recipientType}`;
    };

    return (
      <TouchableOpacity
        style={[styles.messageCard, !isRead && styles.messageCardUnread]}
        onPress={() => navigation.navigate('MessageDetails', { messageId: item.id })}
      >
        <View style={styles.messageHeader}>
          <View style={styles.messageFrom}>
            <Ionicons
              name="person-outline"
              size={18}
              color={theme.colors.textSecondary}
              style={{ marginRight: theme.spacing.sm }}
            />
            <Text style={styles.senderName}>
              {isInbox ? item.senderName : formatRecipientNames(item)}
            </Text>
          </View>
          <View style={styles.messageStatusContainer}>
            {!isRead && <View style={styles.unreadBadge} />}
            <Ionicons
              name={iconName}
              size={20}
              color={iconColor}
            />
          </View>
        </View>

        <Text style={[styles.messageSubject, !isRead && styles.messageSubjectUnread]} numberOfLines={1}>
          {item.subject}
        </Text>

        <Text style={styles.messageBody} numberOfLines={2}>
          {item.body}
        </Text>

        <View style={styles.messageFooter}>
          <Text style={styles.messageDate}>{formatDateTime(item.createdAt)}</Text>
          {item.lastReplyId && (
            <View style={styles.repliedIndicator}>
              <Ionicons name="arrow-undo" size={12} color={theme.colors.primary} />
              <Text style={styles.repliedText}>Replied</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('messages.title')} showComposeButton onComposePress={() => navigation.navigate('ComposeMessage')} />

      {loading ? (
        <FlamencoLoading 
          message={t('messages.loadingMessages')} 
          size="medium" 
        />
      ) : (
        <>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'inbox' && styles.tabActive]}
              onPress={() => setActiveTab('inbox')}
            >
              <Text style={[styles.tabText, activeTab === 'inbox' && styles.tabTextActive]}>
                {t('messages.inbox')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
              onPress={() => setActiveTab('sent')}
            >
              <Text style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
                {t('messages.sent')}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={scrollViewRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadMessages} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="mail-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyStateText}>{t('messages.noMessages')}</Text>
              </View>
            }
          />
          
          {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}
        </>
      )}
    </View>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  composeButton: {
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
  messagesList: {
    padding: theme.spacing.md,
  },
  messageCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.small,
  },
  messageCardUnread: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  messageFrom: {
    flexDirection: 'row',
    alignItems: 'center',    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  messageBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  messageDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  messageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',  },
  messageSubjectUnread: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  messageFooter: {
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
});
