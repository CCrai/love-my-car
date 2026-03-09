import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee, UserProfile } from '@/types';

export async function inviteEmployee(
  businessId: string,
  userId: string,
  email: string | undefined,
  role: Employee['role'] = 'employee'
): Promise<Employee> {
  const data = { businessId, userId, email, role };
  const docRef = await addDoc(collection(db, 'employees'), data);
  return { id: docRef.id, ...data };
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const normalized = email.trim().toLowerCase();
  const q = query(collection(db, 'users'), where('email', '==', normalized), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserProfile;
}

export async function getUserEmailById(userId: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return null;
  const data = userDoc.data() as UserProfile;
  return data.email || null;
}

export async function inviteEmployeeByEmail(
  businessId: string,
  email: string,
  role: Employee['role'] = 'employee'
): Promise<Employee> {
  const userProfile = await getUserByEmail(email);
  if (!userProfile) {
    throw new Error('No existe un usuario registrado con ese email.');
  }

  const existingEmployeeQuery = query(
    collection(db, 'employees'),
    where('businessId', '==', businessId),
    where('userId', '==', userProfile.uid),
    limit(1)
  );
  const existingEmployee = await getDocs(existingEmployeeQuery);
  if (!existingEmployee.empty) {
    throw new Error('Ese usuario ya forma parte de este negocio.');
  }

  return inviteEmployee(businessId, userProfile.uid, userProfile.email, role);
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
