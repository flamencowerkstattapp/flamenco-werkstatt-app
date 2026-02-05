# Antonio Dias Flamenco Werkstatt - Owner's Guide

**Welcome, Antonio!**

This comprehensive guide will walk you through every aspect of your Flamenco Werkstatt App, helping you manage your dance studio efficiently and effectively.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Users](#managing-users)
4. [Managing Events & Classes](#managing-events--classes)
5. [Studio Booking Management](#studio-booking-management)
6. [News & Announcements](#news--announcements)
7. [Messaging System](#messaging-system)
8. [Special Events](#special-events)
9. [Statistics & Reports](#statistics--reports)
10. [Calendar System](#calendar-system)
11. [User Roles & Permissions](#user-roles--permissions)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the App

**Web Access:**
- Open your web browser and navigate to your app URL
- Login with your admin credentials
- Email: mail@antoniodias.de
- Password: Your secure admin password

**Mobile Access:**
- Download the app from the App Store (iOS) or Google Play (Android)
- Login with the same credentials

### First Login

When you first log in, you'll see the **Admin Dashboard** - your command center for managing the entire studio.

### Language Selection

The app supports three languages:
- **German (DE)** - Default language
- **English (EN)**
- **Spanish (ES)**

To change language:
1. Click the language switcher in the top navigation bar
2. Select your preferred language
3. The entire app will update immediately

---

## Dashboard Overview

Your **Admin Dashboard** is the heart of your management system. Here's what you'll see:

### Statistics Cards

At the top of your dashboard, you'll find key metrics:

1. **Total Members**
   - Shows the total number of registered users
   - Includes all active members, instructors, and admins
   - Click to view detailed breakdown

2. **Contract Users vs No Contract Users**
   - Contract Users: Members with active contracts
   - No Contract Users: Members without contracts
   - Helps you track membership status

3. **Pending Bookings**
   - Number of studio bookings awaiting your approval
   - Updates in real-time
   - Click to jump to pending bookings section

4. **Upcoming Events**
   - Count of special events scheduled
   - Includes onsite, offsite, and Spain events

5. **Role Distribution**
   - Number of admins and instructors
   - Helps you manage team access

### Quick Actions

Six main action buttons give you instant access to key functions:

1. **Manage Users** - Add, edit, or remove members
2. **Manage Events** - Create and edit classes and events
3. **Manage News** - Post announcements and updates
4. **Manage Groups** - Organize members into groups
5. **Statistics** - View detailed analytics
6. **Compose Message** - Send messages to members

### Pending Bookings Section

Below the statistics, you'll see all pending studio bookings that need your approval:

**Each booking card shows:**
- Member's name
- Studio (Big or Small)
- Date and time
- Duration
- Purpose of booking
- When the request was made

**Actions:**
- **Approve** (Green button) - Confirms the booking
- **Reject** (Red button) - Denies the booking (you can provide a reason)

---

## Managing Users

Access: **Dashboard → Manage Users**

### User Overview

The Manage Users screen shows all registered members with:
- Name and email
- Role (Admin, Instructor, Member)
- Contract status
- Active/Inactive status
- Member since date
- Payment history (if applicable)

### Adding a New User

1. Click **"Add User"** button at the top
2. Fill in the required information:
   - **First Name** (required)
   - **Last Name** (required)
   - **Email** (required, must be unique)
   - **Phone Number** (optional)
   - **Password** (required, minimum 8 characters)
   - **Role** (Admin, Instructor, or Member)
   - **Contract Status** (Yes/No)
   - **Active Status** (Active/Inactive)
3. Click **"Create User"**
4. The user will receive their login credentials

### Editing a User

1. Find the user in the list
2. Click **"Edit"** button on their card
3. Update any information:
   - Name, email, phone
   - Role (promote to instructor or admin)
   - Contract status
   - Active/Inactive status
4. Click **"Update User"**

### User Roles Explained

**Admin (You):**
- Full access to everything
- Approve/reject bookings
- Manage all users and events
- View all statistics
- Send bulk messages

**Instructor:**
- View calendar and schedules
- Send messages to students
- Access assigned classes
- Cannot manage users or approve bookings

**Member:**
- View calendar
- Book studio time
- Register for events
- Receive messages
- View news

### Deactivating a User

Instead of deleting users (which removes their history), you can deactivate them:

1. Edit the user
2. Change **Active Status** to "Inactive"
3. They can no longer log in, but their data is preserved

### Managing Instructors

**To add an instructor:**
1. Create a new user or edit existing user
2. Set Role to "Instructor"
3. They can now access instructor features

**Instructor Badge:**
- Instructors have a special badge on their profile
- Easily identify teaching staff

### Contract Management

**Contract Status** helps you track who has active contracts:

- **Has Contract**: Members with active membership agreements
- **No Contract**: Drop-in or inactive members

**To update contract status:**
1. Edit the user
2. Toggle "Has Contract"
3. Save changes

### Payment History

For users with payment records:
- View payment history by clicking "View Payment History"
- See all past payments and dates
- Track membership fees

### Bulk Import (CSV)

To add multiple users at once:

1. Click **"Import CSV"** button
2. Download the template file
3. Fill in user information:
   - firstName, lastName, email, phone, role, hasContract
4. Upload the completed CSV file
5. Review the import preview
6. Confirm to add all users

**CSV Format:**
```csv
firstName,lastName,email,phone,role,hasContract
Maria,Schmidt,maria@example.com,+49123456789,member,true
Hans,Mueller,hans@example.com,+49987654321,instructor,false
```

### Searching and Filtering

**Search Bar:**
- Type any name or email to filter users instantly
- Search is case-insensitive

**Filter by Role:**
- Click role filter buttons to show only:
  - All users
  - Admins only
  - Instructors only
  - Members only

**Filter by Contract:**
- Show only users with contracts
- Show only users without contracts

---

## Managing Events & Classes

Access: **Dashboard → Manage Events**

### Event Types

Your app supports four types of events:

1. **Regular Classes** - Weekly recurring classes
2. **Studio Bookings** - Member-requested studio time
3. **Special Events** - One-time workshops or performances
4. **School Holidays** - Berlin school holiday periods

### Creating a Regular Class

1. Click **"Add Event"** button
2. Fill in the class details:

**Basic Information:**
- **Title**: e.g., "Intermediate Flamenco"
- **Studio**: Big (20 capacity) or Small (12 capacity)
- **Instructor**: Select from your instructor list
- **Start Date**: First class date
- **Start Time**: Class start time
- **End Time**: Class end time

**Class Details:**
- **Level**: Beginner 1, Beginner 2, Intermediate 1-3, Advanced 1-2
- **Type**: Children, Teenager, Manton, Kastanets, Technique, Oriental, Modern
- **Purpose**: Brief description

**Recurring Pattern:**
- **Weekly**: Same day each week
- **Bi-weekly**: Every two weeks
- **Monthly**: Once per month
- **None**: One-time class

**End Date:**
- Set when the class series ends
- Leave blank for ongoing classes

3. Click **"Create Event"**

### Editing an Event

1. Find the event in the list
2. Click **"Edit"** button
3. Update any details
4. Choose to update:
   - **This event only** - Changes one occurrence
   - **All future events** - Changes this and future occurrences
5. Click **"Update Event"**

### Canceling a Class

**To cancel a single class:**
1. Edit the event
2. Check "Cancel this event"
3. Provide a reason (optional)
4. Update event

**To cancel all future classes:**
1. Edit the event
2. Select "All future events"
3. Check "Cancel this event"
4. Update event

### School Holiday Management

**Automatic Cancellations:**
- Regular classes are automatically cancelled during Berlin school holidays
- Studio bookings are still allowed during holidays

**Holiday Periods:**
- Winterferien (Winter Break)
- Osterferien (Easter Break)
- Pfingstferien (Pentecost Break)
- Sommerferien (Summer Break)
- Herbstferien (Autumn Break)
- Weihnachtsferien (Christmas Break)

**To add a holiday period:**
1. Click "Add Event"
2. Select Type: "School Holiday"
3. Set start and end dates
4. Classes will automatically be marked as cancelled

### Deleting an Event

⚠️ **Use with caution** - This permanently removes the event

1. Edit the event
2. Scroll to bottom
3. Click **"Delete Event"** button
4. Confirm deletion
5. Choose to delete:
   - This event only
   - All future events in the series

---

## Studio Booking Management

### The Two Studios

**Studio Big (1):**
- Capacity: 20 people
- Color: Dark Red (#8B0000)
- Larger space for bigger classes

**Studio Small (2):**
- Capacity: 12 people
- Color: Crimson (#C41E3A)
- Intimate space for smaller groups

### Booking Rules

**Operating Hours:**
- **Weekdays**: Monday-Friday, 16:00-22:00
- **Weekends**: Saturday-Sunday, 08:00-22:00

**Booking Limits:**
- Minimum duration: 30 minutes
- Maximum duration: 4 hours
- Cancellation notice: 24 hours required

### Approving Bookings

When a member requests studio time:

1. You receive a notification (if enabled)
2. The booking appears in your **Pending Bookings** section
3. Review the booking details:
   - Who is requesting
   - Which studio
   - Date and time
   - Duration
   - Purpose
4. Click **"Approve"** to confirm
   - Member receives confirmation
   - Booking appears on calendar as green
5. Or click **"Reject"** to deny
   - Provide a reason (optional)
   - Member receives notification

### Viewing All Bookings

**Calendar View:**
- Go to Calendar tab
- Filter by studio (Big/Small)
- See all approved bookings

**Booking Status Colors:**
- 🟢 **Green** - Approved
- 🟡 **Yellow/Orange** - Pending your approval
- 🔴 **Red** - Rejected
- ⚫ **Gray** - Cancelled by user

### Handling Conflicts

The app automatically prevents double bookings:
- If a time slot is taken, members cannot request it
- You'll never see conflicting booking requests

### Cancellation Requests

If a member cancels their booking:
- They must do so 24 hours in advance
- You'll see the cancellation in the calendar
- The time slot becomes available again

---

## News & Announcements

Access: **Dashboard → Manage News**

### Creating News Posts

1. Click **"Add News"** button
2. Fill in the details:

**Required Fields:**
- **Title**: Headline for your announcement
- **Category**: 
  - Announcements (important studio news)
  - Updates (general updates)
  - Information (useful info for members)
- **Content**: Full text of your message

**Optional Fields:**
- **Image URL**: Link to an image (if hosted online)
- **Published Status**: 
  - ✅ Published - Visible to all members
  - ❌ Draft - Only you can see it

3. Click **"Create News"**

### Editing News

1. Find the news post in the list
2. Click **"Edit"** button
3. Update any information
4. Click **"Update News"**

### Publishing Drafts

To save a news post for later:
1. Create the post
2. Uncheck "Published"
3. Save as draft
4. When ready, edit and check "Published"

### Deleting News

1. Edit the news post
2. Scroll to bottom
3. Click **"Delete News"** button
4. Confirm deletion

### News Display

**For Members:**
- News appears in the News tab
- Most recent posts shown first
- Category badges help identify type
- Click any post to read full content

**Best Practices:**
- Use clear, concise titles
- Choose the right category
- Add images when possible
- Keep content relevant and timely

---

## Messaging System

Access: **Dashboard → Compose Message** or **Messages Tab**

### Sending Individual Messages

1. Go to Messages tab
2. Click **"Compose"** button
3. Fill in:
   - **To**: Select recipient(s)
   - **Subject**: Message topic
   - **Message**: Your content
4. Click **"Send"**

### Sending Bulk Messages

As admin, you can message all members at once:

1. Click **"Compose Message"** from dashboard
2. Select **"All Members"** option
3. Write your subject and message
4. Click **"Send to All"**

**Use cases:**
- Studio closure announcements
- Holiday schedules
- Important policy changes
- Event reminders

### Sending to Groups

1. Compose a new message
2. Select **"Group"** option
3. Choose the group (e.g., "Intermediate Students")
4. Write and send

### Managing Your Inbox

**Inbox Tab:**
- See all messages sent to you
- Unread messages highlighted
- Click to read and reply

**Sent Tab:**
- View all messages you've sent
- Track delivery status

**Reading Messages:**
- Click any message to open
- Reply directly from the message view
- Mark as read/unread

### Message Features

- **Read Receipts**: See when messages are read
- **Subject Lines**: Organize conversations
- **Multi-recipient**: Send to multiple people
- **Search**: Find messages quickly

---

## Special Events

Access: **Dashboard → Events Tab** (for viewing) or **Manage Events** (for creating)

### Event Categories

1. **Onsite Events** - Events at your studio
2. **Offsite Events** - Events at external locations
3. **Spain Events** - Special trips to Spain

### Creating a Special Event

1. Go to **Manage Events**
2. Click **"Add Event"**
3. Select Type: **"Special Event"**
4. Fill in details:

**Basic Information:**
- **Title**: Event name (e.g., "Flamenco Workshop with Guest Artist")
- **Description**: Full event details
- **Location**: Where it takes place
- **Country**: Especially important for international events

**Dates & Times:**
- **Start Date**: Event begins
- **End Date**: Event ends
- **Registration Deadline**: Last day to register

**Capacity & Pricing:**
- **Maximum Participants**: Limit attendees
- **Price**: Cost per person
- **Currency**: EUR, USD, etc.

**Media:**
- **Image URL**: Event poster or photo

4. Click **"Create Event"**

### Managing Registrations

**View Registrations:**
1. Go to Events tab
2. Click on the event
3. See list of registered participants
4. Current count vs. maximum capacity

**Registration Status:**
- **Open**: Accepting registrations
- **Full**: Maximum capacity reached
- **Closed**: Registration deadline passed

### Editing Special Events

1. Find the event in Events tab
2. Click **"Edit"** (admin only)
3. Update any details
4. Save changes

### Canceling Special Events

If you need to cancel:
1. Edit the event
2. Update description with cancellation notice
3. Or delete the event entirely
4. Manually message all registered participants

---

## Statistics & Reports

Access: **Dashboard → Statistics**

### Available Statistics

**User Statistics:**
- Total members over time
- New member growth
- Contract vs. non-contract breakdown
- Role distribution (admins, instructors, members)

**Booking Statistics:**
- Total bookings per month
- Studio utilization (Big vs. Small)
- Peak booking times
- Approval/rejection rates
- Cancellation rates

**Event Statistics:**
- Total classes per week
- Most popular class types
- Instructor workload
- Attendance trends

**Revenue Tracking:**
- Special event registrations
- Membership trends
- Payment history

### Viewing Reports

1. Go to Statistics screen
2. Select date range
3. Choose report type
4. View charts and graphs
5. Export data (if needed)

### Using Statistics for Planning

**Optimize Schedule:**
- See which time slots are most popular
- Identify underutilized times
- Balance instructor workload

**Track Growth:**
- Monitor membership trends
- Identify successful marketing periods
- Plan capacity expansion

**Improve Operations:**
- Reduce booking rejections
- Optimize studio usage
- Plan maintenance during low-usage times

---

## Calendar System

Access: **Calendar Tab** (bottom navigation)

### Calendar Views

**Monthly View:**
- See entire month at a glance
- Color-coded by studio
- Click any day to see details

**Daily View:**
- Scroll through events for selected day
- See full schedule
- Time-based layout

### Color Coding

- **Dark Red**: Studio Big events
- **Crimson**: Studio Small events
- **Green**: Approved bookings
- **Yellow/Orange**: Pending bookings
- **Gray**: Cancelled events

### Filtering Calendar

**By Studio:**
- Toggle Studio Big on/off
- Toggle Studio Small on/off
- View both or individually

**By Event Type:**
- Show/hide regular classes
- Show/hide studio bookings
- Show/hide special events

### Event Details

Click any event to see:
- Full title and description
- Instructor name
- Studio location
- Start and end time
- Class level and type
- Recurring pattern
- Cancellation status

### Booking from Calendar

1. Click **"Book Studio"** button
2. Select studio
3. Choose date and time
4. Set duration
5. Add purpose
6. Submit for approval

---

## User Roles & Permissions

### Admin (Your Role)

**Full Access:**
- ✅ Approve/reject all bookings
- ✅ Create, edit, delete events
- ✅ Manage all users
- ✅ Publish news
- ✅ Send bulk messages
- ✅ View all statistics
- ✅ Manage special events
- ✅ Access admin dashboard

### Instructor Role

**Limited Access:**
- ✅ View calendar and schedules
- ✅ Send messages to students
- ✅ View assigned classes
- ❌ Cannot approve bookings
- ❌ Cannot manage users
- ❌ Cannot create events
- ❌ Cannot publish news

**Use Cases:**
- Give instructors visibility into their schedule
- Allow communication with students
- Keep them informed without full admin access

### Member Role

**Standard Access:**
- ✅ View calendar
- ✅ Book studio time
- ✅ Cancel own bookings (24hr notice)
- ✅ Register for special events
- ✅ Send/receive messages
- ✅ View news and updates
- ❌ Cannot see admin features
- ❌ Cannot approve bookings
- ❌ Cannot manage other users

---

## Best Practices

### Daily Routine

**Morning Check (5 minutes):**
1. Open admin dashboard
2. Check pending bookings
3. Approve or reject requests
4. Review any new messages

**Weekly Tasks:**
1. Review upcoming week's schedule
2. Confirm instructor availability
3. Post any news or updates
4. Check special event registrations

**Monthly Tasks:**
1. Review statistics
2. Plan next month's schedule
3. Update any recurring classes
4. Send monthly newsletter via bulk message

### Booking Management Tips

**Quick Approval:**
- Most bookings can be approved immediately
- Check for conflicts (app prevents double-booking)
- Verify purpose is appropriate

**When to Reject:**
- Inappropriate use of studio
- User has history of no-shows
- Maintenance scheduled
- Special event planned

**Communication:**
- Always provide reason when rejecting
- Suggest alternative times if possible
- Be prompt (members are waiting)

### Event Management Tips

**Planning Classes:**
- Schedule recurring classes at start of term
- Set end dates for seasonal classes
- Mark school holidays in advance
- Balance studio usage (Big vs. Small)

**Special Events:**
- Post early to maximize registrations
- Set realistic capacity limits
- Include clear pricing and details
- Send reminders as deadline approaches

### User Management Tips

**New Members:**
- Add them promptly after signup
- Verify email address is correct
- Set appropriate role
- Welcome message via messaging system

**Instructor Management:**
- Keep instructor list updated
- Assign classes appropriately
- Communicate schedule changes
- Recognize their contributions

**Inactive Users:**
- Deactivate instead of delete
- Preserve booking history
- Can reactivate if they return

### Communication Best Practices

**News Posts:**
- Keep titles short and clear
- Use appropriate category
- Publish important news immediately
- Archive old news periodically

**Messages:**
- Use bulk messages sparingly
- Personalize when possible
- Respond to member messages promptly
- Keep professional tone

---

## Troubleshooting

### Common Issues & Solutions

#### "I can't see pending bookings"

**Solution:**
1. Refresh the dashboard
2. Check your internet connection
3. Verify you're logged in as admin
4. Check if bookings were already processed

#### "A member says they can't book a time slot"

**Possible Causes:**
- Time slot already booked
- Outside operating hours
- Duration too short/long
- Their account is inactive

**Solution:**
1. Check calendar for conflicts
2. Verify booking rules
3. Check member's account status
4. Book on their behalf if needed

#### "Recurring class not showing up"

**Solution:**
1. Check if end date has passed
2. Verify recurring pattern is set
3. Check if cancelled during school holiday
4. Edit event and verify settings

#### "Member not receiving messages"

**Solution:**
1. Verify their email is correct
2. Check if account is active
3. Ask them to check spam folder
4. Resend the message

#### "Can't upload CSV file"

**Solution:**
1. Verify CSV format matches template
2. Check for special characters
3. Ensure all required fields filled
4. Try with smaller batch first

#### "Statistics not loading"

**Solution:**
1. Refresh the page
2. Check date range selected
3. Verify you have data for that period
4. Clear browser cache

### Getting Help

**Technical Issues:**
- Check the docs folder for setup guides
- Review FIREBASE_SETUP.md for database issues
- Check NETLIFY-DEPLOYMENT.md for hosting issues

**Feature Questions:**
- Refer to FEATURES.md for complete feature list
- Check CSV_IMPORT_GUIDE.md for bulk import help

**Contact Information:**
- Your app developer can assist with technical issues
- Keep this guide handy for reference

---

## Quick Reference

### Common Tasks Checklist

**Approve a Booking:**
1. Dashboard → Pending Bookings section
2. Click "Approve" on the booking
3. Done!

**Add a New Member:**
1. Dashboard → Manage Users
2. Click "Add User"
3. Fill in details
4. Click "Create User"

**Create a Class:**
1. Dashboard → Manage Events
2. Click "Add Event"
3. Fill in class details
4. Set recurring pattern
5. Click "Create Event"

**Post an Announcement:**
1. Dashboard → Manage News
2. Click "Add News"
3. Write title and content
4. Select "Announcements" category
5. Check "Published"
6. Click "Create News"

**Send Message to All Members:**
1. Dashboard → Compose Message
2. Select "All Members"
3. Write subject and message
4. Click "Send to All"

### Keyboard Shortcuts (Web)

- **Ctrl/Cmd + K**: Quick search
- **Ctrl/Cmd + N**: New item (context-dependent)
- **Esc**: Close modal/dialog
- **Tab**: Navigate between fields

### Contact Information

**Studio Details:**
- **Owner**: Antonio Dias
- **Email**: mail@antoniodias.de
- **Phone**: +49 177 7855744
- **Website**: https://www.flamenco-werkstatt.de/
- **Address**: Frankfurter Allee 110, 10247 Berlin, Germany

---

## Conclusion

This app is designed to make managing your Flamenco Werkstatt easier and more efficient. Take time to explore each feature, and don't hesitate to experiment - you can always undo changes or ask for help.

**Remember:**
- Check your dashboard daily for pending bookings
- Keep your calendar updated
- Communicate regularly with members
- Use statistics to improve operations

Your dance studio is now at your fingertips. ¡Olé!

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Created for**: Antonio Dias, Flamenco Werkstatt Berlin
