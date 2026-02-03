import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { newsService } from '../services/newsService';
import { AppHeader } from '../components/AppHeader';
import { FlamencoLoading } from '../components/FlamencoLoading';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { NewsItem } from '../types';
import { formatDateTime } from '../utils/dateUtils';

interface RouteParams {
  newsId: string;
}

export const NewsDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { newsId } = route.params as RouteParams;
  
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNewsDetails();
  }, [newsId]);

  const loadNewsDetails = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const news = await newsService.getNewsById(newsId);
      
      if (!news) {
        Alert.alert(t('common.error'), 'News article not found');
        navigation.goBack();
        return;
      }

      if (!news.isPublished) {
        Alert.alert(t('common.error'), 'This news article is not yet published');
        navigation.goBack();
        return;
      }

      setNewsItem(news);
    } catch (error) {
      console.error('Error loading news details:', error);
      Alert.alert(t('common.error'), 'Failed to load news article');
      navigation.goBack();
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

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('news.title')} />
        <FlamencoLoading 
          message={t('news.loadingNews')} 
          size="medium" 
        />
      </View>
    );
  }

  if (!newsItem) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('news.title')} />
        <View style={styles.errorContainer}>
          <Ionicons name="newspaper-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.errorText}>News article not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={newsItem.title} />
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadNewsDetails(true)} />
        }
      >
        {newsItem.imageUrl && !newsItem.imageUrl.startsWith('blob:') && (
          <Image source={{ uri: newsItem.imageUrl }} style={styles.newsImage} resizeMode="contain" />
        )}

        <View style={styles.newsContent}>
          <View style={styles.newsHeader}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: getCategoryColor(newsItem.category) },
              ]}
            >
              <Ionicons
                name={getCategoryIcon(newsItem.category) as any}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.categoryText}>
                {t(`news.${newsItem.category}`)}
              </Text>
            </View>
            <Text style={styles.newsDate}>
              {formatDateTime(newsItem.publishedAt)}
            </Text>
          </View>

          <Text style={styles.newsTitle}>{newsItem.title}</Text>

          <View style={styles.newsMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>
                {t('news.publishedBy')}: {newsItem.publishedBy}
              </Text>
            </View>
          </View>

          <View style={styles.newsBody}>
            <Text style={styles.bodyText}>{newsItem.content}</Text>
          </View>
        </View>
      </ScrollView>
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
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.lg, // Extra gap from titlebar
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  newsImage: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.border,
  },
  newsContent: {
    padding: theme.spacing.md,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: theme.spacing.xs,
  },
  newsDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  newsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    lineHeight: 32,
  },
  newsMeta: {
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',    marginBottom: theme.spacing.xs,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  newsBody: {
    paddingTop: theme.spacing.md,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
});
