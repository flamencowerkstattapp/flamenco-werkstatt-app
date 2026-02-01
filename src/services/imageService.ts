import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';
import { storage } from './firebase';

export class ImageService {
  private storage = storage;

  private ensureStorage() {
    if (!this.storage) {
      throw new Error('Firebase Storage is not initialized. Please check your Firebase configuration.');
    }
  }

  async uploadImage(uri: string, fileName: string, userId?: string): Promise<string> {
    try {
      this.ensureStorage();
      
      // Convert blob URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Enforce 5MB maximum file size
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (blob.size > MAX_FILE_SIZE) {
        throw new Error(`Image size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed size of 5MB. Please choose a smaller image.`);
      }
      
      // Create a reference to the file in Firebase Storage using the correct path structure
      // Your rules expect: /temp/uploads/{userId}/{allPaths=**}
      const userPath = userId || `temp-${Date.now()}`;
      const tempPath = `temp/uploads/${userPath}/${fileName}`;
      const storageRef = ref(this.storage!, tempPath);
      
      // Upload the file
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      this.ensureStorage();
      
      // Extract the file path from the URL
      const url = new URL(imageUrl);
      const path = url.pathname.split('/o/')[1]?.split('?')[0];
      
      if (path) {
        // Decode the path (Firebase Storage URLs are URL encoded)
        const decodedPath = decodeURIComponent(path);
        const storageRef = ref(this.storage!, decodedPath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      // Don't throw error for deletion, just log it
    }
  }

  generateFileName(originalUri: string): string {
    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    // Use a simple extension since blob URLs don't have proper extensions
    return `news-${timestamp}-${randomString}.jpg`;
  }

  isBlobUrl(url: string): boolean {
    return url.startsWith('blob:');
  }

  async uploadImageIfBlob(imageUrl: string | undefined, userId?: string): Promise<string | undefined> {
    if (!imageUrl) return undefined;
    
    if (this.isBlobUrl(imageUrl)) {
      // This is a blob URL, need to upload it
      const fileName = this.generateFileName(imageUrl);
      return await this.uploadImage(imageUrl, fileName, userId);
    }
    
    // This is already a proper URL (Firebase Storage or external)
    return imageUrl;
  }

  async moveImageToNewsLocation(tempImageUrl: string, newsId: string): Promise<string> {
    try {
      this.ensureStorage();
      
      // Extract the filename from the temp URL
      const url = new URL(tempImageUrl);
      const path = url.pathname.split('/o/')[1]?.split('?')[0];
      
      if (!path) {
        throw new Error('Invalid temp image URL');
      }
      
      // Decode the path and extract filename
      const decodedPath = decodeURIComponent(path);
      const fileName = decodedPath.split('/').pop();
      
      if (!fileName) {
        throw new Error('Could not extract filename from temp URL');
      }
      
      // Download the temp file
      const tempRef = ref(this.storage!, decodedPath);
      const blob = await this.downloadImageAsBlob(tempRef);
      
      // Upload to the final news location
      const finalPath = `news/images/${newsId}/${fileName}`;
      const finalRef = ref(this.storage!, finalPath);
      await uploadBytes(finalRef, blob);
      
      // Get the final download URL
      const finalDownloadURL = await getDownloadURL(finalRef);
      
      // Delete the temp file
      await deleteObject(tempRef);
      
      return finalDownloadURL;
    } catch (error) {
      console.error('Error moving image to news location:', error);
      throw new Error('Failed to move image to news location');
    }
  }

  async moveImageToEventLocation(tempImageUrl: string, eventId: string): Promise<string> {
    try {
      this.ensureStorage();
      
      // Extract the filename from the temp URL
      const url = new URL(tempImageUrl);
      const path = url.pathname.split('/o/')[1]?.split('?')[0];
      
      if (!path) {
        throw new Error('Invalid temp image URL');
      }
      
      // Decode the path and extract filename
      const decodedPath = decodeURIComponent(path);
      const fileName = decodedPath.split('/').pop();
      
      if (!fileName) {
        throw new Error('Could not extract filename from temp URL');
      }
      
      // Download the temp file
      const tempRef = ref(this.storage!, decodedPath);
      const blob = await this.downloadImageAsBlob(tempRef);
      
      // Upload to the final event location
      const finalPath = `events/images/${eventId}/${fileName}`;
      const finalRef = ref(this.storage!, finalPath);
      await uploadBytes(finalRef, blob);
      
      // Get the final download URL
      const finalDownloadURL = await getDownloadURL(finalRef);
      
      // Delete the temp file
      await deleteObject(tempRef);
      
      return finalDownloadURL;
    } catch (error) {
      console.error('Error moving image to event location:', error);
      throw new Error('Failed to move image to event location');
    }
  }

  private async downloadImageAsBlob(storageRef: any): Promise<Blob> {
    // This is a helper method to download a file from Firebase Storage as a blob
    // In a real implementation, you might need to use getDownloadURL and fetch
    // For now, we'll use a simplified approach
    const downloadURL = await getDownloadURL(storageRef);
    const response = await fetch(downloadURL);
    return await response.blob();
  }
}

// Singleton instance
export const imageService = new ImageService();
