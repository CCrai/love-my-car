import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Service } from '@/types';

export async function createService(
  businessId: string,
  name: string,
  price: number,
  type: Service['type'],
  minimumChargeMinutes?: Service['minimumChargeMinutes'],
  toleranceMinutes?: Service['toleranceMinutes'],
  toleranceChargeMode?: Service['toleranceChargeMode'],
  isDefault?: boolean
): Promise<Service> {
  const data: Omit<Service, 'id'> = {
    businessId,
    name,
    price,
    type,
    isDefault: !!isDefault,
  };
  if (type === 'hourly') {
    data.minimumChargeMinutes = minimumChargeMinutes ?? 60;
    data.toleranceMinutes = toleranceMinutes ?? 15;
    data.toleranceChargeMode = toleranceChargeMode ?? 'tolerance';
  }
  const docRef = await addDoc(collection(db, 'services'), data);
  if (isDefault) {
    await setDefaultService(businessId, docRef.id);
  }
  return { id: docRef.id, ...data };
}

export async function setDefaultService(
  businessId: string,
  serviceId: string
): Promise<void> {
  const q = query(collection(db, 'services'), where('businessId', '==', businessId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);

  snapshot.docs.forEach((serviceDoc) => {
    batch.update(doc(db, 'services', serviceDoc.id), {
      isDefault: serviceDoc.id === serviceId,
    });
  });

  await batch.commit();
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
  const payload: Record<string, unknown> = { ...data };
  if (data.type === 'fixed') {
    payload.minimumChargeMinutes = deleteField();
    payload.toleranceMinutes = deleteField();
    payload.toleranceChargeMode = deleteField();
    payload.minimumMinutes = deleteField();
    payload.billingStepMinutes = deleteField();
  }
  await updateDoc(doc(db, 'services', id), payload);
}

export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, 'services', id));
}
