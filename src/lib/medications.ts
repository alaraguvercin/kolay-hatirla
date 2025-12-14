import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Medication, MedicationDose } from "@/types/medication";


export const medicationsCollection = "medications";
export const medicationDosesCollection = "medicationDoses"

export function getMedicationsQuery(userId: string) {
  return query(
    collection(db, medicationsCollection),
    where("userId", "==", userId)
  );
}


export function subscribeToMedications(
  userId: string,
  callback: (medications: Medication[]) => void
) {
  const q = getMedicationsQuery(userId);
  return onSnapshot(q, (snapshot) => {
    const medications: Medication[] = [];
    snapshot.forEach((doc) => {
      medications.push({ id: doc.id, ...doc.data() } as Medication);
    });
    callback(medications);
  });
}


export async function addMedication(
  userId: string,
  medicationData: Omit<Medication, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Date.now();
  const docRef = await addDoc(collection(db, medicationsCollection), {
    ...medicationData,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}


export async function updateMedication(
  medicationId: string,
  updates: Partial<Omit<Medication, "id" | "userId" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, medicationsCollection, medicationId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Date.now(),
  });
}


export async function deleteMedication(medicationId: string): Promise<void> {
  const docRef = doc(db, medicationsCollection, medicationId);
  await deleteDoc(docRef);
  

  const dosesQuery = query(
    collection(db, medicationDosesCollection),
    where("medicationId", "==", medicationId)
  );
  const dosesSnapshot = await getDocs(dosesQuery);
  const deletePromises = dosesSnapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
}


export function getTodayDosesQuery(userId: string, date: string) {
  return query(
    collection(db, medicationDosesCollection),
    where("userId", "==", userId),
    where("date", "==", date)
  );
}


export function subscribeToTodayDoses(
  userId: string,
  date: string,
  callback: (doses: MedicationDose[]) => void
) {
  const q = getTodayDosesQuery(userId, date);
  return onSnapshot(q, (snapshot) => {
    const doses: MedicationDose[] = [];
    snapshot.forEach((doc) => {
      doses.push({ id: doc.id, ...doc.data() } as MedicationDose);
    });
    callback(doses);
  });
}


export async function markDoseAsTaken(
  userId: string,
  medicationId: string,
  scheduledTime: string,
  date: string
): Promise<void> {

  const dosesQuery = query(
    collection(db, medicationDosesCollection),
    where("userId", "==", userId),
    where("medicationId", "==", medicationId),
    where("scheduledTime", "==", scheduledTime),
    where("date", "==", date)
  );
  
  const snapshot = await getDocs(dosesQuery);
  
  if (snapshot.empty) {
  
    await addDoc(collection(db, medicationDosesCollection), {
      userId,
      medicationId,
      scheduledTime,
      date,
      takenAt: Date.now(),
    });
  } else {
  
    const docRef = snapshot.docs[0].ref;
    await updateDoc(docRef, {
      takenAt: Date.now(),
    });
  }
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


export function isDateInRange(
  date: string,
  startDate: string,
  endDate?: string
): boolean {
  if (date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

