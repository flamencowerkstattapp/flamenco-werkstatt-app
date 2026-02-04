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
import { SpecialEvent, User } from '../types';
import { notificationHelpers } from '../utils/notificationHelpers';

export class EventsService {
  private db = getFirestoreDB();
  private collection = collection(this.db, 'specialEvents');

  async getAllEvents(): Promise<SpecialEvent[]> {
    try {
      const eventsQuery = query(
        this.collection,
        orderBy('startDate', 'asc')
      );

      const snapshot = await getDocs(eventsQuery);
      return snapshot.docs.map(this.convertDocToEvent);
    } catch (error) {
      console.error('Error fetching all events:', error);
      throw new Error('Failed to fetch events');
    }
  }

  async getPublishedEvents(): Promise<SpecialEvent[]> {
    try {
      const now = new Date();
      const eventsQuery = query(
        this.collection,
        where('isPublished', '==', true),
        where('endDate', '>=', now),
        orderBy('endDate', 'asc'),
        orderBy('startDate', 'asc')
      );

      const snapshot = await getDocs(eventsQuery);
      return snapshot.docs.map(this.convertDocToEvent);
    } catch (error) {
      console.error('Error fetching published events:', error);
      
      // Fallback: Get all events and filter client-side if index doesn't exist yet
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.log('Index not ready, using client-side filtering as fallback');
        try {
          const allEventsQuery = query(this.collection, orderBy('startDate', 'asc'));
          const snapshot = await getDocs(allEventsQuery);
          const allEvents = snapshot.docs.map(this.convertDocToEvent);
          const now = new Date();
          return allEvents.filter(event => 
            event.isPublished && event.endDate >= now
          );
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error('Failed to fetch published events');
        }
      }
      
      throw new Error('Failed to fetch published events');
    }
  }

  async getEventById(id: string): Promise<SpecialEvent | null> {
    try {
      const eventDoc = await getDoc(doc(this.db, 'specialEvents', id));
      
      if (!eventDoc.exists()) {
        return null;
      }

      return this.convertDocToEvent(eventDoc);
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw new Error('Failed to fetch event');
    }
  }

  async createEvent(eventData: Omit<SpecialEvent, 'id' | 'createdAt' | 'updatedAt'>, userUid?: string): Promise<string> {
    try {
      let tempImageUrl = eventData.imageUrl;
      
      // Step 1: Upload image to temp location if it's a blob URL
      if (eventData.imageUrl) {
        try {
          let userId = userUid || eventData.createdBy;
          
          if (!userId) {
            userId = `event-${Date.now()}`;
          }
          
          tempImageUrl = await imageService.uploadImageIfBlob(eventData.imageUrl, userId);
        } catch (imageError) {
          console.warn('Image upload failed, saving event without image:', imageError);
          tempImageUrl = undefined;
        }
      }
      
      // Step 2: Create event document with temp image URL (or undefined)
      const docData: any = {
        ...eventData,
        isPublished: eventData.isPublished ?? false,
        currentParticipants: eventData.currentParticipants || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only include imageUrl if it has a value (Firestore doesn't accept undefined)
      if (tempImageUrl) {
        docData.imageUrl = tempImageUrl;
      } else {
        delete docData.imageUrl;
      }

      const docRef = await addDoc(this.collection, docData);
      const eventId = docRef.id;
      
      // Step 3: Move image to final location if it was uploaded
      if (tempImageUrl && eventData.imageUrl && imageService.isBlobUrl(eventData.imageUrl)) {
        try {
          const finalImageUrl = await imageService.moveImageToEventLocation(tempImageUrl, eventId);
          await updateDoc(doc(this.collection, eventId), { imageUrl: finalImageUrl });
        } catch (moveError) {
          console.warn('Failed to move image to final location, keeping temp URL:', moveError);
        }
      }
      
      return eventId;
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  async updateEvent(id: string, updates: Partial<Omit<SpecialEvent, 'id' | 'createdAt'>>, userUid?: string): Promise<void> {
    try {
      let uploadedImageUrl = updates.imageUrl;
      
      // Try to upload image if it's a blob URL
      if (updates.imageUrl) {
        try {
          const userId = userUid || updates.createdBy || `event-${id}`;
          uploadedImageUrl = await imageService.uploadImageIfBlob(updates.imageUrl, userId);
          
          // If this is a new blob image, move it to the proper event location
          if (updates.imageUrl && imageService.isBlobUrl(updates.imageUrl) && uploadedImageUrl) {
            try {
              const finalImageUrl = await imageService.moveImageToEventLocation(uploadedImageUrl, id);
              uploadedImageUrl = finalImageUrl;
            } catch (moveError) {
              console.warn('Failed to move image to final location, keeping temp URL:', moveError);
            }
          }
        } catch (imageError) {
          console.warn('Image upload failed, updating event without image:', imageError);
          uploadedImageUrl = undefined;
        }
      }
      
      const updateData = {
        ...updates,
        ...(uploadedImageUrl !== undefined && { imageUrl: uploadedImageUrl }),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(this.db, 'specialEvents', id), updateData);
    } catch (error) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update event');
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      const eventRef = doc(this.collection, eventId);
      await deleteDoc(eventRef);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }

  async togglePublishStatus(id: string, currentStatus: boolean): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'specialEvents', id), {
        isPublished: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      if (!currentStatus) {
        const event = await this.getEventById(id);
        if (event) {
          const users = await this.getAllActiveUsers();
          const userIds = users.map(u => u.id);
          
          notificationHelpers.notifyNewEvent(
            userIds,
            event.title,
            id,
            event.imageUrl
          ).catch(err => console.error('Failed to send event notifications:', err));
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

  private convertDocToEvent(doc: any): SpecialEvent {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      location: data.location,
      isOffsite: data.isOffsite ?? false,
      country: data.country,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      dailyStartTime: data.dailyStartTime,
      dailyEndTime: data.dailyEndTime,
      imageUrl: data.imageUrl,
      registrationDeadline: data.registrationDeadline?.toDate(),
      maxParticipants: data.maxParticipants,
      currentParticipants: data.currentParticipants || 0,
      price: data.price,
      isPublished: data.isPublished ?? false,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
}

// Singleton instance
export const eventsService = new EventsService();

// Helper function to get events service
export const getEventsService = () => eventsService;
