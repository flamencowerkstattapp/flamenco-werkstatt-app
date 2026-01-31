import { collection, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import { getFirestoreDB } from './firebase';
import { CSVRow } from '../utils/csvParser';
import { User } from '../types';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
  details: ImportDetail[];
}

export interface ImportDetail {
  row: number;
  email: string;
  status: 'imported' | 'updated' | 'skipped' | 'failed';
  message: string;
}

/**
 * Import users from CSV data into Firestore
 */
export const importUsersFromCSV = async (
  csvData: CSVRow[],
  adminUserId: string
): Promise<ImportResult> => {
  const db = getFirestoreDB();
  const result: ImportResult = {
    success: false,
    totalRows: csvData.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    details: [],
  };

  try {
    // Check for existing users by email
    const existingEmails = await getExistingUserEmails(csvData.map(row => row.email));
    
    // Process in batches (Firestore limit is 500 operations per batch)
    const batchSize = 500;
    const batches = Math.ceil(csvData.length / batchSize);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batch = writeBatch(db);
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, csvData.length);
      const batchData = csvData.slice(startIdx, endIdx);

      for (let i = 0; i < batchData.length; i++) {
        const rowIndex = startIdx + i + 1; // +1 for header row
        const csvRow = batchData[i];

        try {
          // Check if user already exists
          if (existingEmails.has(csvRow.email.toLowerCase())) {
            result.skipped++;
            result.details.push({
              row: rowIndex,
              email: csvRow.email,
              status: 'skipped',
              message: 'Email already exists',
            });
            continue;
          }

          // Create new user document
          const userRef = doc(collection(db, 'users'));
          const now = new Date();

          const userData: Partial<User> = {
            id: userRef.id,
            email: csvRow.email.toLowerCase().trim(),
            firstName: csvRow.firstName.trim(),
            lastName: csvRow.lastName.trim(),
            role: csvRow.role || 'member',
            phone: csvRow.phone || undefined,
            memberSince: now,
            isActive: true,
            preferredLanguage: csvRow.preferredLanguage || 'de',
            membershipType: csvRow.membershipType || undefined,
            emergencyContact: csvRow.emergencyContact || undefined,
            emergencyPhone: csvRow.emergencyPhone || undefined,
            danceLevel: csvRow.danceLevel || undefined,
            preferredStyles: csvRow.preferredStyles || undefined,
            createdAt: now,
            updatedAt: now,
          };

          batch.set(userRef, userData);
          result.imported++;
          result.details.push({
            row: rowIndex,
            email: csvRow.email,
            status: 'imported',
            message: 'Successfully imported',
          });

        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Row ${rowIndex} (${csvRow.email}): ${errorMessage}`);
          result.details.push({
            row: rowIndex,
            email: csvRow.email,
            status: 'failed',
            message: errorMessage,
          });
        }
      }

      // Commit batch
      await batch.commit();
    }

    result.success = result.failed === 0;
    return result;

  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Get set of existing user emails from Firestore
 */
const getExistingUserEmails = async (emails: string[]): Promise<Set<string>> => {
  const db = getFirestoreDB();
  const existingEmails = new Set<string>();

  try {
    // Firestore 'in' queries are limited to 10 items, so we need to batch
    const batchSize = 10;
    const batches = Math.ceil(emails.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchEmails = emails.slice(i * batchSize, (i + 1) * batchSize);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', 'in', batchEmails.map(e => e.toLowerCase())));
      const snapshot = await getDocs(q);
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.email) {
          existingEmails.add(userData.email.toLowerCase());
        }
      });
    }

    return existingEmails;
  } catch (error) {
    console.error('Error checking existing emails:', error);
    return existingEmails;
  }
};

/**
 * Download CSV template file
 */
export const downloadCSVTemplate = () => {
  const headers = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'membershipType',
    'role',
    'danceLevel',
    'emergencyContact',
    'emergencyPhone',
    'preferredStyles',
    'preferredLanguage'
  ];

  const exampleRows = [
    [
      'John',
      'Doe',
      'john.doe@example.com',
      '+49123456789',
      '2-classes',
      'member',
      'intermediate',
      'Jane Doe',
      '+49987654321',
      'Flamenco',
      'en'
    ],
    [
      'Maria',
      'Garcia',
      'maria.garcia@example.com',
      '+34612345678',
      'all-you-can-dance',
      'member',
      'advanced',
      'Carlos Garcia',
      '+34698765432',
      'Flamenco,Sevillanas',
      'es'
    ],
  ];

  const csvContent = [
    headers.join(','),
    ...exampleRows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'members_import_template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
