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
import { Visit, VisitTaskItem } from '@/types';

function normalizeVisitTaskChecklist(raw: unknown): VisitTaskItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      if (typeof item === 'string') {
        const title = item.trim();
        if (!title) return null;
        return {
          id: `legacy-${index}`,
          title,
          completed: false,
        } as VisitTaskItem;
      }

      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title.trim() : '';
      if (!title) return null;

      const id = typeof record.id === 'string' && record.id.trim().length > 0
        ? record.id
        : `task-${index}`;

      return {
        id,
        title,
        completed: !!record.completed,
      } as VisitTaskItem;
    })
    .filter((item): item is VisitTaskItem => item !== null);
}

export async function createVisit(
  businessId: string,
  vehicleId: string,
  serviceId: string,
  notes: string = '',
  taskChecklist: VisitTaskItem[] = []
): Promise<Visit> {
  const normalizedTaskChecklist = taskChecklist
    .map((task, index) => {
      const title = task.title?.trim();
      if (!title) return null;
      return {
        id: task.id?.trim() || `task-${index}`,
        title,
        completed: !!task.completed,
      };
    })
    .filter((item): item is VisitTaskItem => item !== null);

  const data = {
    businessId,
    vehicleId,
    serviceId,
    entryTime: serverTimestamp(),
    exitTime: null,
    status: 'active' as const,
    totalPrice: 0,
    notes,
    taskChecklist: normalizedTaskChecklist,
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
      taskChecklist: normalizeVisitTaskChecklist(data.taskChecklist),
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
    taskChecklist: normalizeVisitTaskChecklist(data.taskChecklist),
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
      taskChecklist: normalizeVisitTaskChecklist(data.taskChecklist),
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
        taskChecklist: normalizeVisitTaskChecklist(data.taskChecklist),
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
    taskChecklist: normalizeVisitTaskChecklist(data.taskChecklist),
  } as Visit;
}

export async function updateVisitTaskChecklist(
  visitId: string,
  taskChecklist: VisitTaskItem[]
): Promise<void> {
  const normalizedTaskChecklist = taskChecklist
    .map((task, index) => {
      const title = task.title?.trim();
      if (!title) return null;
      return {
        id: task.id?.trim() || `task-${index}`,
        title,
        completed: !!task.completed,
      };
    })
    .filter((item): item is VisitTaskItem => item !== null);

  await updateDoc(doc(db, 'visits', visitId), {
    taskChecklist: normalizedTaskChecklist,
  });
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
