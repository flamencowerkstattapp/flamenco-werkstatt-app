# Antonio Dias Flamenco Werkstatt

> A production-ready Progressive Web App (PWA) for the Flamenco Werkstatt dance studio in Berlin, Germany.

[![Deployed on Netlify](https://img.shields.io/badge/Deployed-Netlify-00C7B7?logo=netlify)](https://netlify.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?logo=firebase)](https://firebase.google.com)

## ✨ Features

### 🌍 Multi-Platform Support
- **Progressive Web App (PWA)**: Installable on Android, iOS, and Desktop
- **Multi-language**: German (default), English, and Spanish
- **Responsive Design**: Optimized for mobile, tablet, and desktop

### 📅 Studio Management
- **Dual Studio Calendar**: Separate booking systems for Studio Big (1) and Studio Small (2)
- **Member Booking**: Book, cancel (24hr notice), and manage practice sessions
- **Admin Authorization**: All bookings require admin approval
- **German School Holidays**: Automatic class cancellation during holidays

### 💬 Communication
- **Messaging System**: Member-to-member, instructor, and bulk messaging
- **News Feed**: Studio announcements and updates
- **Push Notifications**: Real-time notifications via Firebase Cloud Messaging

### 🎉 Events
- **Special Events**: Spain trips and off-site event management
- **Event Registration**: Members can register and manage event attendance

## Studio Information

**Location**: Frankfurter Allee 110, 10247 Berlin, Germany  
**Owner**: Antonio Dias  
**Contact**: mail@antoniodias.de | +49 177 7855744  
**Website**: https://www.flamenco-werkstatt.de/

## Booking Hours

- **Monday - Friday**: 16:00 - 22:00
- **Saturday - Sunday**: 08:00 - 22:00

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project with credentials

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd flamenco-werkstatt-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase credentials

# Start development server
npm start
```

### Development

```bash
# Run on web (PWA development)
npm run web

# Run on Android (requires Android Studio)
npm run android

# Run on iOS (requires Xcode, macOS only)
npm run ios
```

### Production Build

```bash
# Build for web/PWA deployment
npm run build:web

# Serve production build locally
npm run serve:web
```

The build process automatically:
- Exports the Expo web app to `/dist`
- Injects environment variables
- Copies all PWA icons and manifest
- Optimizes for production

## 🛠️ Technology Stack

### Frontend
- **Framework**: React Native 0.73 with Expo 50
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **UI Components**: React Native Paper 5.11
- **Calendar**: React Native Calendars 1.1304
- **Icons**: Expo Vector Icons (Ionicons)
- **Internationalization**: i18n-js with Make Plural

### Backend
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **Storage**: Firebase Cloud Storage
- **Notifications**: Firebase Cloud Messaging
- **Admin SDK**: Firebase Admin (custom claims)

### PWA & Deployment
- **Build Tool**: Expo Metro Bundler
- **Deployment**: Netlify (Continuous Deployment)
- **Service Worker**: Custom PWA service worker
- **Manifest**: Web App Manifest with maskable icons

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

## 👨‍💼 Admin Features

The application includes a secure admin panel with:
- **Dashboard**: Real-time statistics and pending bookings
- **User Management**: Manage members, instructors, and roles
- **Booking Management**: Approve/reject booking requests
- **Calendar Management**: Create and manage classes and events
- **Messaging**: Send bulk messages to members
- **News Management**: Create and publish announcements
- **Event Management**: Manage special events and registrations
- **CSV Import**: Bulk import users from CSV files

## 📱 PWA Installation

### On Android
1. Visit the app URL in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. App installs like a native app

### On iOS
1. Visit the app URL in Safari
2. Tap Share → "Add to Home Screen"
3. App installs to home screen

### On Desktop
1. Visit the app URL in Chrome/Edge
2. Click install icon (⊕) in address bar
3. App installs as desktop application

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:
- **[PWA Setup Guide](docs/PWA_SETUP.md)**: PWA configuration and deployment
- **[Firebase Setup](docs/FIREBASE_SETUP.md)**: Firebase configuration and rules
- **[Netlify Deployment](docs/NETLIFY-DEPLOYMENT.md)**: Deployment instructions
- **[Features Guide](docs/FEATURES.md)**: Complete feature documentation
- **[Owner's Guide](OWNER_GUIDE.md)**: Comprehensive user manual for Antonio

## 🔐 Environment Variables

Required environment variables (see `.env.example`):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 🤝 Contributing

This is a private application for Antonio Dias Flamenco Werkstatt. For issues or feature requests, contact the development team.

## 📄 License

MIT License - Antonio Dias Flamenco Werkstatt © 2026

---

**Live App**: [Visit the PWA](https://your-netlify-url.netlify.app)  
**Contact**: mail@antoniodias.de | +49 177 7855744  
**Website**: https://www.flamenco-werkstatt.de/
