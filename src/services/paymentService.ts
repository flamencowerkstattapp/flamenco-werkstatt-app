import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getFirestoreDB } from './firebase';
import { Payment, PaymentMethod, PaymentType } from '../types';

export interface CreatePaymentData {
  userId: string;
  userName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  date: Date;
  month?: string;
  classId?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
}

export const createPayment = async (paymentData: CreatePaymentData): Promise<string> => {
  try {
    const db = getFirestoreDB();
    const paymentsRef = collection(db, 'payments');
    
    const payment = {
      userId: paymentData.userId,
      userName: paymentData.userName,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paymentType: paymentData.paymentType,
      date: Timestamp.fromDate(paymentData.date),
      month: paymentData.month || null,
      classId: paymentData.classId || null,
      notes: paymentData.notes || null,
      recordedBy: paymentData.recordedBy,
      recordedByName: paymentData.recordedByName,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await addDoc(paymentsRef, payment);
    return docRef.id;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

export const getUserPayments = async (userId: string, limitCount: number = 10): Promise<Payment[]> => {
  try {
    const db = getFirestoreDB();
    const paymentsRef = collection(db, 'payments');
    
    const q = query(
      paymentsRef,
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Payment[];
  } catch (error) {
    console.error('Error fetching user payments:', error);
    throw error;
  }
};

export const getAllPayments = async (): Promise<Payment[]> => {
  try {
    const db = getFirestoreDB();
    const paymentsRef = collection(db, 'payments');
    
    const q = query(paymentsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Payment[];
  } catch (error) {
    console.error('Error fetching all payments:', error);
    throw error;
  }
};

export const getPaymentsByMonth = async (month: string): Promise<Payment[]> => {
  try {
    const db = getFirestoreDB();
    const paymentsRef = collection(db, 'payments');
    
    const q = query(
      paymentsRef,
      where('month', '==', month),
      where('paymentType', '==', 'monthly-membership'),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Payment[];
  } catch (error) {
    console.error('Error fetching payments by month:', error);
    throw error;
  }
};

export const getPaymentsByDateRange = async (startDate: Date, endDate: Date): Promise<Payment[]> => {
  try {
    const db = getFirestoreDB();
    const paymentsRef = collection(db, 'payments');
    
    const q = query(
      paymentsRef,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Payment[];
  } catch (error) {
    console.error('Error fetching payments by date range:', error);
    throw error;
  }
};

export const checkMonthlyPaymentStatus = async (userId: string, month: string): Promise<boolean> => {
  try {
    const db = getFirestoreDB();
    const paymentsRef = collection(db, 'payments');
    
    const q = query(
      paymentsRef,
      where('userId', '==', userId),
      where('month', '==', month),
      where('paymentType', '==', 'monthly-membership')
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking monthly payment status:', error);
    return false;
  }
};

export const getPaymentStats = async () => {
  try {
    const db = getFirestoreDB();
    const paymentsRef = collection(db, 'payments');
    
    const snapshot = await getDocs(paymentsRef);
    const payments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        amount: data.amount || 0,
        paymentMethod: data.paymentMethod,
        paymentType: data.paymentType,
        date: data.date?.toDate() || new Date(),
        month: data.month,
        classId: data.classId,
        notes: data.notes,
        recordedBy: data.recordedBy,
        recordedByName: data.recordedByName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Payment;
    });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = now.getFullYear();

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyRevenue = payments
      .filter(p => p.month === currentMonth || 
        (p.date.getFullYear() === now.getFullYear() && p.date.getMonth() === now.getMonth()))
      .reduce((sum, p) => sum + p.amount, 0);

    const yearlyRevenue = payments
      .filter(p => p.date.getFullYear() === currentYear)
      .reduce((sum, p) => sum + p.amount, 0);

    const cashPayments = payments
      .filter(p => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);

    const bankPayments = payments
      .filter(p => p.paymentMethod === 'bank')
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyMembershipRevenue = payments
      .filter(p => p.paymentType === 'monthly-membership')
      .reduce((sum, p) => sum + p.amount, 0);

    const singleClassRevenue = payments
      .filter(p => p.paymentType === 'single-class')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalRevenue,
      monthlyRevenue,
      yearlyRevenue,
      cashPayments,
      bankPayments,
      monthlyMembershipRevenue,
      singleClassRevenue,
      totalPayments: payments.length,
    };
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    throw error;
  }
};
