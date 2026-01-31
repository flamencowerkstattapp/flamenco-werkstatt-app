import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { ScrollToTopButton } from '../components/ScrollToTopButton';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { newsService } from '../services/newsService';
import { imageService } from '../services/imageService';
import { theme } from '../constants/theme';
import { t } from '../locales';
import { NewsItem } from '../types';
import { formatDateTime } from '../utils/dateUtils';

export const ManageNewsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, firebaseUser } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    category: 'info' as NewsItem['category'],
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
    if (columns === 1) return 100; // Full width for single column
    const gap = 2; // 2% gap for multi-column
    return (100 - gap * (columns - 1)) / columns; // Return number for percentage
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
      Alert.alert(t('common.error'), t('admin.errorPickingImage'));
    }
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

  const loadNews = async () => {
    setLoading(true);
    
    try {
      const newsData = await newsService.getAllNews();
      setNews(newsData);
    } catch (error) {
      console.error('Error loading news:', error);
      Alert.alert(t('common.error'), t('admin.errorLoadingNews'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNews();
    setRefreshing(false);
  };

  const toggleNewsStatus = async (newsId: string, currentStatus: boolean) => {
    try {
      await newsService.togglePublishStatus(newsId, currentStatus);
      await loadNews();
      Alert.alert(t('common.success'), currentStatus ? t('admin.newsUnpublished') : t('admin.newsPublished'));
    } catch (error) {
      console.error('Error updating news status:', error);
      Alert.alert(t('common.error'), t('admin.errorUpdatingNewsStatus'));
    }
  };

  const deleteNews = async (newsId: string) => {
    // Use window.confirm for web compatibility
    const confirmed = window.confirm(
      `${t('common.delete')}\n\n${t('admin.deleteMessageConfirm')}`
    );
    
    if (confirmed) {
      try {
        await newsService.deleteNews(newsId);
        await loadNews();
        Alert.alert(
          t('admin.newsDeletedTitle'),
          t('admin.newsDeletedBody')
        );
      } catch (error) {
        console.error('Error deleting news:', error);
        Alert.alert(t('common.error'), t('admin.errorDeletingNews'));
      }
    }
  };


  const getCategoryColor = (category: NewsItem['category']) => {
    switch (category) {
      case 'announcement': return theme.colors.success;
      case 'update': return theme.colors.warning;
      case 'info': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      imageUrl: '',
      category: 'info',
    });
    setEditingNews(null);
    setShowForm(false);
  };

  const handleSubmitNews = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert(t('common.error'), t('admin.titleAndContentRequired'));
      return;
    }

    try {
      setUploadingImage(true);
      
      const newsData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        imageUrl: formData.imageUrl.trim() || undefined,
        category: formData.category,
        publishedBy: `${user?.firstName} ${user?.lastName}` || 'Admin',
        publishedAt: new Date(), // Will be overwritten by server timestamp
        isPublished: true, // Default to published
      };

      if (editingNews) {
        await newsService.updateNews(editingNews.id, newsData, firebaseUser?.uid);
        Alert.alert(t('common.success'), t('admin.newsUpdated'));
      } else {
        await newsService.createNews(newsData, firebaseUser?.uid);
        Alert.alert(t('common.success'), t('admin.newsCreated'));
      }

      resetForm();
      await loadNews();
    } catch (error) {
      console.error('Error saving news:', error);
      Alert.alert(t('common.error'), t('admin.errorSavingNews'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditNews = (newsItem: NewsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      imageUrl: newsItem.imageUrl || '',
      category: newsItem.category,
    });
    setShowForm(true);
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
      <AppHeader title={t('admin.manageNews')} />

      <View style={styles.header}>
        <Text style={styles.totalNews}>{t('news.title')}: {news.length}</Text>
        <Text style={styles.publishedNews}>{t('events.published')}: {news.filter(n => n.isPublished).length}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={t('admin.addNews')}
          onPress={() => setShowForm(true)}
          variant="primary"
          style={styles.addButton}
        />
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingNews ? t('admin.editNews') : t('admin.addNews')}
          </Text>
          
          <Input
            label={t('admin.newsTitle')}
            placeholder={t('admin.newsTitle')}
            value={formData.title}
            onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
            icon="document-text-outline"
          />

          <Input
            label={t('admin.newsContent')}
            placeholder={t('admin.newsContent')}
            value={formData.content}
            onChangeText={(value) => setFormData(prev => ({ ...prev, content: value }))}
            multiline
            numberOfLines={4}
            icon="document-outline"
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

          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>{t('admin.category')}</Text>
            <View style={styles.categoryButtons}>
              {(['announcement', 'update', 'info'] as const).map((category) => (
                <Button
                  key={category}
                  title={t(`news.${category}`)}
                  onPress={() => setFormData(prev => ({ ...prev, category }))}
                  variant={formData.category === category ? 'primary' : 'outline'}
                  size="small"
                  style={styles.categoryButton}
                />
              ))}
            </View>
          </View>

          <View style={styles.formActions}>
            <Button
              title={t('common.cancel')}
              onPress={resetForm}
              variant="outline"
              style={styles.formButton}
            />
            <Button
              title={uploadingImage ? 'Uploading...' : (editingNews ? t('admin.updateNews') : t('admin.createNews'))}
              onPress={handleSubmitNews}
              variant="primary"
              style={styles.formButton}
              disabled={uploadingImage}
            />
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>{t('news.loadingNews')}</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.newsGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {news.map((newsItem) => (
            <View key={newsItem.id} style={[styles.newsCard, { width: `${getCardWidth()}%` }]}>
              <View style={styles.newsHeader}>
                <Text style={styles.newsTitle}>{newsItem.title}</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: newsItem.isPublished ? theme.colors.success : theme.colors.warning 
                }]}>
                  <Text style={styles.statusText}>
                    {newsItem.isPublished ? t('events.published') : t('events.draft')}
                  </Text>
                </View>
              </View>
              
              {newsItem.imageUrl && !newsItem.imageUrl.startsWith('blob:') && (
                <View style={styles.newsImageContainer}>
                  <Image 
                    source={{ uri: newsItem.imageUrl }} 
                    style={styles.newsThumbnail}
                    resizeMode="cover"
                  />
                </View>
              )}
              
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(newsItem.category) }]}>
                <Text style={styles.categoryText}>
                  {t(`news.${newsItem.category}`)}
                </Text>
              </View>
              
              <Text style={styles.newsContent} numberOfLines={2}>
                {newsItem.content}
              </Text>
              
              <View style={styles.newsDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {formatDateTime(newsItem.publishedAt)}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Ionicons name="person-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {newsItem.publishedBy}
                  </Text>
                </View>
              </View>

              <View style={styles.newsActions}>
                <Button
                  title={t('common.edit')}
                  onPress={() => handleEditNews(newsItem)}
                  variant="outline"
                  size="small"
                  style={styles.actionButton}
                />
                
                <Button
                  title={newsItem.isPublished ? t('admin.unpublish') : t('admin.publish')}
                  onPress={() => toggleNewsStatus(newsItem.id, newsItem.isPublished)}
                  variant={newsItem.isPublished ? 'secondary' : 'success'}
                  size="small"
                  style={styles.actionButton}
                />
                
                <Button
                  title={t('common.delete')}
                  onPress={() => deleteNews(newsItem.id)}
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
  totalNews: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  publishedNews: {
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
  categoryContainer: {
    marginBottom: theme.spacing.md,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryButton: {
    minWidth: 80,
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
  newsGrid: {
    padding: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
  },
  newsCard: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    marginBottom: 0,
    ...theme.shadows.small,
  },
  newsImageContainer: {
    marginBottom: 2, // Reduced margin for compact layout
  },
  newsThumbnail: {
    width: '100%',
    height: 140, // More square proportions for four-column layout
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.border,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  newsTitle: {
    fontSize: 13, // Increased from 11
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginBottom: 2,
    lineHeight: 15,
  },
  statusBadge: {
    paddingHorizontal: 3, // Slightly increased
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 10, // Increased from 9
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  categoryText: {
    fontSize: 11, // Increased from 9
    fontWeight: '600',
    color: '#FFFFFF',
  },
  newsContent: {
    fontSize: 11, // Increased from 9
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  newsDetails: {
    gap: 2,
    marginBottom: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailText: {
    fontSize: 9, // Increased from 8
    color: theme.colors.textSecondary,
  },
  newsActions: {
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  actionButton: {
    flex: 1,
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
