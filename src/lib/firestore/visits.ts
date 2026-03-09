import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Visit } from '@/types';

export async function createVisit(
  businessId: string,
  vehicleId: string,
  serviceId: string,
  notes: string = ''
): Promise<Visit> {
  const data = {
    businessId,
    vehicleId,
    serviceId,
    entryTime: serverTimestamp(),
    exitTime: null,
    status: 'active' as const,
    totalPrice: 0,
    notes,
  };
  const docRef = await addDoc(collection(db, 'visits'), data);
  return { id: docRef.id, ...data, entryTime: new Date() };
}

export async function getActiveVisits(businessId: string): Promise<Visit[]> {
  const q = query(
    collection(db, 'visits'),
    where('businessId', '==', businessId),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      entryTime: data.entryTime instanceof Timestamp ? data.entryTime.toDate() : new Date(),
      exitTime: data.exitTime instanceof Timestamp ? data.exitTime.toDate() : null,
    } as Visit;
  });
}

export async function getActiveVisitByVehicle(
  businessId: string,
  vehicleId: string
): Promise<Visit | null> {
  const q = query(
    collection(db, 'visits'),
    where('businessId', '==', businessId),
    where('vehicleId', '==', vehicleId),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const data = snapshot.docs[0].data();
  return {
    id: snapshot.docs[0].id,
    ...data,
    entryTime: data.entryTime instanceof Timestamp ? data.entryTime.toDate() : new Date(),
    exitTime: data.exitTime instanceof Timestamp ? data.exitTime.toDate() : null,
  } as Visit;
}

export async function getVisitsByBusiness(businessId: string): Promise<Visit[]> {
  const q = query(collection(db, 'visits'), where('businessId', '==', businessId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      entryTime: data.entryTime instanceof Timestamp ? data.entryTime.toDate() : new Date(),
      exitTime: data.exitTime instanceof Timestamp ? data.exitTime.toDate() : null,
    } as Visit;
  });
}

export function subscribeVisitsByBusiness(
  businessId: string,
  onVisits: (visits: Visit[]) => void
): () => void {
  const q = query(collection(db, 'visits'), where('businessId', '==', businessId));
  return onSnapshot(q, (snapshot) => {
    const visits = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        entryTime: data.entryTime instanceof Timestamp ? data.entryTime.toDate() : new Date(),
        exitTime: data.exitTime instanceof Timestamp ? data.exitTime.toDate() : null,
      } as Visit;
    });
    onVisits(visits);
  });
}

export async function getTodayRevenueByBusiness(businessId: string): Promise<number> {
  const q = query(
    collection(db, 'visits'),
    where('businessId', '==', businessId),
    where('status', '==', 'completed')
  );
  const snapshot = await getDocs(q);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return snapshot.docs.reduce((sum, visitDoc) => {
    const data = visitDoc.data();
    const exitTime = data.exitTime instanceof Timestamp ? data.exitTime.toDate() : null;
    if (!exitTime) return sum;
    if (exitTime >= dayStart && exitTime < dayEnd) {
      return sum + (Number(data.totalPrice) || 0);
    }
    return sum;
  }, 0);
}

export async function getVisitById(id: string): Promise<Visit | null> {
  const docSnap = await getDoc(doc(db, 'visits', id));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    entryTime: data.entryTime instanceof Timestamp ? data.entryTime.toDate() : new Date(),
    exitTime: data.exitTime instanceof Timestamp ? data.exitTime.toDate() : null,
  } as Visit;
}

export async function completeVisit(
  visitId: string,
  totalPrice: number
): Promise<void> {
  await updateDoc(doc(db, 'visits', visitId), {
    exitTime: serverTimestamp(),
    status: 'completed',
    totalPrice,
  });
}
