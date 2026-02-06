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
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, limit } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User, UserRole } from '../types';

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

    let verificationError: any = null;
    let firestoreError: any = null;

    try {
      const actionCodeSettings: ActionCodeSettings = {
        url: `${window.location.origin}/?verified=true`,
        handleCodeInApp: true,
      };
      
      await sendEmailVerification(userCredential.user, actionCodeSettings);
    } catch (emailError: any) {
      verificationError = emailError;
      console.error('Failed to send verification email:', emailError);
    }

    try {
      // Check if user profile already exists (from CSV import)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase().trim()), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Profile exists from CSV import - update it with Auth UID
        const existingDoc = snapshot.docs[0];
        const existingData = existingDoc.data() as User;
        
        // If the existing doc ID is different from Auth UID, we need to migrate
        if (existingDoc.id !== uid) {
          
          // Update existing profile with Auth UID and merge with signup data
          const updatedUser: User = {
            ...existingData,
            id: uid, // Link to Auth UID
            firstName: userData.firstName || existingData.firstName,
            lastName: userData.lastName || existingData.lastName,
            phone: userData.phone || existingData.phone,
            updatedAt: new Date(),
          };
          
          // Create new document with Auth UID
          await withTimeout(
            setDoc(doc(db, 'users', uid), updatedUser),
            15000,
            'Timed out while saving profile.'
          );
          
          // Delete old CSV document
          try {
            await withTimeout(
              deleteDoc(doc(db, 'users', existingDoc.id)),
              15000,
              'Timed out while cleaning up old profile.'
            );
          } catch (deleteError) {
            console.warn('Could not delete old CSV profile, admin cleanup may be needed:', deleteError);
          }
        } else {
          // Doc ID already matches, just update it
          const updatedUser: User = {
            ...existingData,
            firstName: userData.firstName || existingData.firstName,
            lastName: userData.lastName || existingData.lastName,
            phone: userData.phone || existingData.phone,
            updatedAt: new Date(),
          };
          
          await withTimeout(
            setDoc(doc(db, 'users', uid), updatedUser, { merge: true }),
            15000,
            'Timed out while updating profile.'
          );
        }
      } else {
        // No existing profile - create new one
        const newUser: User = {
          id: uid,
          email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: 'member' as UserRole,
          isInstructor: false,
          noMembership: false,
          phone: userData.phone,
          memberSince: new Date(),
          isActive: true,
          preferredLanguage: userData.preferredLanguage || 'de',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await withTimeout(
          setDoc(doc(db, 'users', uid), newUser),
          15000,
          'Timed out while saving your profile.'
        );
      }
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
