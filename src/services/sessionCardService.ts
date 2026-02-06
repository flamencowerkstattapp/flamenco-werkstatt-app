import { collection, addDoc, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { getFirestoreDB } from './firebase';
import { SessionCard, PaymentMethod } from '../types';

export interface CreateSessionCardData {
  userId: string;
  userName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
}

export const createSessionCard = async (data: CreateSessionCardData): Promise<string> => {
  try {
    const db = getFirestoreDB();
    const sessionCardsRef = collection(db, 'sessionCards');

    const sessionCard = {
      userId: data.userId,
      userName: data.userName,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      notes: data.notes || null,
      recordedBy: data.recordedBy,
      recordedByName: data.recordedByName,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await addDoc(sessionCardsRef, sessionCard);

    // Also record as a payment for revenue tracking
    const paymentsRef = collection(db, 'payments');
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await addDoc(paymentsRef, {
      userId: data.userId,
      userName: data.userName,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentType: 'session-card',
      date: Timestamp.fromDate(now),
      month,
      membershipType: null,
      specialClassType: null,
      classId: null,
      notes: data.notes || null,
      recordedBy: data.recordedBy,
      recordedByName: data.recordedByName,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating session card:', error);
    throw error;
  }
};

export const getAllSessionCards = async (): Promise<SessionCard[]> => {
  try {
    const db = getFirestoreDB();
    const sessionCardsRef = collection(db, 'sessionCards');

    const q = query(sessionCardsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as SessionCard[];
  } catch (error) {
    console.error('Error fetching session cards:', error);
    throw error;
  }
};

export const getSessionCardCountsByUser = async (): Promise<{ [userId: string]: number }> => {
  try {
    const db = getFirestoreDB();
    const sessionCardsRef = collection(db, 'sessionCards');
    const snapshot = await getDocs(sessionCardsRef);

    const counts: { [userId: string]: number } = {};
    snapshot.docs.forEach(doc => {
      const userId = doc.data().userId;
      if (userId) {
        counts[userId] = (counts[userId] || 0) + 1;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error fetching session card counts:', error);
    return {};
  }
};

export const getSessionCardStats = async () => {
  try {
    const db = getFirestoreDB();
    const sessionCardsRef = collection(db, 'sessionCards');

    const snapshot = await getDocs(sessionCardsRef);
    const cards = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        amount: data.amount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = now.getFullYear();

    const totalCards = cards.length;
    const totalRevenue = cards.reduce((sum, c) => sum + c.amount, 0);

    const monthlyCards = cards.filter(c =>
      c.createdAt.getFullYear() === now.getFullYear() &&
      c.createdAt.getMonth() === now.getMonth()
    );
    const monthlyRevenue = monthlyCards.reduce((sum, c) => sum + c.amount, 0);

    const yearlyCards = cards.filter(c => c.createdAt.getFullYear() === currentYear);
    const yearlyRevenue = yearlyCards.reduce((sum, c) => sum + c.amount, 0);

    return {
      totalCards,
      totalRevenue,
      monthlyCards: monthlyCards.length,
      monthlyRevenue,
      yearlyCards: yearlyCards.length,
      yearlyRevenue,
    };
  } catch (error) {
    console.error('Error fetching session card stats:', error);
    throw error;
  }
};
