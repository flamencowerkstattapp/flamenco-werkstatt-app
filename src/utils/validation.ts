export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

export const validateBookingTime = (startTime: Date, endTime: Date): { valid: boolean; message?: string } => {
  if (startTime >= endTime) {
    return { valid: false, message: 'End time must be after start time' };
  }
  
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  if (duration < 30) {
    return { valid: false, message: 'Booking must be at least 30 minutes' };
  }
  
  if (duration > 240) {
    return { valid: false, message: 'Booking cannot exceed 4 hours' };
  }
  
  return { valid: true };
};

export const validateRequiredField = (value: string, fieldName: string): { valid: boolean; message?: string } => {
  if (!value || value.trim() === '') {
    return { valid: false, message: `${fieldName} is required` };
  }
  return { valid: true };
};
