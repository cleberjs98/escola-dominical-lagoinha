// lib/adminStats.ts
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
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

export interface PendingInsights extends PendingCounts {
  scheduledLessons: number;
  scheduledDevotionals: number;
}

export interface SimpleKpis {
  lessonsLast30Days: number;
  devotionalsLast30Days: number;
  activeProfessores: number;
  activeAlunos: number;
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

export async function getPendingInsights(): Promise<PendingInsights> {
  const [base, scheduledLessons, scheduledDevotionals] = await Promise.all([
    getPendingCounts(),
    countScheduledLessons(),
    countScheduledDevotionals(),
  ]);

  return {
    ...base,
    scheduledLessons,
    scheduledDevotionals,
  };
}

export async function getSimpleKpis(): Promise<SimpleKpis> {
  const since = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [lessonsSnap, devotionalsSnap, activeProfSnap, activeAlunosSnap] = await Promise.all([
    getDocs(
      query(
        collection(firebaseDb, "aulas"),
        where("status", "==", "publicada"),
        where("publicado_em", ">=", since)
      )
    ),
    getDocs(
      query(
        collection(firebaseDb, "devocionais"),
        where("status", "==", "publicado"),
        where("publicado_em", ">=", since)
      )
    ),
    getDocs(
      query(
        collection(firebaseDb, "users"),
        where("status", "==", "aprovado"),
        where("papel", "==", "professor")
      )
    ),
    getDocs(
      query(
        collection(firebaseDb, "users"),
        where("status", "==", "aprovado"),
        where("papel", "==", "aluno")
      )
    ),
  ]);

  return {
    lessonsLast30Days: lessonsSnap.size,
    devotionalsLast30Days: devotionalsSnap.size,
    activeProfessores: activeProfSnap.size,
    activeAlunos: activeAlunosSnap.size,
  };
}

async function countScheduledLessons(): Promise<number> {
  const now = Timestamp.now();
  const snap = await getDocs(
    query(
      collection(firebaseDb, "aulas"),
      where("publish_at", ">=", now),
      where("status", "in", ["disponivel", "reservada", "pendente_reserva"])
    )
  );
  return snap.size;
}

async function countScheduledDevotionals(): Promise<number> {
  const now = Timestamp.now();
  const snap = await getDocs(
    query(
      collection(firebaseDb, "devocionais"),
      where("publish_at", ">=", now),
      where("status", "==", "disponivel")
    )
  );
  return snap.size;
}
