export const STUDIOS = {
  BIG: {
    id: 'studio-1-big',
    name: 'Studio 1 (Big)',
    nameDE: 'Studio 1 (Groß)',
    nameES: 'Estudio 1 (Grande)',
    capacity: 20,
    color: '#D4AF37', // Gold
  },
  SMALL: {
    id: 'studio-2-small',
    name: 'Studio 2 (Small)',
    nameDE: 'Studio 2 (Klein)',
    nameES: 'Estudio 2 (Pequeño)',
    capacity: 12,
    color: '#C0C0C0', // Silver
  },
  OFFSITE: {
    id: 'offsite',
    name: 'Offsite Location',
    nameDE: 'Außenstandort',
    nameES: 'Ubicación Externa',
    capacity: 50,
    color: '#4169E1', // Royal Blue
  },
} as const;

export const CLASS_LEVELS = [
  'Beginner 1',
  'Beginner 2',
  'Intermediate 1',
  'Intermediate 2',
  'Intermediate 3',
  'Advanced 1',
  'Advanced 2',
] as const;

export const CLASS_TYPES = [
  'Children',
  'Teenager',
  'Manton',
  'Kastanets',
  'Technique 1',
  'Technique 2',
  'Oriental 1',
  'Oriental 2',
  'Modern',
] as const;

export const BOOKING_HOURS = {
  WEEKDAY: {
    start: 16,
    end: 22,
  },
  WEEKEND: {
    start: 8,
    end: 22,
  },
} as const;

export const BOOKING_RULES = {
  CANCELLATION_NOTICE_HOURS: 24,
  REQUIRE_ADMIN_APPROVAL: true,
} as const;
