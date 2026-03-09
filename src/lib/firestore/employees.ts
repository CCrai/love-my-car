import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee } from '@/types';

export async function inviteEmployee(
  businessId: string,
  userId: string,
  role: Employee['role'] = 'employee'
): Promise<Employee> {
  const data = { businessId, userId, role };
  const docRef = await addDoc(collection(db, 'employees'), data);
  return { id: docRef.id, ...data };
}

export async function getEmployeesByBusiness(businessId: string): Promise<Employee[]> {
  const q = query(collection(db, 'employees'), where('businessId', '==', businessId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Employee[];
}

export async function getUserRoleInBusiness(
  userId: string,
  businessId: string
): Promise<Employee['role'] | null> {
  const q = query(
    collection(db, 'employees'),
    where('userId', '==', userId),
    where('businessId', '==', businessId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data().role as Employee['role'];
}
