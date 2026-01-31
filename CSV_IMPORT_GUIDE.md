# CSV Member Import Guide

## Overview
The Admin Manage Users portal now supports bulk member import via CSV file upload. This feature allows Antonio to import up to 500 members at once seamlessly.

## Features
- ✅ **CSV File Upload** - Upload member data from CSV files
- ✅ **Template Download** - Download a pre-formatted CSV template
- ✅ **Data Validation** - Automatic validation of email, phone, and other fields
- ✅ **Duplicate Detection** - Skips existing members (by email)
- ✅ **Batch Processing** - Handles up to 500 members per import
- ✅ **Progress Tracking** - Real-time import progress and results
- ✅ **Error Reporting** - Detailed report of successes and failures

## How to Use

### Step 1: Download Template
1. Navigate to **Admin > Manage Users**
2. Click the **"CSV Template"** button in the header
3. A file named `members_import_template.csv` will download
4. Open the template in Excel or Google Sheets

### Step 2: Prepare Your Data
Fill in the CSV with member information. Required columns:
- **firstName** (required)
- **lastName** (required)
- **email** (required)

Optional columns:
- **phone** - Phone number (e.g., +49123456789)
- **membershipType** - Options: `1-class`, `2-classes`, `3-classes`, `all-you-can-dance`
- **role** - Options: `member`, `instructor`, `admin` (default: member)
- **danceLevel** - Options: `beginner`, `intermediate`, `advanced`, `professional`
- **emergencyContact** - Emergency contact name
- **emergencyPhone** - Emergency contact phone
- **preferredStyles** - Dance styles (e.g., "Flamenco, Sevillanas")
- **preferredLanguage** - Options: `de`, `en`, `es` (default: de)

### Step 3: Import CSV
1. Click the **"Import CSV"** button in the header
2. Select your prepared CSV file
3. Wait for the import to process
4. Review the import summary

### Step 4: Review Results
The import modal will show:
- **Total Rows** - Number of rows in CSV
- **Imported** - Successfully imported members (green)
- **Skipped** - Existing members (yellow)
- **Failed** - Rows with errors (red)
- **Error Details** - Specific error messages for failed rows

## CSV Format Example

```csv
firstName,lastName,email,phone,membershipType,role,danceLevel,emergencyContact,emergencyPhone,preferredStyles,preferredLanguage
John,Doe,john.doe@example.com,+49123456789,2-classes,member,intermediate,Jane Doe,+49987654321,Flamenco,en
Maria,Garcia,maria.garcia@example.com,+34612345678,all-you-can-dance,member,advanced,Carlos Garcia,+34698765432,"Flamenco,Sevillanas",es
```

## Important Notes

### Duplicate Handling
- Members are identified by **email address**
- If an email already exists in the database, that row will be **skipped**
- No duplicate members will be created

### Password Setup
- Imported members do NOT have passwords created automatically
- Members will need to use the "Forgot Password" flow on first login
- Alternatively, admin can manually set passwords via "Edit User"

### Data Validation
The system validates:
- ✅ Email format (must be valid email)
- ✅ Phone format (must contain 7+ digits)
- ✅ Membership type (must match allowed values)
- ✅ Role (must be member, instructor, or admin)
- ✅ Dance level (must match allowed values)
- ✅ Language (must be de, en, or es)

### Batch Limits
- Maximum **500 members per CSV file**
- For larger imports, split into multiple files
- Each import processes in a single Firestore batch

## Troubleshooting

### Import Fails
- Check CSV format matches template
- Ensure required columns (firstName, lastName, email) are present
- Verify email addresses are valid and unique

### Some Rows Skipped
- Check if emails already exist in database
- Review error messages in import summary

### Validation Errors
- Check that membership types match exactly: `1-class`, `2-classes`, `3-classes`, `all-you-can-dance`
- Verify roles are: `member`, `instructor`, or `admin`
- Ensure phone numbers contain at least 7 digits

## Technical Details

### Files Created
- `src/utils/csvParser.ts` - CSV parsing and validation
- `src/services/csvImportService.ts` - Import logic and Firestore writes
- Updated `src/screens/ManageUsersScreen.tsx` - UI components

### Database Structure
Members are stored in Firestore collection: `users`

Each member document includes:
- id, email, firstName, lastName
- role, phone, memberSince, isActive
- preferredLanguage, membershipType
- emergencyContact, emergencyPhone
- danceLevel, preferredStyles
- createdAt, updatedAt

## Support
For issues or questions, contact the development team.
