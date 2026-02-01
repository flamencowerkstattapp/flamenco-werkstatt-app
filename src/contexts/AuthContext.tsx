import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  sendEmailVerification,
  ActionCodeSettings,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User, UserRole } from '../types';

const DEMO_MODE = false;

const DEMO_USER: User = {
  id: 'demo-member-1',
  email: 'member@flamenco-werkstatt.de',
  firstName: 'Maria',
  lastName: 'Garcia',
  role: 'member',
  isInstructor: false,
  phone: '+49 177 1234567',
  memberSince: new Date('2024-01-15'),
  isActive: true,
  preferredLanguage: 'de',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEMO_ADMIN: User = {
  id: 'demo-admin-1',
  email: 'admin@flamenco-werkstatt.de',
  firstName: 'Antonio',
  lastName: 'Dias',
  role: 'admin',
  isInstructor: false,
  phone: '+49 177 7855744',
  memberSince: new Date('2020-01-01'),
  isActive: true,
  preferredLanguage: 'de',
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
    ]);
  };

  useEffect(() => {
    if (DEMO_MODE) {
      setTimeout(() => {
        setUser(DEMO_ADMIN);
        setLoading(false);
      }, 500);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser && !firebaseUser.emailVerified) {
          setUser(null);
          setFirebaseUser(firebaseUser);
          return;
        }

        setFirebaseUser(firebaseUser);

        if (firebaseUser) {
          const userDoc = await withTimeout(
            getDoc(doc(db, 'users', firebaseUser.uid)),
            10000,
            'Timed out while loading your profile.'
          );

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            setUser({
              ...userData,
              memberSince: userData.memberSince instanceof Date ? userData.memberSince : new Date(userData.memberSince),
              createdAt: userData.createdAt instanceof Date ? userData.createdAt : new Date(userData.createdAt),
              updatedAt: userData.updatedAt instanceof Date ? userData.updatedAt : new Date(userData.updatedAt),
            });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth: Failed to load user profile:', err);
        setUser(null);
        setFirebaseUser(null);
        if (firebaseUser) {
          try {
            await withTimeout(signOut(auth), 5000, 'Timed out while signing out after profile load failure.');
          } catch {
            // ignore
          }
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        throw new Error('EMAIL_NOT_VERIFIED');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle different Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        throw new Error('USER_NOT_FOUND');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('WRONG_PASSWORD');
      } else if (error.code === 'auth/invalid-credential') {
        // This is a general error for wrong email or password
        throw new Error('INVALID_CREDENTIAL');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('INVALID_EMAIL');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('USER_DISABLED');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('TOO_MANY_REQUESTS');
      } else if (error.message === 'EMAIL_NOT_VERIFIED') {
        throw new Error('EMAIL_NOT_VERIFIED');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('NETWORK_ERROR');
      } else {
        throw new Error('GENERAL_ERROR');
      }
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    const userCredential = await withTimeout(
      createUserWithEmailAndPassword(auth, email, password),
      15000,
      'Timed out while creating the account.'
    );
    const uid = userCredential.user.uid;

    const newUser: User = {
      id: uid,
      email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      role: 'member' as UserRole,
      isInstructor: false,
      phone: userData.phone,
      memberSince: new Date(),
      isActive: true,
      preferredLanguage: userData.preferredLanguage || 'de',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let verificationError: any = null;
    let firestoreError: any = null;

    try {
      // Try sending email verification without custom settings first
      console.log('Sending basic email verification...');
      
      await withTimeout(
        sendEmailVerification(userCredential.user),
        15000,
        'Timed out while sending verification email.'
      );
      
      console.log('Basic email verification sent successfully');
    } catch (emailError: any) {
      verificationError = emailError;
      console.error('Failed to send verification email:', emailError);
      console.error('Email verification error details:', emailError.code, emailError.message);
    }

    try {
      await withTimeout(
        setDoc(doc(db, 'users', uid), newUser),
        15000,
        'Timed out while saving your profile.'
      );
    } catch (err: any) {
      firestoreError = err;
      console.error('Failed to save user profile to Firestore:', err);
    } finally {
      try {
        await withTimeout(signOut(auth), 10000, 'Timed out while signing out.');
      } finally {
        setUser(null);
        setFirebaseUser(null);
      }
    }

    if (verificationError) {
      throw new Error(
        'Account created, but verification email could not be sent. Please try again later or contact support.'
      );
    }

    if (firestoreError) {
      throw new Error(
        'Account created, but your profile could not be saved. Please try again later or contact support.'
      );
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
