export type UserRole = 'admin' | 'instructor' | 'member';

export type StudioType = 'studio-1-big' | 'studio-2-small' | 'offsite';

export type ClassLevel = 
  | 'Beginner 1'
  | 'Beginner 2'
  | 'Intermediate 1'
  | 'Intermediate 2'
  | 'Intermediate 3'
  | 'Advanced 1'
  | 'Advanced 2';

export type ClassType = 
  | 'Children'
  | 'Teenager'
  | 'Manton'
  | 'Kastanets'
  | 'Technique 1'
  | 'Technique 2'
  | 'Oriental 1'
  | 'Oriental 2'
  | 'Modern';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type EventType = 'class' | 'booking' | 'special-event' | 'holiday';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isInstructor: boolean;
  phone?: string;
  memberSince: Date;
  isActive: boolean;
  preferredLanguage: 'de' | 'en' | 'es';
  membershipType?: '1-class' | '2-classes' | '3-classes' | 'all-you-can-dance';
  emergencyContact?: string;
  emergencyPhone?: string;
  danceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  preferredStyles?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  studioId: StudioType;
  eventType: EventType;
  startTime: Date;
  endTime: Date;
  instructorId?: string;
  instructorName?: string;
  classLevel?: ClassLevel;
  classType?: ClassType;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  isCancelled: boolean;
  cancellationReason?: string;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  endDate?: Date;
}

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  studioId: StudioType;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  purpose?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurringEndDate?: Date;
  recurringGroupId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientIds: string[];
  recipientType: 'individual' | 'group' | 'all-members' | 'all-instructors';
  subject: string;
  body: string;
  // Legacy fields (kept for backward compatibility)
  isRead: { [userId: string]: boolean };
  // Enhanced tracking fields
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveryTracking: { [userId: string]: DeliveryStatus };
  readStatus: { [userId: string]: ReadStatus };
  readTracking: { [userId: string]: ReadTracking };
  lastReplyId?: string; // Track if this message has been replied to
  replyChain?: string[]; // Array of message IDs in the reply chain
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryStatus {
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveredAt?: Date;
  failedReason?: string;
  retryCount?: number;
}

export interface ReadStatus {
  status: 'unread' | 'read' | 'replied';
  readAt?: Date;
  repliedAt?: Date;
  replyId?: string;
}

export interface ReadTracking {
  isRead: boolean;
  readAt?: Date;
  readDuration?: number; // Time spent reading in seconds
  lastAccessedAt?: Date;
  accessCount: number;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  category: 'announcement' | 'update' | 'info';
  publishedBy: string;
  publishedAt: Date;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpecialEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  isOffsite: boolean;
  country?: string;
  startDate: Date;
  endDate: Date;
  dailyStartTime?: string; // Format: "HH:MM" (e.g., "09:00") - daily schedule start time for multi-day events
  dailyEndTime?: string; // Format: "HH:MM" (e.g., "17:00") - daily schedule end time for multi-day events
  imageUrl?: string;
  registrationDeadline?: Date;
  maxParticipants?: number;
  currentParticipants: number;
  price?: number;
  isPublished: boolean;
  createdBy: string; // User name (e.g., "John Doe") not user ID
  createdAt: Date;
  updatedAt: Date;
}

export interface GermanSchoolHoliday {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  year: number;
  state: 'Berlin';
}

export type NotificationType = 'message' | 'news' | 'event' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId?: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  enablePushNotifications: boolean;
  enableMessageNotifications: boolean;
  enableNewsNotifications: boolean;
  enableEventNotifications: boolean;
  enableSystemNotifications: boolean;
  fcmToken?: string;
  updatedAt: Date;
}

export type PaymentMethod = 'cash' | 'bank';
export type PaymentType = 'weekly-class' | 'special-class';
export type SpecialClassType = 'technique' | 'special-event';

export interface Payment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  date: Date;
  month: string;
  membershipType?: string;
  specialClassType?: SpecialClassType;
  classId?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: Date;
  updatedAt: Date;
}
