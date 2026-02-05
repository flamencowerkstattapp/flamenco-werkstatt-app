# Firebase Setup for Flamenco Werkstatt App

## Required Firebase Collections

### 1. Users Collection
```javascript
// Collection: users (Already exists - keep current structure)
{
  id: string (Firebase Auth UID),
  email: string,
  firstName: string,
  lastName: string,
  role: 'admin' | 'member',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isActive: boolean,
  memberSince: Timestamp,
  phone: string,
  preferredLanguage: string
}
```

**Firebase Console Entry Guide - Users Collection:**
| Field Name | Type | Value (Third Box) |
|------------|------|------------------|
| id | string | "[Firebase Auth UID]" |
| email | string | "user@example.com" |
| firstName | string | "John" |
| lastName | string | "Doe" |
| role | string | "member" |
| createdAt | timestamp | Server timestamp |
| updatedAt | timestamp | Server timestamp |
| isActive | boolean | true |
| memberSince | timestamp | Server timestamp |
| phone | string | "+1234567890" |
| preferredLanguage | string | "en" |

### 2. Events Collection
```javascript
// Collection: events
{
  title: string,
  studioId: 'studio-1-big' | 'studio-2-small' | 'offsite',
  eventType: 'class' | 'workshop' | 'performance',
  startTime: Timestamp,
  endTime: Timestamp,
  instructorId: string,
  instructorName: string,
  classLevel?: string,
  classType?: string,
  description?: string,
  maxParticipants?: number,
  currentParticipants: number,
  isRecurring: boolean,
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly',
    endDate: Timestamp
  },
  isCancelled: boolean,
  createdBy: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // Image fields
  imageUrl?: string, // For external URLs
  imageStoragePath?: string, // For Firebase Storage uploads
  imageFileName?: string, // Original filename
  imageUploadedBy?: string, // User who uploaded
  imageUploadedAt?: Timestamp // Upload timestamp
}
```

**Firebase Console Entry Guide - Events Collection:**
| Field Name | Type | Value (Third Box) |
|------------|------|------------------|
| title | string | "Flamenco Intermediate Class" |
| studioId | string | "studio-1-big" |
| eventType | string | "class" |
| startTime | timestamp | [Select date/time] |
| endTime | timestamp | [Select date/time] |
| instructorId | string | "demo-admin-1" |
| instructorName | string | "Antonio Dias" |
| classLevel | string | "Intermediate 1" |
| classType | string | "Technique 1" |
| description | string | "Flamenco technique class" |
| maxParticipants | number | 15 |
| currentParticipants | number | 0 |
| isRecurring | boolean | false |
| recurringPattern | map | [See below] |
| isCancelled | boolean | false |
| createdBy | string | "demo-admin-1" |
| createdAt | timestamp | Server timestamp |
| updatedAt | timestamp | Server timestamp |
| imageUrl | string | "https://example.com/image.jpg" |
| imageStoragePath | string | "events/images/event1.jpg" |
| imageFileName | string | "flamenco-class.jpg" |
| imageUploadedBy | string | "demo-admin-1" |
| imageUploadedAt | timestamp | Server timestamp |

**For recurringPattern Map (if isRecurring = true):**
| Sub-field Name | Type | Value (Third Box) |
|---------------|------|------------------|
| frequency | string | "weekly" |
| endDate | timestamp | [Select end date] |

### 3. Bookings Collection
```javascript
// Collection: bookings
{
  userId: string,
  userName: string,
  studioId: 'studio-1-big' | 'studio-2-small' | 'offsite',
  startTime: Timestamp,
  endTime: Timestamp,
  status: 'pending' | 'approved' | 'rejected' | 'cancelled',
  purpose: string,
  notes?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  reviewedBy?: string,
  reviewedAt?: Timestamp
}
```

**Firebase Console Entry Guide - Bookings Collection:**
| Field Name | Type | Value (Third Box) |
|------------|------|------------------|
| userId | string | "[User UID]" |
| userName | string | "John Doe" |
| studioId | string | "studio-1-big" |
| startTime | timestamp | [Select date/time] |
| endTime | timestamp | [Select date/time] |
| status | string | "pending" |
| purpose | string | "Private practice session" |
| notes | string | "Notes about booking" |
| createdAt | timestamp | Server timestamp |
| updatedAt | timestamp | Server timestamp |
| reviewedBy | string | "[Admin UID]" |
| reviewedAt | timestamp | Server timestamp |

### 4. Messages Collection
```javascript
// Collection: messages
{
  senderId: string,
  senderName: string,
  recipientId: string,
  recipientName: string,
  subject: string,
  content: string,
  isRead: boolean,
  replyTo?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Firebase Console Entry Guide - Messages Collection:**
| Field Name | Type | Value (Third Box) |
|------------|------|------------------|
| senderId | string | "[Sender UID]" |
| senderName | string | "John Doe" |
| recipientId | string | "[Recipient UID]" |
| recipientName | string | "Jane Smith" |
| subject | string | "Class Inquiry" |
| content | string | "Message content here" |
| isRead | boolean | false |
| replyTo | string | "[Original message ID]" |
| createdAt | timestamp | Server timestamp |
| updatedAt | timestamp | Server timestamp |

### 5. News Collection
```javascript
// Collection: news
{
  title: string,
  content: string,
  authorId: string,
  authorName: string,
  imageUrl?: string, // For external URLs
  imageStoragePath?: string, // For Firebase Storage uploads
  imageFileName?: string, // Original filename
  imageUploadedBy?: string, // User who uploaded
  imageUploadedAt?: Timestamp, // Upload timestamp
  isPublished: boolean,
  publishedAt?: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  tags?: string[]
}
```

**Firebase Console Entry Guide - News Collection:**
| Field Name | Type | Value (Third Box) |
|------------|------|------------------|
| title | string | "Studio News Update" |
| content | string | "News content here" |
| authorId | string | "[Author UID]" |
| authorName | string | "Antonio Dias" |
| imageUrl | string | "https://example.com/image.jpg" |
| imageStoragePath | string | "news/images/news1.jpg" |
| imageFileName | string | "studio-news.jpg" |
| imageUploadedBy | string | "demo-admin-1" |
| imageUploadedAt | timestamp | Server timestamp |
| isPublished | boolean | true |
| publishedAt | timestamp | Server timestamp |
| createdAt | timestamp | Server timestamp |
| updatedAt | timestamp | Server timestamp |
| tags | array | ["flamenco", "workshop", "performance"] |

## Firebase Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        resource.data.role in ['admin', 'member'];
    }
    
    // Admins can manage all events, members can read events
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.role == 'admin' || 
         resource.data.createdBy == request.auth.uid);
    }
    
    // Users can manage their own bookings, admins can manage all
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.role == 'admin');
      allow write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.role == 'admin');
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Messages between users
    match /messages/{messageId} {
      allow read: if request.auth != null && 
        (resource.data.senderId == request.auth.uid || 
         resource.data.recipientId == request.auth.uid);
      allow create: if request.auth != null && 
        (request.auth.uid == resource.data.senderId || 
         request.auth.uid == resource.data.recipientId);
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.recipientId;
    }
    
    // News - admins manage, members read published
    match /news/{newsId} {
      allow read: if request.auth != null && 
        (resource.data.isPublished == true || 
         request.auth.token.role == 'admin');
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
```

**Note:** The security rules use `request.auth.uid` (Firebase Auth UID) which matches your `id` field in the users collection. This is the standard Firebase approach where:
- `request.auth.uid` = Firebase Authentication UID
- Your `id` field in users collection = Firebase Authentication UID
- These will match automatically when users are authenticated

## Firebase Storage Setup

### Storage Buckets Structure
```
/
├── events/
│   └── images/
│       ├── event1.jpg
│       ├── event2.png
│       └── ...
├── news/
│   └── images/
│       ├── news1.jpg
│       ├── news2.png
│       └── ...
└── temp/
    └── uploads/
```

### Storage Security Rules
```javascript
service firebase.storage {
  match /b/{bucket}/o {
    // Events images - admins can upload, everyone can read
    match /events/images/{eventId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
      allow delete: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // News images - admins can upload, everyone can read
    match /news/images/{newsId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
      allow delete: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Temp uploads - authenticated users can upload
    match /temp/uploads/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your Firebase project details:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

## Firebase Console Setup

1. Enable Authentication with Email/Password
2. Create Firestore Database
3. Set up Security Rules (above)
4. Create Storage bucket (for images)
5. Enable Cloud Functions (if needed for notifications)

## Initial Admin User

Create the first admin user manually in Firebase Console:
- Set role to 'admin' in the users collection
- This user can then manage other users and system settings
