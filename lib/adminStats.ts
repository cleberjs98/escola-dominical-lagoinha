// lib/adminStats.ts
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";

export interface SystemStats {
  totalUsers: number;
  totalUsersByRole: {
    aluno: number;
    professor: number;
    coordenador: number;
    administrador: number;
  };
  totalLessons: number;
  totalDevotionals: number;
  totalAvisos: number;
}

export interface PendingCounts {
  pendingUsers: number;
  pendingReservations: number;
}

export async function getSystemStats(): Promise<SystemStats> {
  const usersSnap = await getDocs(collection(firebaseDb, "users"));
  let aluno = 0,
    professor = 0,
    coordenador = 0,
    administrador = 0;
  usersSnap.forEach((docSnap) => {
    const papel = (docSnap.data() as any).papel;
    if (papel === "aluno") aluno++;
    else if (papel === "professor") professor++;
    else if (papel === "coordenador") coordenador++;
    else if (papel === "administrador") administrador++;
  });

  const lessonsSnap = await getDocs(collection(firebaseDb, "aulas"));
  const devotionalsSnap = await getDocs(collection(firebaseDb, "devocionais"));
  const avisosSnap = await getDocs(collection(firebaseDb, "avisos"));

  return {
    totalUsers: usersSnap.size,
    totalUsersByRole: { aluno, professor, coordenador, administrador },
    totalLessons: lessonsSnap.size,
    totalDevotionals: devotionalsSnap.size,
    totalAvisos: avisosSnap.size,
  };
}

export async function getPendingCounts(): Promise<PendingCounts> {
  const pendingUsersQ = query(
    collection(firebaseDb, "users"),
    where("status", "==", "pendente")
  );
  const pendingUsersSnap = await getDocs(pendingUsersQ);

  const pendingResQ = query(
    collection(firebaseDb, "reservas_aula"),
    where("status", "==", "pendente")
  );
  const pendingResSnap = await getDocs(pendingResQ);

  return {
    pendingUsers: pendingUsersSnap.size,
    pendingReservations: pendingResSnap.size,
  };
}
