import { User, UserRole } from '../types';

export interface CSVRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipType?: '1-class' | '2-classes' | '3-classes' | 'all-you-can-dance';
  noMembership?: boolean;
  role?: UserRole;
  danceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  emergencyContact?: string;
  emergencyPhone?: string;
  preferredStyles?: string;
  preferredLanguage?: 'de' | 'en' | 'es';
}

export interface ParseResult {
  success: boolean;
  data: CSVRow[];
  errors: string[];
  rowCount: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Parse CSV file content into structured data
 */
export const parseCSV = (csvContent: string): ParseResult => {
  const errors: string[] = [];
  const data: CSVRow[] = [];
  
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return {
        success: false,
        data: [],
        errors: ['CSV file is empty'],
        rowCount: 0,
      };
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate required headers
    const requiredHeaders = ['firstname', 'lastname', 'email'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return {
        success: false,
        data: [],
        errors: [`Missing required columns: ${missingHeaders.join(', ')}`],
        rowCount: 0,
      };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        row[header] = value;
      });

      // Map to CSVRow structure
      const csvRow: CSVRow = {
        firstName: row.firstname || row.firstName || '',
        lastName: row.lastname || row.lastName || '',
        email: row.email || '',
        phone: row.phone || undefined,
        membershipType: row.membershiptype || row.membershipType || undefined,
        noMembership: parseBoolean(row.nomembership || row.noMembership),
        role: (row.role || 'member') as UserRole,
        danceLevel: row.dancelevel || row.danceLevel || undefined,
        emergencyContact: row.emergencycontact || row.emergencyContact || undefined,
        emergencyPhone: row.emergencyphone || row.emergencyPhone || undefined,
        preferredStyles: row.preferredstyles || row.preferredStyles || undefined,
        preferredLanguage: (row.preferredlanguage || row.preferredLanguage || 'de') as 'de' | 'en' | 'es',
      };

      // Validate row
      const validation = validateCSVRow(csvRow, i + 1);
      if (!validation.valid) {
        errors.push(...validation.errors);
      } else {
        data.push(csvRow);
      }
    }

    return {
      success: errors.length === 0,
      data,
      errors,
      rowCount: data.length,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
      rowCount: 0,
    };
  }
};

/**
 * Validate a single CSV row
 */
export const validateCSVRow = (row: CSVRow, rowNumber: number): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!row.firstName || row.firstName.trim() === '') {
    errors.push(`Row ${rowNumber}: First name is required`);
  }
  if (!row.lastName || row.lastName.trim() === '') {
    errors.push(`Row ${rowNumber}: Last name is required`);
  }
  if (!row.email || row.email.trim() === '') {
    errors.push(`Row ${rowNumber}: Email is required`);
  }

  // Email format validation
  if (row.email && !isValidEmail(row.email)) {
    errors.push(`Row ${rowNumber}: Invalid email format: ${row.email}`);
  }

  // Phone format validation (if provided)
  if (row.phone && !isValidPhone(row.phone)) {
    errors.push(`Row ${rowNumber}: Invalid phone format: ${row.phone}`);
  }

  // Membership type validation
  if (row.membershipType && !['1-class', '2-classes', '3-classes', 'all-you-can-dance'].includes(row.membershipType)) {
    errors.push(`Row ${rowNumber}: Invalid membership type: ${row.membershipType}`);
  }

  // Role validation
  if (row.role && !['member', 'instructor', 'admin'].includes(row.role)) {
    errors.push(`Row ${rowNumber}: Invalid role: ${row.role}`);
  }

  // Dance level validation
  if (row.danceLevel && !['beginner', 'intermediate', 'advanced', 'professional'].includes(row.danceLevel)) {
    errors.push(`Row ${rowNumber}: Invalid dance level: ${row.danceLevel}`);
  }

  // Language validation
  if (row.preferredLanguage && !['de', 'en', 'es'].includes(row.preferredLanguage)) {
    errors.push(`Row ${rowNumber}: Invalid language: ${row.preferredLanguage}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format (basic validation)
 */
const isValidPhone = (phone: string): boolean => {
  // Allow various formats: +49123456789, 0123456789, etc.
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
};

/**
 * Parse boolean values from CSV (handles various formats)
 */
const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (!value || value.trim() === '') return undefined;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return undefined;
};

/**
 * Generate CSV template for download
 */
export const generateCSVTemplate = (): string => {
  const headers = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'membershipType',
    'noMembership',
    'role',
    'danceLevel',
    'emergencyContact',
    'emergencyPhone',
    'preferredStyles',
    'preferredLanguage'
  ];

  const exampleRow = [
    'John',
    'Doe',
    'john.doe@example.com',
    '+49123456789',
    '2-classes',
    'false',
    'member',
    'intermediate',
    'Jane Doe',
    '+49987654321',
    'Flamenco',
    'en'
  ];

  return `${headers.join(',')}\n${exampleRow.join(',')}`;
};
