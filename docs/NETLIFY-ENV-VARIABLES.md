# Netlify Environment Variables Setup

Add each variable one at a time via **Site settings > Environment variables > Add a variable**.

For all variables:
- **Scopes:** All scopes
- **Values:** Same value for all deploy contexts

---

## 1. Firebase API Key
- **Key:** `EXPO_PUBLIC_FIREBASE_API_KEY`
- **Secret:** unchecked
- **Value:** *(copy from your .env file)*

## 2. Firebase Auth Domain
- **Key:** `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- **Secret:** unchecked
- **Value:** *(copy from your .env file)*

## 3. Firebase Project ID
- **Key:** `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- **Secret:** unchecked
- **Value:** *(copy from your .env file)*

## 4. Firebase Storage Bucket
- **Key:** `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- **Secret:** unchecked
- **Value:** *(copy from your .env file)*

## 5. Firebase Messaging Sender ID
- **Key:** `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- **Secret:** unchecked
- **Value:** *(copy from your .env file)*

## 6. Firebase App ID
- **Key:** `EXPO_PUBLIC_FIREBASE_APP_ID`
- **Secret:** unchecked
- **Value:** *(copy from your .env file)*

## 7. Firebase VAPID Key (for push notifications)
- **Key:** `EXPO_PUBLIC_FIREBASE_VAPID_KEY`
- **Secret:** checked
- **Value:** *(copy from your .env file)*

## 8. Admin Password Hash (from security fix)
- **Key:** `EXPO_PUBLIC_ADMIN_PASSWORD_HASH`
- **Secret:** unchecked
- **Value:** `-qd7gac`

---

After adding all 8 variables, trigger a **redeploy** from the Netlify dashboard so the new variables take effect.
