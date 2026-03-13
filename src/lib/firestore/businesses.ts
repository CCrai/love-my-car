import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Business, BusinessCategory } from '@/types';

export async function createBusiness(
  name: string,
  types: BusinessCategory[],
  ownerId: string
): Promise<Business> {
  const normalizedTypes = Array.from(new Set(types)).filter(Boolean);
  const primaryType = normalizedTypes[0] || 'parking';

  const businessData = {
    name,
    types: normalizedTypes,
    type: primaryType,
    ownerId,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'businesses'), businessData);

  // Add owner as employee
  await addDoc(collection(db, 'employees'), {
    businessId: docRef.id,
    userId: ownerId,
    role: 'owner',
  });

  // Add businessId to user's businesses array
  await updateDoc(doc(db, 'users', ownerId), {
    businesses: arrayUnion(docRef.id),
  });

  return { id: docRef.id, name, types: normalizedTypes, type: primaryType, ownerId, createdAt: new Date() };
}

export async function updateBusinessInfo(
  id: string,
  data: {
    name: string;
    types: BusinessCategory[];
  }
): Promise<void> {
  const normalizedTypes = Array.from(new Set(data.types)).filter(Boolean);
  const primaryType = normalizedTypes[0] || 'parking';

  await updateDoc(doc(db, 'businesses', id), {
    name: data.name,
    types: normalizedTypes,
    type: primaryType,
  });
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const docSnap = await getDoc(doc(db, 'businesses', id));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
  } as Business;
}

export async function getBusinessesByOwner(ownerId: string): Promise<Business[]> {
  const q = query(collection(db, 'businesses'), where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
  })) as Business[];
}

export async function getUserBusinesses(businessIds: string[]): Promise<Business[]> {
  if (businessIds.length === 0) return [];
  const results = await Promise.all(businessIds.map((id) => getBusinessById(id)));
  return results.filter((b): b is Business => b !== null);
}
