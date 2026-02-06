# Antonio Dias Flamenco Werkstatt - Feature Documentation

## Core Features

### 1. Multi-Language Support (German/English/Spanish)
- **Default Language**: German
- **Available Languages**: German (DE), English (EN), Spanish (ES)
- **Implementation**: i18n-js with complete translations for all UI elements
- **User Preference**: Language selection saved per user profile
- **Files**: `src/locales/de.ts`, `src/locales/en.ts`, `src/locales/es.ts`

### 2. Dual Studio Calendar System

#### Studio Big (1)
- **Capacity**: 20 people
- **Color Code**: Dark Red (#8B0000)
- **Independent booking system**

#### Studio Small (2)
- **Capacity**: 12 people
- **Color Code**: Crimson (#C41E3A)
- **Independent booking system**

#### Booking Rules
- **Weekday Hours**: Monday-Friday, 16:00-22:00
- **Weekend Hours**: Saturday-Sunday, 08:00-22:00
- **Minimum Duration**: 30 minutes
- **Maximum Duration**: 4 hours
- **Cancellation Notice**: 24 hours required
- **Admin Approval**: All bookings require admin authorization
- **Double Booking Prevention**: Automatic conflict detection

#### German School Holidays Integration
- Regular classes automatically cancelled during Berlin school holidays
- Individual studio bookings still allowed during holidays
- Holiday periods:
  - Winterferien (Winter Break)
  - Osterferien (Easter Break)
  - Pfingstferien (Pentecost Break)
  - Sommerferien (Summer Break)
  - Herbstferien (Autumn Break)
  - Weihnachtsferien (Christmas Break)

### 3. Class Management

#### Class Levels
- Beginner 1
- Beginner 2
- Intermediate 1
- Intermediate 2
- Intermediate 3
- Advanced 1
- Advanced 2

#### Class Types
- Children
- Teenager
- Manton (Shawl)
- Kastanets (Castanets)
- Technique 1
- Technique 2
- Oriental 1
- Oriental 2
- Modern

#### Event Types
- Regular Classes
- Studio Bookings
- Special Events
- School Holidays

### 4. User Roles & Permissions

#### Admin (Antonio Dias)
- Full system access
- Approve/reject all bookings
- Create and manage events
- Publish news and updates
- Manage special events
- View all statistics
- Manage user accounts
- Send bulk messages

#### Instructor
- View calendar
- Send messages to students
- View class schedules
- Access to assigned classes

#### Member
- View calendar
- Book studio time
- Cancel own bookings (24hr notice)
- Receive messages
- View news and events
- Register for special events

### 5. Messaging System

#### Features
- **Individual Messages**: One-to-one communication
- **Group Messages**: Send to multiple recipients
- **Bulk Messaging**: Admin/Instructor can message all members
- **Read Receipts**: Track message read status
- **Inbox/Sent**: Separate views for received and sent messages
- **Subject & Body**: Structured message format

#### Permissions
- Members: Can send to other members and instructors
- Instructors: Can send to members and bulk message
- Admin: Full messaging capabilities including bulk announcements

### 6. News & Updates Feed

#### Categories
- **Announcements**: Important studio announcements
- **Updates**: General updates and changes
- **Information**: Useful information for members

#### Features
- Rich text content
- Image support
- Publication date tracking
- Author attribution
- Published/Draft status
- Admin-only creation and editing

### 7. Special Events Management

#### Event Types
- **Onsite Events**: Events at the studio
- **Offsite Events**: Events at external locations
- **Spain Events**: Special events in Spain

#### Event Details
- Title and description
- Location (with country for international events)
- Start and end dates
- Registration deadline
- Maximum participants
- Current participant count
- Price information
- Event images
- Registration status (Open/Closed/Full)

### 8. Admin Dashboard

#### Statistics
- Total members count
- Pending bookings count
- Upcoming events count

#### Quick Actions
- Approve/Reject pending bookings
- Manage users
- Manage events
- Manage news
- View statistics

#### Booking Management
- View all pending bookings
- See booking details (user, studio, time, purpose)
- Approve with one click
- Reject with reason
- Visual studio indicators

### 9. Authentication & Security

#### Features
- Email/Password authentication
- Secure password requirements (8+ chars, uppercase, lowercase, number)
- Password reset functionality
- Email validation
- Phone number validation
- Secure session management

#### User Profile
- First name and last name
- Email address
- Phone number (optional)
- Member since date
- Preferred language
- Active/Inactive status

### 10. Calendar Features

#### Views
- Monthly calendar view
- Daily event list
- Studio-specific filtering
- Color-coded events by studio

#### Event Cards Display
- Event title
- Studio location
- Instructor name
- Class level
- Class type
- Start and end time
- Recurring event indicator
- Cancellation status

#### Booking Status Indicators
- **Pending**: Yellow/Orange - Awaiting admin approval
- **Approved**: Green - Confirmed booking
- **Rejected**: Red - Booking denied
- **Cancelled**: Gray - User cancelled

### 11. Validation & Error Handling

#### Booking Validation
- Time slot availability check
- Booking hours enforcement
- Duration limits (30 min - 4 hours)
- 24-hour cancellation window
- Double booking prevention
- German school holiday awareness

#### User Input Validation
- Email format validation
- Password strength requirements
- Phone number format
- Required field validation
- Time format validation

### 12. Notifications & Alerts

#### User Notifications
- Booking approval/rejection
- Event reminders
- Message notifications
- Special event registration confirmation

#### Admin Notifications
- New booking requests
- Cancellation requests
- System alerts

## Technical Features

### Cross-Platform Support
- **Web**: Full responsive web application
- **iOS**: Native iOS app via Expo
- **Android**: Native Android app via Expo
- **Desktop**: Can be packaged as desktop app

### Offline Capabilities
- Local data caching
- Offline-first architecture
- Sync when connection restored

### Performance
- Optimized Firebase queries
- Lazy loading of images
- Efficient state management
- Minimal re-renders

### Accessibility
- Screen reader support
- Keyboard navigation
- High contrast mode support
- Accessible form labels

### Data Management
- Real-time updates via Firebase
- Automatic data synchronization
- Conflict resolution
- Data backup and recovery

## Future Enhancement Possibilities

1. **Push Notifications**: Real-time alerts for bookings and messages
2. **Payment Integration**: Online payment for classes and events
3. **Attendance Tracking**: Digital check-in system
4. **Video Library**: Access to recorded classes
5. **Member Profiles**: Enhanced profiles with photos and bio
6. **Social Features**: Member directory and networking
7. **Analytics Dashboard**: Detailed usage statistics
8. **Automated Reminders**: Email/SMS reminders for classes
9. **Waitlist Management**: Automatic waitlist for full classes
10. **Multi-location Support**: Support for multiple studio locations
11. **Instructor Scheduling**: Self-service instructor availability
12. **Member Feedback**: Rating and review system
13. **Integration with Website**: Seamless integration with existing site
14. **WhatsApp Integration**: Direct WhatsApp notifications
15. **Calendar Export**: Export to Google Calendar, iCal

## Brand Identity

### Colors (Based on Flamenco Werkstatt Website)
- **Primary**: Dark Red (#8B0000) - Main brand color
- **Secondary**: Gold (#D4AF37) - Accent color
- **Accent**: Crimson (#C41E3A) - Secondary actions
- **Success**: Green (#4CAF50) - Positive actions
- **Warning**: Orange (#FF9800) - Alerts
- **Error**: Red (#B00020) - Errors

### Typography
- Clean, modern sans-serif fonts
- Bold headings for emphasis
- Readable body text
- Accessible font sizes

### Visual Style
- Professional and elegant
- Warm, welcoming atmosphere
- Flamenco-inspired design elements
- High-quality imagery
- Consistent spacing and layout

## Contact & Support

**Studio Owner**: Antonio Dias  
**Email**: mail@antoniodias.de  
**Phone**: +49 177 7855744  
**Website**: https://www.flamenco-werkstatt.de/  
**Address**: Frankfurter Allee 110, 10247 Berlin, Germany

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Built for**: Antonio Dias Flamenco Werkstatt, Berlin
