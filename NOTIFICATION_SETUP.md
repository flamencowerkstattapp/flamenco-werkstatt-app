# Notification System Setup Guide

This guide explains how to set up and use the comprehensive notification system for the Flamenco Werkstatt PWA app.

## Overview

The notification system provides:
- **Browser Push Notifications** (FCM) - Works on both mobile and desktop browsers
- **In-App Notifications** - Real-time notification center with badges
- **Automatic Triggers** - Notifications sent when messages, news, or events are created/published
- **User Preferences** - Customizable notification settings per user

## Architecture

### Components Created

1. **Services**
   - `src/services/notificationService.ts` - Core FCM and notification management
   - `src/utils/notificationHelpers.ts` - Helper functions for creating notifications

2. **Context & Hooks**
   - `src/contexts/NotificationContext.tsx` - Global notification state
   - Integrated with existing `AuthContext`

3. **UI Components**
   - `src/components/NotificationBadge.tsx` - Badge counter component
   - `src/components/NotificationCenter.tsx` - Full notification modal UI
   - Updated `src/components/AppHeader.tsx` - Added notification bell button

4. **Service Worker**
   - `public/firebase-messaging-sw.js` - Background notification handler

5. **Types**
   - Added `AppNotification` and `NotificationPreferences` to `src/types/index.ts`

## Firebase Setup

### Step 1: Enable Cloud Messaging

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** > **Cloud Messaging**
4. Under **Web Push certificates**, click **Generate key pair**
5. Copy the VAPID key (starts with `B...`)

### Step 2: Update Environment Variables

Add the VAPID key to your `.env` file:

```bash
EXPO_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### Step 3: Configure Firestore Security Rules

Add these rules to `firestore.rules`:

```javascript
// Notifications collection
match /notifications/{notificationId} {
  // Users can read their own notifications
  allow read: if request.auth != null && 
              resource.data.userId == request.auth.uid;
  
  // Only authenticated users can create notifications
  allow create: if request.auth != null;
  
  // Users can update/delete their own notifications
  allow update, delete: if request.auth != null && 
                          resource.data.userId == request.auth.uid;
}

// Notification preferences collection
match /notificationPreferences/{userId} {
  // Users can read/write their own preferences
  allow read, write: if request.auth != null && 
                       userId == request.auth.uid;
}
```

### Step 4: Create Firestore Indexes

The notification system uses these queries that may require indexes:

```javascript
// notifications collection
- userId (Ascending) + createdAt (Descending)
- userId (Ascending) + isRead (Ascending)

// Run these commands or create via Firebase Console:
```

Go to **Firestore Database** > **Indexes** and create:

1. **Collection**: `notifications`
   - Field: `userId` (Ascending)
   - Field: `createdAt` (Descending)

2. **Collection**: `notifications`
   - Field: `userId` (Ascending)
   - Field: `isRead` (Ascending)

## Deployment Setup

### For Web Deployment

1. **Service Worker Registration**
   
   The service worker is automatically registered when the app loads. Ensure `public/firebase-messaging-sw.js` is accessible at the root of your deployed site.

2. **HTTPS Requirement**
   
   Push notifications require HTTPS. Your PWA must be served over HTTPS (or localhost for development).

3. **Browser Compatibility**
   
   - ✅ Chrome/Edge (Desktop & Mobile)
   - ✅ Firefox (Desktop & Mobile)
   - ✅ Safari 16.4+ (Desktop & Mobile)
   - ❌ Safari < 16.4

## Usage

### For Users

1. **Enable Notifications**
   - Click the notification bell icon in the header
   - Browser will prompt for notification permission
   - Click "Allow" to receive push notifications

2. **View Notifications**
   - Click the bell icon to open Notification Center
   - Badge shows unread count
   - Tap any notification to navigate to related content

3. **Manage Notifications**
   - Mark individual notifications as read
   - Mark all as read
   - Delete individual or all notifications
   - Filter by "All" or "Unread"

### For Developers

#### Triggering Notifications Manually

```typescript
import { notificationHelpers } from '../utils/notificationHelpers';

// Send message notification
await notificationHelpers.notifyNewMessage(
  recipientIds: string[],
  senderName: string,
  subject: string,
  messageId: string
);

// Send news notification
await notificationHelpers.notifyNewNews(
  userIds: string[],
  newsTitle: string,
  newsId: string,
  imageUrl?: string
);

// Send event notification
await notificationHelpers.notifyNewEvent(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  imageUrl?: string
);

// Send system notification
await notificationHelpers.notifySystemMessage(
  userId: string,
  title: string,
  message: string
);
```

#### Accessing Notification Context

```typescript
import { useNotifications } from '../contexts/NotificationContext';

function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestNotificationPermission,
  } = useNotifications();

  // Use notification data and methods
}
```

## Automatic Notification Triggers

Notifications are automatically sent when:

1. **New Message** - When a message is sent to recipients
2. **News Published** - When admin publishes a news item (sent to all active users)
3. **Event Published** - When admin publishes an event (sent to all active users)

## Testing

### Local Testing

1. Start the development server:
   ```bash
   npm run web
   ```

2. Open browser console to see notification logs

3. Test notification flow:
   - Send a message to yourself
   - Publish a news item (as admin)
   - Publish an event (as admin)
   - Check notification bell for updates

### Production Testing

1. Deploy to your hosting service (Netlify, Vercel, etc.)
2. Ensure HTTPS is enabled
3. Test on multiple devices:
   - Desktop browser
   - Mobile browser (Chrome, Safari)
4. Test with app closed (background notifications)

## Troubleshooting

### Notifications Not Appearing

1. **Check Browser Permission**
   - Ensure notification permission is granted
   - Check browser settings: `chrome://settings/content/notifications`

2. **Check Service Worker**
   - Open DevTools > Application > Service Workers
   - Verify service worker is active
   - Check for errors in console

3. **Check Firebase Configuration**
   - Verify VAPID key is correct
   - Ensure Cloud Messaging is enabled in Firebase Console
   - Check Firestore rules allow notification writes

### Badge Not Updating

1. **Check Real-time Listener**
   - Open browser console
   - Look for "subscribeToUserNotifications" logs
   - Verify Firestore connection

2. **Check User Authentication**
   - Ensure user is logged in
   - Verify user ID is correct

### Background Notifications Not Working

1. **Service Worker Issues**
   - Clear browser cache
   - Unregister and re-register service worker
   - Check `firebase-messaging-sw.js` is accessible

2. **Browser Limitations**
   - Some browsers block notifications when battery is low
   - Private/Incognito mode may block notifications
   - Check browser-specific notification settings

## Performance Considerations

- Notifications are paginated (default: 50 most recent)
- Real-time listeners use Firestore snapshots (efficient)
- Badge counts are cached in context
- Old notifications can be bulk-deleted by users

## Security

- Users can only read their own notifications
- Notification creation requires authentication
- FCM tokens are stored securely in Firestore
- Service worker validates notification data

## Future Enhancements

Potential improvements:
- Email notifications for critical alerts
- Notification scheduling (event reminders)
- Rich notifications with images
- Notification sound preferences
- Push notification analytics
- Admin dashboard for notification management

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Firebase configuration
3. Review Firestore security rules
4. Test with different browsers/devices

---

**Last Updated**: February 2026
**Version**: 1.0.0
