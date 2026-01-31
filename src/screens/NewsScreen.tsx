import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { newsService } from '../services/newsService';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { AppHeader } from '../components/AppHeader';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { NewsItem } from '../types';
import { formatDateTime } from '../utils/dateUtils';

export const NewsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, firebaseUser } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
    return 1; // Small mobile - 1 column (very narrow screens)
  };
  
  const getCardWidth = () => {
    const columns = getColumns();
    if (columns === 1) return 100; // Full width for single column
    const gap = 2; // 2% gap for multi-column
    return (100 - gap * (columns - 1)) / columns; // Return number for percentage
  };

  useEffect(() => {
    loadNews();
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

  const loadNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const newsData = await newsService.getPublishedNews();
      setNews(newsData);
    } catch (error) {
      console.error('Error loading news:', error);
      // Don't show alert for index errors, just log it
      if (error instanceof Error && !error.message.includes('requires an index')) {
        Alert.alert(t('common.error'), 'Failed to load news');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'announcement':
        return 'megaphone-outline';
      case 'update':
        return 'refresh-outline';
      case 'info':
        return 'information-circle-outline';
      default:
        return 'newspaper-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'announcement':
        return theme.colors.primary;
      case 'update':
        return theme.colors.success;
      case 'info':
        return theme.colors.secondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(yOffset > 200);
  };

  return (
    <View style={styles.container}>
      <AppHeader title={t('news.title')} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>{t('news.loadingNews')}</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.newsGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadNews(true)} />
          }
        >
          {news.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.newsCard, { width: `${getCardWidth()}%` }]}
              onPress={() => navigation.navigate('NewsDetails', { newsId: item.id })}
            >
              {item.imageUrl && !item.imageUrl.startsWith('blob:') && (
                <Image 
                  source={{ uri: item.imageUrl }} 
                  style={styles.newsImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.newsContent}>
                <View style={styles.newsHeader}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: getCategoryColor(item.category) },
                    ]}
                  >
                    <Ionicons 
                      name={getCategoryIcon(item.category)} 
                      size={12} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.categoryText}>
                      {t(`news.${item.category}`)}
                    </Text>
                  </View>
                  <Text style={styles.newsDate}>
                    {formatDateTime(item.publishedAt)}
                  </Text>
                </View>
                <Text style={styles.newsTitle}>{item.title}</Text>
                <Text style={styles.newsExcerpt} numberOfLines={2}>
                  {item.content}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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
  newsGrid: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
  },
  newsCard: {
    aspectRatio: 1,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 0,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  newsImage: {
    width: '100%',
    height: '60%', // 60% of card height for image
    backgroundColor: theme.colors.border,
  },
  newsContent: {
    padding: 4, // Consistent padding for all screen sizes
    flex: 1, // Take remaining space
    justifyContent: 'flex-start', // Changed from space-between
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2, // Tight margin
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4, // Reduced from theme.spacing.xs (8px)
    paddingVertical: 1, // Reduced from 2px
    borderRadius: theme.borderRadius.round,
    gap: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newsDate: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  newsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2, // Tight margin
    lineHeight: 13,
  },
  newsExcerpt: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    lineHeight: 11,
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
