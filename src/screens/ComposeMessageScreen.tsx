import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { messageService, getMessageService } from '../services/messageService';
import { groupsService } from '../services/groupsService';
import { AppHeader } from '../components/AppHeader';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { User, UserRole, Group } from '../types';

interface RecipientOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ReplyToData {
  id: string;
  senderName: string;
  subject: string;
  body: string;
}

interface ComposeMessageScreenProps {
  route?: {
    params?: {
      replyTo?: ReplyToData;
    };
  };
  navigation: any;
}

export const ComposeMessageScreen: React.FC<ComposeMessageScreenProps> = ({ 
  route, 
  navigation 
}) => {
  const { user } = useAuth();
  const replyTo = route?.params?.replyTo;

  const [recipientType, setRecipientType] = useState<'individual' | 'group' | 'all-members' | 'all-instructors'>('individual');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<RecipientOption[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showGroupScrollToTop, setShowGroupScrollToTop] = useState(false);
  const individualListRef = useRef<ScrollView>(null);
  const groupListRef = useRef<ScrollView>(null);

  useEffect(() => {
    console.log('ComposeMessageScreen: replyTo received:', replyTo);
    if (replyTo) {
      console.log('ComposeMessageScreen: Setting up reply with subject:', replyTo.subject);
      setSubject(replyTo.subject);
      setBody(replyTo.body);
      setMessageSent(false);
      console.log('ComposeMessageScreen: Looking for sender:', replyTo.senderName);
    }
    loadUsers();
    loadGroups();
  }, [replyTo]);

  // Effect to set recipient when replying and users are loaded
  useEffect(() => {
    if (replyTo && availableUsers.length > 0) {
      console.log('ComposeMessageScreen: Users loaded, finding sender for reply');
      console.log('ComposeMessageScreen: Looking for sender:', replyTo.senderName);
      console.log('ComposeMessageScreen: Available users:', availableUsers.map(u => ({name: u.name, id: u.id})));
      
      const sender = availableUsers.find(user => user.name === replyTo.senderName);
      if (sender) {
        console.log('ComposeMessageScreen: Found sender, setting recipient:', sender.id, sender.name);
        setSelectedRecipient(sender.id);
      } else {
        console.log('ComposeMessageScreen: Sender not found in available users');
        console.log('ComposeMessageScreen: Available user names:', availableUsers.map(u => u.name));
      }
    }
  }, [replyTo, availableUsers]);

  const loadGroups = async () => {
    try {
      const groups = await groupsService.getActiveGroups();
      setAvailableGroups(groups);
      console.log('COMPOSE MESSAGE: Loaded groups:', groups.length);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadUsers = async () => {
    console.log('=== COMPOSE MESSAGE: LOAD USERS START ===');
    setLoadingUsers(true);
    try {
      const service = getMessageService();
      console.log('COMPOSE MESSAGE: Current user:', user?.id, user?.firstName, user?.lastName, user?.role);
      
      let usersData: User[] = [];
      
      // Try to load all users for messaging
      console.log('COMPOSE MESSAGE: Loading all users for messaging (all roles have access)');
      
      try {
        usersData = await service.getActiveUsers();
        console.log('COMPOSE MESSAGE: Successfully loaded all users:', usersData.length);
      } catch (error) {
        console.log('COMPOSE MESSAGE: Full user access failed, using message-based workaround');
        
        // Workaround: Create a basic messaging system using message data
        if (replyTo) {
          console.log('COMPOSE MESSAGE: REPLY MODE - creating recipient from message data');
          
          // Create a minimal user object from the reply data
          const replyUser: User = {
            id: replyTo.id,
            firstName: replyTo.senderName.split(' ')[0] || replyTo.senderName,
            lastName: replyTo.senderName.split(' ').slice(1).join(' ') || '',
            email: '', // We don't have email from message data
            role: 'member' as UserRole, // Default to member for unknown roles
            isInstructor: false,
            isActive: true,
            memberSince: new Date(),
            phone: '',
            preferredLanguage: 'en', // Default language
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          usersData = [replyUser];
          console.log('COMPOSE MESSAGE: Created reply user from message data');
        } else {
          console.log('COMPOSE MESSAGE: Normal compose mode - creating admin contact option');
          
          // For normal compose, create an admin contact option
          const adminUser: User = {
            id: 'admin-contact',
            firstName: 'Club',
            lastName: 'Administrator',
            email: 'admin@flamenco.com',
            role: 'admin' as UserRole,
            isInstructor: false,
            isActive: true,
            memberSince: new Date(),
            phone: '',
            preferredLanguage: 'en',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          usersData = [adminUser];
          console.log('COMPOSE MESSAGE: Created admin contact option');
        }
      }
      
      console.log('COMPOSE MESSAGE: Final users data count:', usersData.length);
      
      if (usersData && usersData.length > 0) {
        console.log('COMPOSE MESSAGE: Raw users data:', usersData.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
          isActive: u.isActive
        })));
        
        // Filter out current user (users shouldn't message themselves)
        let filteredUsers = usersData.filter(userData => userData.id !== user?.id);
        console.log('COMPOSE MESSAGE: After removing self:', filteredUsers.length);
        
        const recipientOptions = filteredUsers.map(userData => ({
          id: userData.id,
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          role: userData.role,
        }));
        
        console.log('COMPOSE MESSAGE: Setting availableUsers:', recipientOptions.length);
        setAvailableUsers(recipientOptions);
        
        // Show appropriate message based on available recipients
        if (recipientOptions.length === 0) {
          console.log('COMPOSE MESSAGE: No recipients available');
          Alert.alert(
            t('common.error'),
            'No active users found. Please contact an administrator.',
            [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
          );
        }
      } else {
        console.log('COMPOSE MESSAGE: No users data available');
        Alert.alert(
          t('common.error'),
          'Unable to load users. Please try again or contact an administrator.',
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert(
        t('common.error'),
        'Failed to load users. Please try again.',
        [{ text: t('common.ok') }]
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const getRecipientLabel = () => {
    switch (recipientType) {
      case 'individual':
        if (selectedRecipient) {
          const recipient = availableUsers.find(u => u.id === selectedRecipient);
          return recipient ? recipient.name : t('messages.selectRecipient');
        }
        return t('messages.selectRecipient');
      case 'group':
        if (selectedGroup) {
          const group = availableGroups.find(g => g.id === selectedGroup);
          return group ? group.name : t('messages.selectGroup');
        }
        return t('messages.selectGroup');
      case 'all-members':
        return t('messages.allMembers');
      case 'all-instructors':
        return t('messages.allInstructors');
      default:
        return t('messages.selectRecipient');
    }
  };

  const getRecipientIds = (): string[] => {
    switch (recipientType) {
      case 'individual':
        return selectedRecipient ? [selectedRecipient] : [];
      case 'group':
        if (selectedGroup) {
          const group = availableGroups.find(g => g.id === selectedGroup);
          return group ? group.memberIds : [];
        }
        return [];
      case 'all-members':
        return availableUsers.filter(u => u.role === 'member').map(u => u.id);
      case 'all-instructors':
        return availableUsers.filter(u => (u as any).isInstructor === true).map(u => u.id);
      default:
        return [];
    }
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setSendSuccess(false); // Reset success state when user edits
  };

  const handleBodyChange = (value: string) => {
    setBody(value);
    setSendSuccess(false); // Reset success state when user edits
  };

  const validateMessage = () => {
    if (!subject.trim()) {
      Alert.alert(t('common.error'), t('messages.subjectRequired'));
      return false;
    }
    if (!body.trim()) {
      Alert.alert(t('common.error'), t('messages.bodyRequired'));
      return false;
    }
    const recipientIds = getRecipientIds();
    if (recipientIds.length === 0) {
      Alert.alert(t('common.error'), t('messages.recipientRequired'));
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (!user || !validateMessage()) return;

    setLoading(true);
    try {
      const recipientIds = getRecipientIds();
      
      const messageData = {
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        recipientIds,
        recipientType,
        subject: subject.trim(),
        body: body.trim(),
      };

      const service = getMessageService();
      const messageId = await service.createMessage(messageData);
      
      // If this is a reply, mark the original message as replied
      if (replyTo) {
        try {
          await service.markAsReplied(replyTo.id, user.id, messageId);
          console.log('Original message marked as replied');
        } catch (replyError) {
          console.warn('Could not mark original message as replied:', replyError);
        }
      }
      
      // Show success state briefly, then redirect to Sent messages
      setSendSuccess(true);
      setMessageSent(true);
      
      // After showing success animation, navigate to Sent messages
      setTimeout(() => {
        setSendSuccess(false);
        navigation.navigate('Messages', { initialTab: 'sent' });
      }, 2000);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(t('common.error'), t('messages.errorSendingMessage'));
    } finally {
      setLoading(false);
    }
  };

  const renderRecipientOption = (item: RecipientOption) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.recipientOption,
        selectedRecipient === item.id && styles.recipientOptionSelected,
      ]}
      onPress={() => {
        setSelectedRecipient(item.id);
        setShowRecipientModal(false);
      }}
    >
      <View style={styles.recipientInfo}>
        <Text style={styles.recipientName}>{item.name}</Text>
        <Text style={styles.recipientEmail}>{item.email}</Text>
        <Text style={styles.recipientRole}>{item.role}</Text>
      </View>
      {selectedRecipient === item.id && (
        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  // Filter users based on search query
  const filteredUsers = availableUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter groups based on search query
  const filteredGroups = availableGroups.filter(group =>
    group.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(groupSearchQuery.toLowerCase()))
  );

  const handleIndividualScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollToTop(yOffset > 200);
  };

  const scrollToTop = () => {
    individualListRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleGroupScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowGroupScrollToTop(yOffset > 200);
  };

  const scrollGroupToTop = () => {
    groupListRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('messages.composeMessage')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>{t('messages.recipient')}</Text>
          <TouchableOpacity
            style={styles.recipientButton}
            onPress={() => setShowRecipientModal(true)}
          >
            <Text style={styles.recipientText}>{getRecipientLabel()}</Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          {recipientType === 'group' && (
            <TouchableOpacity
              style={[styles.recipientButton, styles.groupSelectButton]}
              onPress={() => setShowGroupModal(true)}
            >
              <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.groupSelectText}>
                {selectedGroup 
                  ? availableGroups.find(g => g.id === selectedGroup)?.name 
                  : t('messages.selectGroup')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('messages.subject')}</Text>
          <TextInput
            style={styles.subjectInput}
            value={subject}
            onChangeText={handleSubjectChange}
            placeholder={t('messages.subjectPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('messages.body')}</Text>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={handleBodyChange}
            placeholder={t('messages.bodyPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.sendButton, 
            (loading || messageSent) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={loading || messageSent}
        >
          {loading ? (
            <View style={styles.sendingContainer}>
              <Text style={styles.sendingAnimation}>💌</Text>
              <Text style={styles.sendingText}>{t('messages.sending')}</Text>
            </View>
          ) : sendSuccess ? (
            <View style={styles.sendingContainer}>
              <Text style={styles.sendingAnimation}>✅</Text>
              <Text style={styles.sendingText}>{t('messages.sentSuccessfully')}</Text>
            </View>
          ) : messageSent ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.sendText}>{t('messages.messageSent')}</Text>
            </>
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.sendText}>{t('messages.send')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showRecipientModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecipientModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRecipientModal(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('messages.selectRecipientType')}</Text>
            <TouchableOpacity onPress={() => setShowRecipientModal(false)}>
              <Text style={styles.modalDone}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.recipientTypeOption,
                recipientType === 'group' && styles.recipientTypeOptionSelected,
              ]}
              onPress={() => {
                setRecipientType('group');
                setShowRecipientModal(false);
                setTimeout(() => setShowGroupModal(true), 300);
              }}
            >
              <View style={styles.recipientTypeInfo}>
                <Ionicons name="people" size={24} color={theme.colors.primary} />
                <Text style={styles.recipientTypeText}>{t('messages.groupMessage')}</Text>
                <Text style={styles.recipientTypeDesc}>
                  {t('messages.groupMessageDesc')}
                </Text>
              </View>
              {recipientType === 'group' && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.recipientTypeOption,
                recipientType === 'all-members' && styles.recipientTypeOptionSelected,
              ]}
              onPress={() => setRecipientType('all-members')}
            >
              <View style={styles.recipientTypeInfo}>
                <Ionicons name="person" size={24} color={theme.colors.primary} />
                <Text style={styles.recipientTypeText}>{t('messages.allMembers')}</Text>
                <Text style={styles.recipientTypeDesc}>
                  {t('messages.allMembersDesc')}
                </Text>
              </View>
              {recipientType === 'all-members' && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.recipientTypeOption,
                recipientType === 'all-instructors' && styles.recipientTypeOptionSelected,
              ]}
              onPress={() => setRecipientType('all-instructors')}
            >
              <View style={styles.recipientTypeInfo}>
                <Ionicons name="school" size={24} color={theme.colors.primary} />
                <Text style={styles.recipientTypeText}>{t('messages.allInstructors')}</Text>
                <Text style={styles.recipientTypeDesc}>
                  {t('messages.allInstructorsDesc')}
                </Text>
              </View>
              {recipientType === 'all-instructors' && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.recipientTypeOption,
                recipientType === 'individual' && styles.recipientTypeOptionSelected,
              ]}
              onPress={() => setRecipientType('individual')}
            >
              <View style={styles.recipientTypeInfo}>
                <Ionicons name="person-circle" size={24} color={theme.colors.primary} />
                <Text style={styles.recipientTypeText}>{t('messages.individualMessage')}</Text>
                <Text style={styles.recipientTypeDesc}>
                  {t('messages.individualMessageDesc')}
                </Text>
              </View>
              {recipientType === 'individual' && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            {recipientType === 'individual' && (
              <View style={styles.individualRecipients}>
                <Text style={styles.individualRecipientsTitle}>
                  {t('messages.selectIndividualRecipient')}
                </Text>
                
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('messages.searchRecipients')}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setSearchQuery('')}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {loadingUsers ? (
                  <FlamencoLoading 
                    message={t('messages.loadingContacts')} 
                    size="small" 
                  />
                ) : (
                  <>
                    {filteredUsers.length === 0 ? (
                      <Text style={styles.noUsersText}>
                        {searchQuery ? 'No users found matching your search' : 'No users available'}
                      </Text>
                    ) : (
                      <ScrollView
                        ref={individualListRef}
                        style={styles.individualListScroll}
                        onScroll={handleIndividualScroll}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                      >
                        {filteredUsers.map(renderRecipientOption)}
                      </ScrollView>
                    )}
                  </>
                )}

                {/* Scroll to Top Button */}
                {showScrollToTop && (
                  <TouchableOpacity
                    style={styles.scrollToTopButton}
                    onPress={scrollToTop}
                  >
                    <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Group Selection Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('messages.selectGroup')}</Text>
            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
              <Text style={styles.modalDone}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.groupModalContent}>
            {/* Search Bar for Groups */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={groupSearchQuery}
                onChangeText={setGroupSearchQuery}
                placeholder={t('messages.searchGroups')}
                placeholderTextColor={theme.colors.textSecondary}
              />
              {groupSearchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setGroupSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView 
              ref={groupListRef}
              style={styles.groupListScrollView}
              onScroll={handleGroupScroll}
              scrollEventThrottle={16}
            >
              {availableGroups.length === 0 ? (
                <View style={styles.emptyGroupsContainer}>
                  <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyGroupsText}>{t('messages.noGroupsAvailable')}</Text>
                  <Text style={styles.emptyGroupsSubtext}>{t('messages.createGroupsInAdmin')}</Text>
                </View>
              ) : filteredGroups.length === 0 ? (
                <View style={styles.emptyGroupsContainer}>
                  <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
                  <Text style={styles.emptyGroupsText}>No groups found</Text>
                  <Text style={styles.emptyGroupsSubtext}>Try a different search term</Text>
                </View>
              ) : (
                filteredGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupOption,
                    selectedGroup === group.id && styles.groupOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedGroup(group.id);
                    setShowGroupModal(false);
                  }}
                >
                  <View style={styles.groupOptionInfo}>
                    <View style={styles.groupOptionHeader}>
                      <Ionicons name="people" size={20} color={theme.colors.primary} />
                      <Text style={styles.groupOptionName}>{group.name}</Text>
                    </View>
                    {group.description && (
                      <Text style={styles.groupOptionDesc}>{group.description}</Text>
                    )}
                    <Text style={styles.groupOptionMembers}>
                      {group.memberIds.length} {t('groups.members')}
                    </Text>
                  </View>
                  {selectedGroup === group.id && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Scroll to Top Button for Groups */}
            {showGroupScrollToTop && filteredGroups.length > 0 && (
              <TouchableOpacity
                style={styles.scrollToTopButton}
                onPress={scrollGroupToTop}
              >
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
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
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  recipientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recipientText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  subjectInput: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 50,
  },
  bodyInput: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
    color: theme.colors.text,
    minHeight: 200,
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
    borderRadius: theme.borderRadius.md,  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 60,
  },
  modalCancel: {
    fontSize: 16,
    color: theme.colors.primary,
    minWidth: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  modalDone: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  groupModalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  recipientTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recipientTypeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#E3F2FD',
  },
  recipientTypeInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  recipientTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  recipientTypeDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  individualRecipients: {
    marginTop: theme.spacing.lg,
  },
  individualRecipientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  noUsersText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  individualListScroll: {
    maxHeight: 300,
  },
  groupListScrollView: {
    flex: 1,
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(220, 38, 38, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2.84,
  },
  recipientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recipientOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#E3F2FD',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  recipientEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  recipientRole: {
    fontSize: 12,
    color: theme.colors.primary,
    textTransform: 'capitalize',
  },
  sendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendingAnimation: {
    fontSize: 16,
  },
  sendingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  groupSelectButton: {
    marginTop: theme.spacing.sm,
  },
  groupSelectText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  emptyGroupsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyGroupsText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptyGroupsSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  groupOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#E3F2FD',
  },
  groupOptionInfo: {
    flex: 1,
  },
  groupOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  groupOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  groupOptionDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  groupOptionMembers: {
    fontSize: 12,
    color: theme.colors.primary,
  },
});
