import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { eventsService } from '../services/eventsService';
import { AppHeader } from '../components/AppHeader';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { LinkableText } from '../components/LinkableText';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { SpecialEvent } from '../types';
import { formatDateTime } from '../utils/dateUtils';

interface RouteParams {
  eventId: string;
}

export const EventDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params as RouteParams;
  
  const [event, setEvent] = useState<SpecialEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  const loadEventDetails = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const eventData = await eventsService.getEventById(eventId);
      
      if (!eventData) {
        Alert.alert(t('common.error'), 'Event not found');
        navigation.goBack();
        return;
      }

      setEvent(eventData);
    } catch (error) {
      console.error('Error loading event details:', error);
      Alert.alert(t('common.error'), 'Failed to load event details');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRegister = () => {
    if (!event) return;
    
    // For now, show an alert. In a real implementation, this would
    // handle event registration logic
    Alert.alert(
      t('events.register'),
      `Registration for "${event.title}" would be handled here.\n\nContact: ${event.createdBy}`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: 'Contact Organizer',
          onPress: () => {
            // Could implement messaging or email functionality here
            Alert.alert('Contact', `You can contact ${event.createdBy} for more information.`);
          },
        },
      ]
    );
  };

  const isFull = event?.maxParticipants 
    ? event.currentParticipants >= event.maxParticipants 
    : false;
  
  const registrationOpen = event?.registrationDeadline
    ? new Date() < event.registrationDeadline
    : true;

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('events.title')} />
        <FlamencoLoading />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('events.title')} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={t('events.title')} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadEventDetails(true)} />
        }
      >
        {event.imageUrl && !event.imageUrl.startsWith('blob:') && (
          <Image source={{ uri: event.imageUrl }} style={styles.eventImage} resizeMode="cover" />
        )}

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            {event.isOffsite && (
              <View style={styles.offsiteBadge}>
                <Ionicons name="location-outline" size={12} color="#FFFFFF" />
                <Text style={styles.offsiteText}>Offsite</Text>
              </View>
            )}
          </View>
          
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{event.createdBy}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{formatDateTime(event.startDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('events.eventDescription')}</Text>
          <LinkableText style={styles.description}>{event.description}</LinkableText>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('events.eventDetails')}</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{event.location}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(event.startDate)} - {formatDateTime(event.endDate)}
              </Text>
            </View>
          </View>

          {event.registrationDeadline && (
            <View style={styles.detailRow}>
              <Ionicons name="alarm-outline" size={20} color={theme.colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Registration Deadline</Text>
                <Text style={styles.detailValue}>{formatDateTime(event.registrationDeadline)}</Text>
              </View>
            </View>
          )}

          {event.maxParticipants && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Participants</Text>
                <Text style={styles.detailValue}>
                  {event.currentParticipants} / {event.maxParticipants}
                  {isFull && <Text style={styles.fullText}> (Full)</Text>}
                </Text>
              </View>
            </View>
          )}

          {event.price !== undefined && (
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.detailValue}>€{event.price.toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>

        {!isFull && registrationOpen && (
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            <Text style={styles.registerButtonText}>{t('events.register')}</Text>
          </TouchableOpacity>
        )}

        {isFull && (
          <View style={[styles.registerButton, styles.disabledButton]}>
            <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.disabledButtonText}>{t('events.full')}</Text>
          </View>
        )}

        {!registrationOpen && (
          <View style={[styles.registerButton, styles.disabledButton]}>
            <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.disabledButtonText}>Registration Closed</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
  },
  eventImage: {
    width: '100%',
    height: 250,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.border,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
    lineHeight: 30,
  },
  offsiteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  offsiteText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  metaInfo: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  detailContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  fullText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
  },
  disabledButtonText: {
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});
