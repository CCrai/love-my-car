import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Vehicle } from '@/types';

export async function createVehicle(
  plate: string,
  clientName: string,
  clientPhone: string,
  notes: string = ''
): Promise<Vehicle> {
  const data = {
    plate: plate.toUpperCase(),
    clientName,
    clientPhone,
    notes,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'vehicles'), data);
  return { id: docRef.id, ...data, createdAt: new Date() };
}

export async function getVehicleByPlate(plate: string): Promise<Vehicle | null> {
  const q = query(
    collection(db, 'vehicles'),
    where('plate', '==', plate.toUpperCase())
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return {
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate() || new Date(),
  } as Vehicle;
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const docSnap = await getDoc(doc(db, 'vehicles', id));
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
  } as Vehicle;
}
