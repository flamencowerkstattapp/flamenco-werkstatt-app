export const DEMO_MODE = false;

export const DEMO_USER = {
  id: 'demo-user-1',
  email: 'demo@flamenco-werkstatt.de',
  firstName: 'Demo',
  lastName: 'User',
  role: 'member' as const,
  phone: '+49 177 1234567',
  memberSince: new Date('2024-01-01'),
  isActive: true,
  preferredLanguage: 'de' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const DEMO_ADMIN = {
  id: 'demo-admin-1',
  email: 'admin@flamenco-werkstatt.de',
  firstName: 'Antonio',
  lastName: 'Dias',
  role: 'admin' as const,
  phone: '+49 177 7855744',
  memberSince: new Date('2020-01-01'),
  isActive: true,
  preferredLanguage: 'de' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};
