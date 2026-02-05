# Firebase Email Template Customization Guide

## Overview
This guide explains how to customize the Firebase authentication verification email to make it more professional with styled buttons and friendly messaging.

## What Was Changed in Code

The `AuthContext.tsx` now includes `ActionCodeSettings` when sending verification emails:

```typescript
const actionCodeSettings: ActionCodeSettings = {
  url: `${window.location.origin}/?verified=true`,
  handleCodeInApp: true,
};

await sendEmailVerification(userCredential.user, actionCodeSettings);
```

This ensures users are redirected back to your app after clicking the verification link.

## Customizing Email Templates in Firebase Console

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **Flamenco Werkstatt App**
3. Navigate to **Authentication** in the left sidebar
4. Click on the **Templates** tab at the top

### Step 2: Customize Email Verification Template
1. Find **Email address verification** in the list
2. Click the **Edit** (pencil) icon on the right
3. You'll see the email template editor with these sections:

#### Sender Name
- Change from "noreply" to something friendly like:
  - `Flamenco Werkstatt`
  - `Flamenco Werkstatt Team`

#### Subject Line
- Default: "Verify your email for %APP_NAME%"
- Customize to: 
  - `Willkommen bei Flamenco Werkstatt - Bitte E-Mail bestätigen` (German)
  - `Welcome to Flamenco Werkstatt - Please Verify Your Email` (English)

#### Email Body
Replace the default template with a professional HTML template. Here's a recommended template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
      padding: 40px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #8B0000;
      font-size: 22px;
      margin-top: 0;
    }
    .content p {
      margin: 16px 0;
      font-size: 16px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-size: 18px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(139, 0, 0, 0.3);
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(139, 0, 0, 0.4);
    }
    .alternative-link {
      margin-top: 24px;
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 6px;
      font-size: 14px;
      color: #666666;
    }
    .alternative-link p {
      margin: 8px 0;
    }
    .alternative-link a {
      color: #8B0000;
      word-break: break-all;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #f9f9f9;
      color: #666666;
      font-size: 14px;
      border-top: 1px solid #eeeeee;
    }
    .footer p {
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 Flamenco Werkstatt</h1>
    </div>
    
    <div class="content">
      <h2>Willkommen! / Welcome!</h2>
      
      <p><strong>Hallo / Hello %DISPLAY_NAME%,</strong></p>
      
      <p>Vielen Dank für Ihre Registrierung bei Flamenco Werkstatt! Um Ihr Konto zu aktivieren, bestätigen Sie bitte Ihre E-Mail-Adresse.</p>
      
      <p>Thank you for registering with Flamenco Werkstatt! To activate your account, please verify your email address.</p>
      
      <div class="button-container">
        <a href="%LINK%" class="button">E-Mail bestätigen / Verify Email</a>
      </div>
      
      <p>Dieser Link ist 24 Stunden gültig. / This link is valid for 24 hours.</p>
      
      <div class="alternative-link">
        <p><strong>Button funktioniert nicht? / Button not working?</strong></p>
        <p>Kopieren Sie diesen Link in Ihren Browser: / Copy this link into your browser:</p>
        <p><a href="%LINK%">%LINK%</a></p>
      </div>
      
      <p style="margin-top: 32px;">Falls Sie sich nicht bei Flamenco Werkstatt registriert haben, können Sie diese E-Mail ignorieren.</p>
      
      <p>If you did not register with Flamenco Werkstatt, you can safely ignore this email.</p>
    </div>
    
    <div class="footer">
      <p><strong>Flamenco Werkstatt</strong></p>
      <p>Ihre Flamenco-Community / Your Flamenco Community</p>
      <p style="margin-top: 16px; font-size: 12px;">
        Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.<br>
        This email was automatically generated. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
```

### Step 3: Customize Other Email Templates

While you're in the Templates section, consider customizing these other templates as well:

#### Password Reset Email
- Subject: `Passwort zurücksetzen / Reset Your Password - Flamenco Werkstatt`
- Use similar styling with appropriate messaging

#### Email Change Verification
- Subject: `E-Mail-Änderung bestätigen / Confirm Email Change - Flamenco Werkstatt`

### Step 4: Test the Email

1. After saving your template, test it by:
   - Creating a new test user account in your app
   - Check your email inbox
   - Verify the email looks professional with the button

2. Test the button functionality:
   - Click the verification button
   - Ensure it redirects to your app correctly
   - Verify the user can sign in after verification

## Important Notes

### Firebase Template Variables
Firebase provides these variables you can use in your templates:
- `%LINK%` - The verification link (required)
- `%APP_NAME%` - Your app name from Firebase settings
- `%DISPLAY_NAME%` - User's display name (if set)
- `%EMAIL%` - User's email address

### Styling Best Practices
1. **Use inline CSS** - Email clients have limited CSS support
2. **Test across email clients** - Gmail, Outlook, Apple Mail, etc.
3. **Keep it responsive** - Use max-width and mobile-friendly sizing
4. **Avoid JavaScript** - Email clients block JavaScript
5. **Use web-safe fonts** - System fonts work best

### Brand Colors Used
- Primary: `#8B0000` (Dark Red)
- Accent: `#DC143C` (Crimson)
- These match your app's gradient theme

## Alternative: Simple Text-Based Template

If you prefer a simpler approach without HTML, use this text template:

```
🔥 Flamenco Werkstatt

Hallo %DISPLAY_NAME%,

Vielen Dank für Ihre Registrierung bei Flamenco Werkstatt!

Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den folgenden Link klicken:

%LINK%

Dieser Link ist 24 Stunden gültig.

Falls Sie sich nicht registriert haben, können Sie diese E-Mail ignorieren.

---

Hello %DISPLAY_NAME%,

Thank you for registering with Flamenco Werkstatt!

Please verify your email address by clicking the following link:

%LINK%

This link is valid for 24 hours.

If you did not register, you can safely ignore this email.

---

Flamenco Werkstatt Team
Ihre Flamenco-Community / Your Flamenco Community
```

## Troubleshooting

### Email Not Sending
- Check Firebase Authentication is enabled
- Verify SMTP settings in Firebase Console
- Check spam/junk folders

### Link Not Working
- Ensure `ActionCodeSettings` URL matches your domain
- Verify domain is authorized in Firebase Console (Authentication > Settings > Authorized domains)

### Styling Not Appearing
- Use inline styles instead of `<style>` tags
- Test in multiple email clients
- Some clients strip certain CSS properties

## Next Steps

1. ✅ Code updated with `ActionCodeSettings`
2. ⏳ Customize email template in Firebase Console (follow steps above)
3. ⏳ Test with a new user registration
4. ⏳ Adjust styling as needed based on email client testing

## Support

If you need help with Firebase Console access or have questions about customization, please reach out!
