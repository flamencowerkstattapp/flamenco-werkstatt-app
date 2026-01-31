# Antonio Dias Werkstatt App

A comprehensive cross-platform mobile and web application for the Flamenco Werkstatt dance studio in Berlin, Germany.

## Features

- **Multi-language Support**: German (default), English, and Spanish
- **Dual Studio Calendar System**: Separate booking systems for Studio Big (1) and Studio Small (2)
- **Member Booking Management**: Book, cancel (24hr notice), and manage studio practice sessions
- **Admin Authorization**: All bookings require admin approval
- **Messaging System**: Member-to-member, instructor, and bulk messaging capabilities
- **News & Updates**: Feed system for studio announcements
- **Special Events**: Spain and off-site event management
- **German School Holiday Integration**: Automatic class cancellation during holidays

## Studio Information

**Location**: Frankfurter Allee 110, 10247 Berlin, Germany  
**Owner**: Antonio Dias  
**Contact**: mail@antoniodias.de | +49 177 7855744  
**Website**: https://www.flamenco-werkstatt.de/

## Booking Hours

- **Monday - Friday**: 16:00 - 22:00
- **Saturday - Sunday**: 08:00 - 22:00

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **UI Components**: React Native Paper
- **Calendar**: React Native Calendars
- **Internationalization**: i18n-js

## Project Structure

```
/src
  /components     - Reusable UI components
  /screens        - Application screens
  /navigation     - Navigation configuration
  /services       - Firebase and API services
  /utils          - Utility functions
  /locales        - Translation files (DE, EN, ES)
  /types          - TypeScript type definitions
  /constants      - App constants and configuration
```

## Admin Access

The application includes a secure admin panel for Antonio Dias to manage:
- Member bookings approval/rejection
- Calendar events and classes
- Messaging system
- News and updates
- Special events

## License

MIT License - Antonio Dias Werkstatt © 2026
