import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { eventsService } from '../services/eventsService';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { AppHeader } from '../components/AppHeader';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { SpecialEvent } from '../types';
import { formatDate } from '../utils/dateUtils';

export const EventsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    if (screenWidth >= 600) return 3; // Tablet - 3 columns
    if (screenWidth >= 480) return 2; // Large mobile - 2 columns
    return 1; // Small mobile (<480px / <7.5cm) - 1 column
  };
  
  const getCardWidth = () => {
    const columns = getColumns();
    if (columns === 1) return 100; // Full width for single column
    const gap = 2; // 2% gap for multi-column
    return (100 - gap * (columns - 1)) / columns;
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

  const loadEvents = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const eventsData = await eventsService.getPublishedEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      if (error instanceof Error && !error.message.includes('requires an index')) {
        Alert.alert(t('common.error'), 'Failed to load events');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('events.title')} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>{t('common.loading')}</Text>
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.eventsGrid}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(true)} />
          }
        >
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>{t('events.noEvents')}</Text>
            </View>
          ) : (
            events.map((item) => {
              const isFull = item.maxParticipants
                ? item.currentParticipants >= item.maxParticipants
                : false;
              const registrationOpen = item.registrationDeadline
                ? new Date() < item.registrationDeadline
                : true;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.eventCard,
                    {
                      width: `${getCardWidth()}%`,
                      aspectRatio: screenWidth >= 768 ? 1 : 0.65, // Even taller on mobile to fit all content
                    }
                  ]}
                  onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                >
                  {item.imageUrl && !item.imageUrl.startsWith('blob:') && (
                    <Image 
                      source={{ uri: item.imageUrl }} 
                      style={[
                        styles.eventImage,
                        {
                          height: screenWidth >= 768 ? '60%' : '40%', // Even smaller image height on mobile
                        }
                      ]} 
                      resizeMode="cover" 
                    />
                  )}
                  <View style={[
                    styles.eventContent,
                    {
                      padding: screenWidth >= 768 ? 4 : 2, // Less padding on mobile
                    }
                  ]}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
                      {item.isOffsite && (
                        <View style={styles.offsiteBadge}>
                          <Ionicons name="location-outline" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    <Text style={[
                      styles.eventDescription,
                      {
                        marginBottom: screenWidth >= 768 ? 4 : screenWidth >= 480 ? 2 : 1, // Tighter on mobile single column
                      }
                    ]} numberOfLines={2}>
                      {item.description}
                    </Text>

                    <View style={[
                      styles.eventDetail,
                      {
                        marginBottom: screenWidth >= 768 ? 2 : screenWidth >= 480 ? 1 : 0, // Minimal spacing on mobile single column
                      }
                    ]}>
                      <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={styles.eventDetailText} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>

                    <View style={[
                      styles.eventDetail,
                      {
                        marginBottom: screenWidth >= 768 ? 2 : screenWidth >= 480 ? 1 : 0, // Minimal spacing on mobile single column
                      }
                    ]}>
                      <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={styles.eventDetailText} numberOfLines={1}>
                        {formatDate(item.startDate)}
                      </Text>
                    </View>

                    {item.endDate && (
                      <View style={[
                      styles.eventDetail,
                      {
                        marginBottom: screenWidth >= 768 ? 2 : screenWidth >= 480 ? 1 : 0, // Minimal spacing on mobile single column
                      }
                    ]}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.eventDetailText} numberOfLines={1}>
                          Ends: {formatDate(item.endDate)}
                        </Text>
                      </View>
                    )}

                    {item.registrationDeadline && (
                      <View style={[
                      styles.eventDetail,
                      {
                        marginBottom: screenWidth >= 768 ? 2 : screenWidth >= 480 ? 1 : 0, // Minimal spacing on mobile single column
                      }
                    ]}>
                        <Ionicons name="alarm-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.eventDetailText} numberOfLines={1}>
                          Reg: {formatDate(item.registrationDeadline)}
                        </Text>
                      </View>
                    )}

                    {item.maxParticipants && (
                      <View style={[
                      styles.eventDetail,
                      {
                        marginBottom: screenWidth >= 768 ? 2 : screenWidth >= 480 ? 1 : 0, // Minimal spacing on mobile single column
                      }
                    ]}>
                        <Ionicons name="people-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.eventDetailText}>
                          {item.currentParticipants}/{item.maxParticipants}
                        </Text>
                      </View>
                    )}

                    {item.price !== undefined && (
                      <View style={[
                      styles.eventDetail,
                      {
                        marginBottom: screenWidth >= 768 ? 2 : screenWidth >= 480 ? 1 : 0, // Minimal spacing on mobile single column
                      }
                    ]}>
                        <Ionicons name="cash-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.eventDetailText}>€{item.price.toFixed(2)}</Text>
                      </View>
                    )}

                    {item.createdBy && (
                      <View style={[
                      styles.eventDetail,
                      {
                        marginBottom: screenWidth >= 768 ? 2 : screenWidth >= 480 ? 1 : 0, // Minimal spacing on mobile single column
                      }
                    ]}>
                        <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.eventDetailText}>
                          {item.createdBy}
                        </Text>
                      </View>
                    )}

                    <View style={styles.eventFooter}>
                      {isFull ? (
                        <View style={[styles.statusBadge, { backgroundColor: theme.colors.error }]}>
                          <Text style={styles.statusText}>{t('events.full')}</Text>
                        </View>
                      ) : !registrationOpen ? (
                        <View style={[styles.statusBadge, { backgroundColor: theme.colors.disabled }]}>
                          <Text style={styles.statusText}>Closed</Text>
                        </View>
                      ) : (
                        <View style={styles.registerButton}>
                          <Text style={styles.registerButtonText}>{t('events.register')}</Text>
                          <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
      
      {showScrollTop && <ScrollToTopButton scrollViewRef={scrollViewRef} />}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventsGrid: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  eventCard: {
    aspectRatio: 1,
    flexGrow: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    marginRight: '1%',
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  eventImage: {
    width: '100%',
    height: '60%',
    backgroundColor: theme.colors.border,
  },
  eventContent: {
    padding: 4,
    flex: 1,
    justifyContent: 'space-between',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    lineHeight: 13,
  },
  eventDescription: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 11,
  },
  offsiteBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.round,
    marginLeft: 2,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventDetailText: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    flex: 1,
    marginLeft: theme.spacing.xs,
  },
  eventFooter: {
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  registerButtonText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
    width: '100%',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
  },
});
