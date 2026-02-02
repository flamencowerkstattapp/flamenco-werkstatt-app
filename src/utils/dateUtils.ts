import { getLocale } from '../locales';

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const isWithinBookingHours = (date: Date): boolean => {
  const hour = date.getHours();
  const weekend = isWeekend(date);
  
  if (weekend) {
    return hour >= 8 && hour < 22;
  } else {
    return hour >= 16 && hour < 22;
  }
};

export const formatDate = (date: Date, locale?: string): string => {
  const currentLocale = locale || getLocale() === 'de' ? 'de-DE' : getLocale() === 'es' ? 'es-ES' : 'en-GB';
  return new Intl.DateTimeFormat(currentLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const formatTime = (date: Date, locale?: string): string => {
  const currentLocale = locale || getLocale() === 'de' ? 'de-DE' : getLocale() === 'es' ? 'es-ES' : 'en-GB';
  return new Intl.DateTimeFormat(currentLocale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatDateTime = (date: Date, locale?: string): string => {
  const currentLocale = locale || getLocale() === 'de' ? 'de-DE' : getLocale() === 'es' ? 'es-ES' : 'en-GB';
  return new Intl.DateTimeFormat(currentLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const addHours = (date: Date, hours: number): Date => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
};

export const isWithinCancellationWindow = (bookingDate: Date): boolean => {
  const now = new Date();
  const hoursDifference = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursDifference >= 24;
};

export const hasTimeConflict = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean => {
  return start1 < end2 && end1 > start2;
};

export const getBerlinSchoolHolidays = (year: number) => {
  // Berlin school holidays for 2025-2026
  // Note: JavaScript months are 0-indexed (0 = January, 11 = December)
  
  if (year === 2025) {
    return [
      {
        name: 'Winterferien',
        startDate: new Date(2025, 1, 3), // Feb 3, 2025
        endDate: new Date(2025, 1, 8), // Feb 8, 2025
      },
      {
        name: 'Osterferien',
        startDate: new Date(2025, 3, 14), // Apr 14, 2025
        endDate: new Date(2025, 3, 26), // Apr 26, 2025
      },
      {
        name: 'Pfingstferien',
        startDate: new Date(2025, 4, 30), // May 30, 2025
        endDate: new Date(2025, 5, 3), // Jun 3, 2025
      },
      {
        name: 'Sommerferien',
        startDate: new Date(2025, 6, 10), // Jul 10, 2025
        endDate: new Date(2025, 7, 22), // Aug 22, 2025
      },
      {
        name: 'Herbstferien',
        startDate: new Date(2025, 9, 20), // Oct 20, 2025
        endDate: new Date(2025, 10, 1), // Nov 1, 2025
      },
      {
        name: 'Weihnachtsferien',
        startDate: new Date(2025, 11, 22), // Dec 22, 2025
        endDate: new Date(2026, 0, 2), // Jan 2, 2026
      },
    ];
  } else if (year === 2026) {
    return [
      {
        name: 'Winterferien',
        startDate: new Date(2026, 1, 2), // Feb 2, 2026
        endDate: new Date(2026, 1, 7), // Feb 7, 2026
      },
      {
        name: 'Osterferien',
        startDate: new Date(2026, 2, 30), // Mar 30, 2026
        endDate: new Date(2026, 3, 11), // Apr 11, 2026
      },
      {
        name: 'Pfingstferien',
        startDate: new Date(2026, 4, 15), // May 15, 2026
        endDate: new Date(2026, 4, 16), // May 16, 2026
      },
      {
        name: 'Sommerferien',
        startDate: new Date(2026, 6, 9), // Jul 9, 2026
        endDate: new Date(2026, 7, 21), // Aug 21, 2026
      },
      {
        name: 'Herbstferien',
        startDate: new Date(2026, 9, 12), // Oct 12, 2026
        endDate: new Date(2026, 9, 24), // Oct 24, 2026
      },
      {
        name: 'Weihnachtsferien',
        startDate: new Date(2026, 11, 21), // Dec 21, 2026
        endDate: new Date(2027, 0, 2), // Jan 2, 2027
      },
    ];
  } else {
    // Fallback for other years - approximate dates
    return [
      {
        name: 'Winterferien',
        startDate: new Date(year, 1, 1),
        endDate: new Date(year, 1, 14),
      },
      {
        name: 'Osterferien',
        startDate: new Date(year, 3, 1),
        endDate: new Date(year, 3, 14),
      },
      {
        name: 'Pfingstferien',
        startDate: new Date(year, 4, 20),
        endDate: new Date(year, 4, 23),
      },
      {
        name: 'Sommerferien',
        startDate: new Date(year, 6, 1),
        endDate: new Date(year, 7, 31),
      },
      {
        name: 'Herbstferien',
        startDate: new Date(year, 9, 15),
        endDate: new Date(year, 9, 28),
      },
      {
        name: 'Weihnachtsferien',
        startDate: new Date(year, 11, 22),
        endDate: new Date(year + 1, 0, 4),
      },
    ];
  }
};

export const isSchoolHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const holidays = getBerlinSchoolHolidays(year);
  
  return holidays.some(
    (holiday) => date >= holiday.startDate && date <= holiday.endDate
  );
};

export const getCurrentSchoolHoliday = (date: Date): { name: string; startDate: Date; endDate: Date } | null => {
  const year = date.getFullYear();
  const holidays = getBerlinSchoolHolidays(year);
  
  const currentHoliday = holidays.find(
    (holiday) => date >= holiday.startDate && date <= holiday.endDate
  );
  
  return currentHoliday || null;
};

export const parseTimeInput = (input: string): string | null => {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim().toLowerCase();
  
  // Handle AM/PM format (e.g., "5 pm", "5pm", "5:30 pm", "5:30pm")
  const ampmMatch = trimmed.match(/^(\d{1,2})(?:[:\.,;](\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const period = ampmMatch[3];
    
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return null;
    }
    
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Handle 24-hour format with various separators (e.g., "17:00", "17,00", "17.00", "17;00")
  const time24Match = trimmed.match(/^(\d{1,2})[:\.,;](\d{2})$/);
  if (time24Match) {
    const hours = parseInt(time24Match[1], 10);
    const minutes = parseInt(time24Match[2], 10);
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Handle hour only (e.g., "17", "5")
  const hourOnlyMatch = trimmed.match(/^(\d{1,2})$/);
  if (hourOnlyMatch) {
    const hours = parseInt(hourOnlyMatch[1], 10);
    
    if (hours < 0 || hours > 23) {
      return null;
    }
    
    return `${hours.toString().padStart(2, '0')}:00`;
  }
  
  return null;
};
