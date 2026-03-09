import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Service } from '@/types';

export async function createService(
  businessId: string,
  name: string,
  price: number,
  type: Service['type']
): Promise<Service> {
  const data = { businessId, name, price, type };
  const docRef = await addDoc(collection(db, 'services'), data);
  return { id: docRef.id, ...data };
}

export async function getServicesByBusiness(businessId: string): Promise<Service[]> {
  const q = query(collection(db, 'services'), where('businessId', '==', businessId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Service[];
}

export async function getServiceById(id: string): Promise<Service | null> {
  const docSnap = await getDoc(doc(db, 'services', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Service;
}

export async function updateService(
  id: string,
  data: Partial<Omit<Service, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'services', id), data);
}

export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, 'services', id));
}
