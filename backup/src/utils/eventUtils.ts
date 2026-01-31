import { CalendarEvent, Booking, RecurringPattern } from '../types';

/**
 * Check if an event conflicts with existing events or bookings
 */
export const checkEventConflicts = (
  startTime: Date,
  endTime: Date,
  studioId: string,
  existingEvents: CalendarEvent[],
  existingBookings: Booking[],
  excludeEventId?: string
): { hasConflict: boolean; conflicts: string[] } => {
  const conflicts: string[] = [];

  // Check for conflicts with existing events
  existingEvents.forEach(event => {
    if (event.id === excludeEventId) return;
    
    if (event.studioId === studioId && 
        !event.isCancelled &&
        isTimeOverlap(startTime, endTime, event.startTime, event.endTime)) {
      conflicts.push(`Event: ${event.title}`);
    }
  });

  // Check for conflicts with approved bookings
  existingBookings.forEach(booking => {
    if (booking.id === excludeEventId) return;
    
    if (booking.studioId === studioId && 
        booking.status === 'approved' &&
        isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime)) {
      conflicts.push(`Booking: ${booking.userName}`);
    }
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
};

/**
 * Check if two time ranges overlap
 */
export const isTimeOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean => {
  return start1 < end2 && start2 < end1;
};

/**
 * Generate recurring event dates based on pattern
 */
export const generateRecurringDates = (
  startDate: Date,
  endDate: Date,
  pattern: RecurringPattern
): Date[] => {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
      // For weekly patterns with specific days
      if (pattern.daysOfWeek.includes(current.getDay())) {
        dates.push(new Date(current));
      }
    } else {
      // For daily/monthly patterns
      dates.push(new Date(current));
    }
    
    // Move to next occurrence
    switch (pattern.frequency) {
      case 'daily':
        current.setDate(current.getDate() + pattern.interval);
        break;
      case 'weekly':
        current.setDate(current.getDate() + (7 * pattern.interval));
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + pattern.interval);
        break;
    }
  }
  
  return dates;
};

/**
 * Check if a recurring event conflicts with existing events/bookings
 */
export const checkRecurringEventConflicts = (
  startDate: Date,
  endDate: Date,
  pattern: RecurringPattern,
  studioId: string,
  existingEvents: CalendarEvent[],
  existingBookings: Booking[],
  excludeEventId?: string
): { hasConflict: boolean; conflicts: { date: Date; conflicts: string[] }[] } => {
  const recurringDates = generateRecurringDates(startDate, endDate, pattern);
  const allConflicts: { date: Date; conflicts: string[] }[] = [];

  recurringDates.forEach(date => {
    const eventEndTime = new Date(date);
    eventEndTime.setHours(endDate.getHours());
    eventEndTime.setMinutes(endDate.getMinutes());
    
    const { conflicts } = checkEventConflicts(
      date,
      eventEndTime,
      studioId,
      existingEvents,
      existingBookings,
      excludeEventId
    );

    if (conflicts.length > 0) {
      allConflicts.push({
        date,
        conflicts
      });
    }
  });

  return {
    hasConflict: allConflicts.length > 0,
    conflicts: allConflicts
  };
};

/**
 * Validate event data before creation/update
 */
export const validateEventData = (data: {
  title: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  location: string;
  maxParticipants: string;
  price: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.title.trim()) {
    errors.push('Event title is required');
  }

  if (!data.description.trim()) {
    errors.push('Event description is required');
  }

  if (!data.startDate) {
    errors.push('Start date and time are required');
  }

  if (!data.endDate) {
    errors.push('End date and time are required');
  }

  if (data.startDate && data.endDate && data.startDate >= data.endDate) {
    errors.push('End date must be after start date');
  }

  if (!data.location.trim()) {
    errors.push('Location is required');
  }

  if (!data.maxParticipants || parseInt(data.maxParticipants) <= 0) {
    errors.push('Maximum participants must be greater than 0');
  }

  const price = data.price.trim() === '' ? 0 : parseFloat(data.price);
  if (isNaN(price) || price < 0) {
    errors.push('Price must be 0 or greater');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
