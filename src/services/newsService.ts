import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { getFirestoreDB } from './firebase';
import { imageService } from './imageService';
import { NewsItem, User } from '../types';
import { notificationHelpers } from '../utils/notificationHelpers';

const NEWS_CATEGORIES = ['announcement', 'update', 'info'] as const;
export type NewsCategory = typeof NEWS_CATEGORIES[number];

export class NewsService {
  private db = getFirestoreDB();
  private collection = collection(this.db, 'news');

  async getAllNews(): Promise<NewsItem[]> {
    try {
      const newsQuery = query(
        this.collection,
        orderBy('publishedAt', 'desc')
      );

      const snapshot = await getDocs(newsQuery);
      return snapshot.docs.map(this.convertDocToNewsItem);
    } catch (error) {
      console.error('Error fetching all news:', error);
      throw new Error('Failed to fetch news items');
    }
  }

  async getPublishedNews(): Promise<NewsItem[]> {
    try {
      const newsQuery = query(
        this.collection,
        where('isPublished', '==', true),
        orderBy('publishedAt', 'desc')
      );

      const snapshot = await getDocs(newsQuery);
      return snapshot.docs.map(this.convertDocToNewsItem);
    } catch (error) {
      console.error('Error fetching published news:', error);
      
      // Fallback: Get all news and filter client-side if index doesn't exist yet
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.log('Index not ready, using client-side filtering as fallback');
        try {
          const allNewsQuery = query(this.collection, orderBy('publishedAt', 'desc'));
          const snapshot = await getDocs(allNewsQuery);
          const allNews = snapshot.docs.map(this.convertDocToNewsItem);
          return allNews.filter(news => news.isPublished);
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error('Failed to fetch published news');
        }
      }
      
      throw new Error('Failed to fetch published news');
    }
  }

  async getNewsById(id: string): Promise<NewsItem | null> {
    try {
      const newsDoc = await getDoc(doc(this.collection, id));
      
      if (!newsDoc.exists()) {
        return null;
      }

      return this.convertDocToNewsItem(newsDoc);
    } catch (error) {
      console.error('Error fetching news by ID:', error);
      throw new Error('Failed to fetch news item');
    }
  }

  async createNews(newsData: Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt'>, userUid?: string): Promise<string> {
    
    try {
      let tempImageUrl = newsData.imageUrl;
      
      // Step 1: Upload image to temp location if it's a blob URL
      if (newsData.imageUrl) {
        try {
          // Use the actual Firebase Auth UID if available, otherwise fallback to publishedBy
          let userId = userUid;
          
          if (!userId) {
            userId = newsData.publishedBy.includes(' ') ? 
              newsData.publishedBy.toLowerCase().replace(/\s+/g, '-') : 
              newsData.publishedBy;
          }
          
          tempImageUrl = await imageService.uploadImageIfBlob(newsData.imageUrl, userId);
        } catch (imageError) {
          console.warn('Image upload failed, saving news without image:', imageError);
          tempImageUrl = null;
        }
      }
      
      // Step 2: Create news document with temp image URL (or null)
      const docData = {
        ...newsData,
        imageUrl: tempImageUrl, // This can now be null, which Firestore accepts
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
      };

      const docRef = await addDoc(this.collection, docData);
      const newsId = docRef.id;
      
      // Step 3: Skip moving image for now - just use the temp URL directly
      // The temp URL should work fine for displaying images
      if (tempImageUrl && newsData.imageUrl && imageService.isBlobUrl(newsData.imageUrl)) {
        // Note: We'll implement proper image moving later when CORS is configured
      }
      
      return newsId;
    } catch (error) {
      console.error('Error creating news:', error);
      throw new Error('Failed to create news item');
    }
  }

  async updateNews(id: string, updates: Partial<Omit<NewsItem, 'id' | 'createdAt'>>, userUid?: string): Promise<void> {
    try {
      let uploadedImageUrl = updates.imageUrl;
      
      // Try to upload image if it's a blob URL, but don't fail if it doesn't work
      if (updates.imageUrl) {
        try {
          // Use the actual Firebase Auth UID if available, otherwise fallback to publishedBy
          const userId = userUid || 
            (updates.publishedBy?.includes(' ') ? 
              updates.publishedBy.toLowerCase().replace(/\s+/g, '-') : 
              updates.publishedBy) || 
            'unknown';
          uploadedImageUrl = await imageService.uploadImageIfBlob(updates.imageUrl, userId);
          
          // If this is a new blob image, move it to the proper news location
          if (updates.imageUrl && imageService.isBlobUrl(updates.imageUrl) && uploadedImageUrl) {
            try {
              const finalImageUrl = await imageService.moveImageToNewsLocation(uploadedImageUrl, id);
              uploadedImageUrl = finalImageUrl;
            } catch (moveError) {
              console.warn('Failed to move image to final location, keeping temp URL:', moveError);
              // Keep the temp URL if moving fails
            }
          }
        } catch (imageError) {
          console.warn('Image upload failed, updating news without image:', imageError);
          uploadedImageUrl = null;
        }
      }
      
      const updateData = {
        ...updates,
        ...(uploadedImageUrl !== undefined && { imageUrl: uploadedImageUrl }),
        updatedAt: serverTimestamp(),
        // If publishedAt is being updated, use server timestamp
        ...(updates.publishedAt && { publishedAt: serverTimestamp() }),
      };

      await updateDoc(doc(this.collection, id), updateData);
    } catch (error) {
      console.error('Error updating news:', error);
      throw new Error('Failed to update news item');
    }
  }

  async deleteNews(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collection, id));
    } catch (error) {
      console.error('Error deleting news:', error);
      throw new Error('Failed to delete news item');
    }
  }

  async togglePublishStatus(id: string, currentStatus: boolean): Promise<void> {
    try {
      await updateDoc(doc(this.collection, id), {
        isPublished: !currentStatus,
        updatedAt: serverTimestamp(),
        // Set publishedAt when publishing for the first time
        ...(currentStatus === false && { publishedAt: serverTimestamp() }),
      });

      if (!currentStatus) {
        const newsItem = await this.getNewsById(id);
        if (newsItem) {
          const users = await this.getAllActiveUsers();
          const userIds = users.map(u => u.id);
          
          notificationHelpers.notifyNewNews(
            userIds,
            newsItem.title,
            id,
            newsItem.imageUrl || undefined
          ).catch(err => console.error('Failed to send news notifications:', err));
        }
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
      throw new Error('Failed to update publish status');
    }
  }

  private async getAllActiveUsers(): Promise<User[]> {
    try {
      const usersQuery = query(
        collection(this.db, 'users'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(usersQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          memberSince: data.memberSince?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as User;
      });
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  private convertDocToNewsItem(doc: any): NewsItem {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      category: data.category,
      publishedBy: data.publishedBy,
      publishedAt: data.publishedAt.toDate(),
      isPublished: data.isPublished,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}

// Singleton instance
export const newsService = new NewsService();

// Helper function to get news service (for consistency with messageService)
export const getNewsService = () => newsService;
