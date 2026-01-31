import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl, TextInput, SafeAreaView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { eventsService } from '../services/eventsService';
import { imageService } from '../services/imageService';
import { AppHeader } from '../components/AppHeader';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CustomDateTimePicker } from '../components/DateTimePicker';
import { RecurringEventSelector } from '../components/RecurringEventSelector';
import { LocationToggle } from '../components/LocationToggle';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { SpecialEvent, RecurringPattern } from '../types';
import { validateEventData, checkEventConflicts, checkRecurringEventConflicts } from '../utils/eventUtils';
import { formatDateTime } from '../utils/dateUtils';


export const ManageEventsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, firebaseUser } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SpecialEvent | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    maxParticipants: '',
    price: '',
    imageUrl: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    registrationDeadline: undefined as Date | undefined,
    isOffsite: false,
    isRecurring: false,
    recurringPattern: undefined as RecurringPattern | undefined,
    blocksCalendar: true,
  });

  // Responsive design
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Determine columns based on screen width
  const getColumns = () => {
    if (screenWidth >= 768) return 4; // Desktop - 4 columns
    if (screenWidth >= 480) return 3; // Tablet - 3 columns
    if (screenWidth >= 360) return 2; // Large mobile - 2 columns
    return 1; // Small mobile - 1 column
  };
  
  const getCardWidth = () => {
    const columns = getColumns();
    const gap = columns > 1 ? 2 : 0; // 2% gap for multi-column
    return (100 - gap * (columns - 1)) / columns;
  };

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to make this work!'
        );
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 2],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ 
          ...prev, 
          imageUrl: result.assets[0].uri 
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from library');
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Scroll to top when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      const scrollToTop = () => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
      };
      
      // Small delay to ensure the component is fully mounted
      const timeoutId = setTimeout(scrollToTop, 100);
      
      return () => clearTimeout(timeoutId);
    }, [])
  );

  const loadEvents = async () => {
    setLoading(true);
    
    try {
      const eventsData = await eventsService.getAllEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert(t('common.error'), t('events.errorLoadingEvents'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const toggleEventStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      await eventsService.togglePublishStatus(eventId, currentStatus);
      await loadEvents();
      Alert.alert(t('common.success'), currentStatus ? t('events.eventUnpublished') : t('events.eventPublished'));
    } catch (error) {
      console.error('Error updating event status:', error);
      Alert.alert(t('common.error'), t('events.errorUpdatingStatus'));
    }
  };

  const deleteEvent = async (eventId: string) => {
    // Use browser confirm for React Native Web compatibility
    const confirmed = window.confirm(
      t('events.deleteEventConfirm')
    );
    
    if (confirmed) {
      try {
        await eventsService.deleteEvent(eventId);
        await loadEvents();
        alert(t('events.eventDeletedSuccess'));
      } catch (error) {
        console.error('Error deleting event:', error);
        alert(t('events.errorDeletingEvent'));
      }
    }
  };

  
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      maxParticipants: '',
      price: '',
      imageUrl: '',
      startDate: undefined,
      endDate: undefined,
      registrationDeadline: undefined,
      isOffsite: false,
      isRecurring: false,
      recurringPattern: undefined,
      blocksCalendar: true,
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleEditEvent = (event: SpecialEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      location: event.location,
      maxParticipants: event.maxParticipants?.toString() || '',
      price: event.price?.toString() || '',
      imageUrl: event.imageUrl || '',
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      isOffsite: event.isOffsite,
      isRecurring: false,
      recurringPattern: undefined,
      blocksCalendar: !event.isOffsite,
    });
    setShowForm(true);
  };

  const handleCreateOrUpdateEvent = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert(t('common.error'), t('admin.titleAndContentRequired'));
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      Alert.alert(t('common.error'), t('events.selectBothDates'));
      return;
    }

    try {
      setUploadingImage(true);
      
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location.trim(),
        isOffsite: formData.isOffsite,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
        currentParticipants: editingEvent?.currentParticipants || 0,
        registrationDeadline: formData.registrationDeadline,
        price: formData.price.trim() === '' ? undefined : parseFloat(formData.price),
        imageUrl: formData.imageUrl.trim() || undefined,
        isPublished: editingEvent?.isPublished ?? false,
        createdBy: `${user?.firstName} ${user?.lastName}` || 'Admin',
      };

      if (editingEvent) {
        await eventsService.updateEvent(editingEvent.id, eventData, firebaseUser?.uid);
        Alert.alert(t('common.success'), t('events.eventUpdatedSuccess'));
      } else {
        await eventsService.createEvent(eventData, firebaseUser?.uid);
        Alert.alert(t('common.success'), t('events.eventCreatedSuccess'));
      }

      resetForm();
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert(t('common.error'), t('events.failedToSaveEvent'));
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <AppHeader title={t('admin.manageEvents')} />

      <View style={styles.header}>
        <Text style={styles.totalEvents}>{t('events.totalEvents')}: {events.length}</Text>
        <Text style={styles.publishedEvents}>{t('events.published')}: {events.filter(e => e.isPublished).length}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={t('events.addNewEvent')}
          onPress={() => setShowForm(true)}
          variant="primary"
          style={styles.addButton}
        />
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingEvent ? t('events.updateEvent') : t('events.addNewEvent')}
          </Text>
          
          <Input
            label={t('events.eventTitle')}
            placeholder={t('events.eventTitle')}
            value={formData.title}
            onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
            icon="document-text-outline"
          />

          <Input
            label={t('events.eventDescription')}
            placeholder={t('events.eventDescription')}
            value={formData.description}
            onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
            multiline
            numberOfLines={3}
            icon="document-outline"
          />

          <Input
            label={t('events.maxParticipants')}
            placeholder={t('events.maxParticipants')}
            value={formData.maxParticipants}
            onChangeText={(value) => setFormData(prev => ({ ...prev, maxParticipants: value }))}
            icon="people-outline"
            keyboardType="numeric"
          />

          <Input
            label={`${t('events.price')} (€)`}
            placeholder={t('events.price')}
            value={formData.price}
            onChangeText={(value) => setFormData(prev => ({ ...prev, price: value }))}
            icon="cash-outline"
            keyboardType="numeric"
          />

          <View style={styles.imageSection}>
            <Text style={styles.imageLabel}>{t('events.imageUrl')}</Text>
            
            <View style={styles.imageInputContainer}>
              <Input
                placeholder={t('events.imageUrl')}
                value={formData.imageUrl}
                onChangeText={(value) => setFormData(prev => ({ ...prev, imageUrl: value }))}
                icon="image-outline"
                style={styles.urlInput}
              />
              
              <TouchableOpacity 
                style={styles.imagePickerButton} 
                onPress={pickImage}
              >
                <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.imagePickerText}>From Device</Text>
              </TouchableOpacity>
            </View>

            {formData.imageUrl && (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: formData.imageUrl }} 
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  {imageService.isBlobUrl(formData.imageUrl) && (
                    <View style={styles.uploadIndicator}>
                      <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.uploadIndicatorText}>Will be uploaded</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                  >
                    <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <CustomDateTimePicker
            label={t('events.startDate')}
            value={formData.startDate}
            onChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
            mode="datetime"
            icon="calendar-outline"
          />

          <CustomDateTimePicker
            label={t('events.endDate')}
            value={formData.endDate}
            onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
            mode="datetime"
            icon="time-outline"
          />

          <CustomDateTimePicker
            label={t('events.registrationDeadline')}
            value={formData.registrationDeadline}
            onChange={(date) => setFormData(prev => ({ ...prev, registrationDeadline: date }))}
            mode="datetime"
            icon="alert-circle-outline"
          />

          <LocationToggle
            isOnsite={!formData.isOffsite}
            onChange={(isOnsite, location) => {
              setFormData(prev => ({ 
                ...prev, 
                isOffsite: !isOnsite,
                location: location || prev.location,
                blocksCalendar: isOnsite ? prev.blocksCalendar : false
              }));
            }}
            currentLocation={formData.location}
          />

          <RecurringEventSelector
            value={formData.recurringPattern}
            onChange={(pattern) => {
              setFormData(prev => ({ 
                ...prev, 
                recurringPattern: pattern,
                isRecurring: !!pattern
              }));
            }}
          />

          {!formData.isOffsite && (
            <View style={styles.switchContainer}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t('events.blockCalendarSlot')}</Text>
                <TouchableOpacity
                  style={[
                    styles.switchButton,
                    formData.blocksCalendar && styles.switchButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, blocksCalendar: !prev.blocksCalendar }))}
                >
                  <Ionicons 
                    name={formData.blocksCalendar ? "checkmark" : "close"} 
                    size={16} 
                    color={formData.blocksCalendar ? "#FFFFFF" : theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.switchDescription}>
                {t('events.preventOtherBookings')}
              </Text>
            </View>
          )}

          <View style={styles.formActions}>
            <Button
              title={t('common.cancel')}
              onPress={resetForm}
              variant="outline"
              style={styles.formButton}
            />
            <Button
              title={uploadingImage ? 'Uploading...' : (editingEvent ? t('events.updateEvent') : t('calendar.createEvent'))}
              onPress={handleCreateOrUpdateEvent}
              variant="primary"
              style={styles.formButton}
              disabled={uploadingImage}
            />
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>{t('common.loading')}</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.eventsGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>
                  {event.title || 'Untitled Event'}
                </Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: event.isPublished ? theme.colors.success : theme.colors.warning 
                }]}>
                  <Text style={styles.statusText}>
                    {event.isPublished ? t('events.published') : t('events.draft')}
                  </Text>
                </View>
              </View>
              
              {event.imageUrl && !event.imageUrl.startsWith('blob:') && (
                <View style={styles.eventImageContainer}>
                  <Image 
                    source={{ uri: event.imageUrl }} 
                    style={styles.eventThumbnail}
                    resizeMode="cover"
                  />
                </View>
              )}
              
              <Text style={styles.eventContent} numberOfLines={2}>
                {event.description}
              </Text>
              
              <View style={styles.eventDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {event.location}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {formatDateTime(event.startDate)}
                  </Text>
                </View>
                
                {event.endDate && (
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>
                      Ends: {formatDateTime(event.endDate)}
                    </Text>
                  </View>
                )}
                
                {event.registrationDeadline && (
                  <View style={styles.detailItem}>
                    <Ionicons name="alarm-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>
                      Reg: {formatDateTime(event.registrationDeadline)}
                    </Text>
                  </View>
                )}
                
                {event.maxParticipants && (
                  <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {event.currentParticipants}/{event.maxParticipants}
                    </Text>
                  </View>
                )}
                
                {event.price !== undefined && (
                  <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.detailText}>
                      €{event.price.toFixed(2)}
                    </Text>
                  </View>
                )}
                
                <View style={styles.detailItem}>
                  <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {event.createdBy}
                  </Text>
                </View>
              </View>

              <View style={styles.eventActions}>
                <Button
                  title={t('common.edit')}
                  onPress={() => handleEditEvent(event)}
                  variant="outline"
                  size="small"
                  style={styles.actionButton}
                />
                
                <Button
                  title={event.isPublished ? t('admin.unpublish') : t('admin.publish')}
                  onPress={() => toggleEventStatus(event.id, event.isPublished)}
                  variant={event.isPublished ? 'secondary' : 'success'}
                  size="small"
                  style={styles.actionButton}
                />
                
                <Button
                  title={t('common.delete')}
                  onPress={() => deleteEvent(event.id)}
                  variant="danger"
                  size="small"
                  style={styles.actionButton}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      </ScrollView>
      
      <ScrollToTopButton scrollViewRef={scrollViewRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    paddingBottom: 100, // Add padding for bottom tabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  totalEvents: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  publishedEvents: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
  },
  actions: {
    padding: theme.spacing.md,
  },
  addButton: {
    alignSelf: 'center',
    minWidth: 200,
    maxWidth: 250,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  formButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  eventsGrid: {
    padding: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
  },
  eventCard: {
    width: '23.5%',
    minHeight: 400,
    maxHeight: 440,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    marginBottom: 0,
    ...theme.shadows.small,
  },
  eventImageContainer: {
    marginBottom: 2,
  },
  eventThumbnail: {
    width: '100%',
    height: 140,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginBottom: 2,
    lineHeight: 15,
  },
  statusBadge: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventContent: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 14,
    minHeight: 28, // Ensure space for 2 lines
  },
  eventDetails: {
    gap: 2,
    marginBottom: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailText: {
    fontSize: 9,
    color: theme.colors.textSecondary,
  },
  eventActions: {
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'column',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: theme.spacing.md,
    flex: 1,
  },
  switchButton: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  switchButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  switchDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  imageSection: {
    marginBottom: theme.spacing.md,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  imageInputContainer: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  urlInput: {
    width: '100%',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  imagePickerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: theme.borderRadius.md,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.xs,
  },
  uploadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  uploadIndicatorText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  removeImageButton: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 2,
  },
});
