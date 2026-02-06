# Firebase Email Customization Guide

## Overview

This app sends **custom branded emails** for email verification and password reset using a **Netlify serverless function** with the **Firebase Admin SDK** and **Nodemailer** (Gmail SMTP).

Firebase Console's built-in template editor is locked ("To help prevent spam, the message can't be edited"), so we bypass it entirely by generating action links via the Admin SDK and sending emails ourselves.

## Architecture

```
User signs up / resets password
  → AuthContext.tsx calls /.netlify/functions/send-email
    → Netlify function uses Firebase Admin SDK to generate action link
    → Netlify function uses Nodemailer + Gmail SMTP to send branded email
    → User receives professional, localized email
```

### Key Files

| File | Purpose |
|---|---|
| `src/contexts/AuthContext.tsx` | Calls the Netlify function with email type, address, and language |
| `netlify/functions/send-email.js` | Serverless function: generates links via Admin SDK, sends via Gmail SMTP |
| `docs/firebase-email-templates.html` | Visual preview of all 9 template variants |
| `docs/firebase-paste-ready-templates.md` | Raw HTML templates for reference |

## Supported Email Types

| Type | Languages | Description |
|---|---|---|
| **Email Verification** | DE, EN, ES | Sent after user registration |
| **Password Reset** | DE, EN, ES | Sent when user requests password reset |

## Language Selection

The user's current language (selected via `LanguageSwitcher`) is read from `getLocale()` and passed to the Netlify function. The function selects the matching template (DE, EN, or ES). Default is German (de).

## Setup: Required Environment Variables

### Netlify Dashboard

Go to **Netlify Dashboard → Site → Site configuration → Environment variables** and add:

| Variable | Value | Description |
|---|---|---|
| `FIREBASE_PROJECT_ID` | *(your Firebase project ID)* | e.g. `flamenco-werkstatt-app` |
| `FIREBASE_CLIENT_EMAIL` | *(service account email)* | e.g. `firebase-adminsdk-xxxxx@flamenco-werkstatt-app.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | *(service account private key)* | The full private key string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Paste it as-is; the code handles `\n` replacement. |
| `SMTP_EMAIL` | `flamencowerkstattapp@gmail.com` | Gmail address used for sending |
| `SMTP_PASSWORD` | *(16-character Gmail App Password)* | Generated from Google Account → App Passwords |
| `REPLY_TO_EMAIL` | `mail@antoniodias.de` | Reply-to address shown in emails |
| `APP_URL` | `https://flamenco-werkstatt.netlify.app` | Your app's base URL (used in action links) |

### How to Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Project Settings** (gear icon)
2. Click the **Service accounts** tab
3. Click **"Generate new private key"**
4. A JSON file will download — it contains `project_id`, `client_email`, and `private_key`
5. Copy those 3 values into the Netlify environment variables above

### How to Get Gmail App Password

1. Go to [Google Account → App Passwords](https://myaccount.google.com/apppasswords)
2. Sign in with `flamencowerkstattapp@gmail.com`
3. **2-Step Verification** must be enabled first
4. Select **Mail** → name it `Netlify` or `Firebase`
5. Copy the 16-character password (no spaces)

## Firebase Console SMTP Settings

The SMTP settings in Firebase Console (Authentication → Templates → SMTP settings) are **optional** since we bypass Firebase's email sending. However, if you want Firebase's built-in emails as a fallback, keep them configured:

| Field | Value |
|---|---|
| Sender address | `flamencowerkstattapp@gmail.com` |
| SMTP server host | `smtp.gmail.com` |
| SMTP server port | `587` |
| SMTP account username | `flamencowerkstattapp@gmail.com` |
| SMTP account password | *(Gmail App Password)* |
| SMTP security mode | `STARTTLS` |

## Brand Colors

| Color | Hex | Usage |
|---|---|---|
| Primary (Dark Red) | `#8B0000` | Header gradient, buttons, links |
| Accent (Crimson) | `#C41E3A` | Header gradient, security notices |
| Gold | `#D4AF37` | Decorative accents, footer branding |

## Testing

1. **Deploy to Netlify** (or test locally with `netlify dev`)
2. Create a new test user account in the app
3. Check the email inbox for the branded verification email
4. Click the verification button — it should redirect to the app
5. Test password reset from the login screen
6. Test all 3 languages by switching language before signing up

## Troubleshooting

### Email Not Sending
- Check Netlify function logs: **Netlify Dashboard → Functions → send-email**
- Verify all environment variables are set correctly
- Ensure Gmail App Password is correct (not the regular Gmail password)
- Check if Gmail has blocked the sign-in attempt (check Gmail security alerts)

### "auth/user-not-found" for Password Reset
- This is handled gracefully — the function returns success without revealing if the email exists (security best practice)

### Link Not Working After Click
- Verify `APP_URL` environment variable matches your deployed domain
- Check that the domain is in Firebase Console → Authentication → Settings → Authorized domains

### SMTP Connection Error
- Ensure 2-Step Verification is enabled on the Gmail account
- Regenerate the App Password if it's not working
- Check if Google has disabled "Less secure app access" (App Passwords bypass this)

## Modifying Templates

Email templates are defined in `netlify/functions/send-email.js` in the `getEmailTemplate()` function. Each template type has DE, EN, and ES variants with:

- `subject` — Email subject line
- `heading` — Main heading in the email body
- `subheading` — Secondary heading
- `intro` — Opening text
- `body` — Main content
- `buttonText` — CTA button label
- `fallback` — Text above the fallback link
- `notice` — Warning/security notice text
- `tagline` — Footer tagline
- `autoMessage` — "Do not reply" footer text

To add a new language, add a new key (e.g., `fr`) to each template type object and provide all the translation strings.
