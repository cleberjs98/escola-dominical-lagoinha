import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const lessonsCollection = "aulas";
const devotionalsCollection = "devocionais";

export const publishScheduledLessons = onSchedule("every 1 minutes", async () => {
  const now = admin.firestore.Timestamp.now();

  const [lessonsProcessed, devotionalsProcessed] = await Promise.all([
    processLessons(now),
    processDevotionals(now),
  ]);

  logger.info("publishScheduledLessons concluída", {
    aulas_processadas: lessonsProcessed,
    devocionais_processados: devotionalsProcessed,
    horario: now.toDate().toISOString(),
  });
});

function formatDateTime(date: Date): string {
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

async function processLessons(now: admin.firestore.Timestamp): Promise<number> {
  const statuses = ["disponivel", "reservada"];
  const lessonsRef = db.collection(lessonsCollection);

  const snapshots = await Promise.all(
    statuses.map((status) =>
      lessonsRef
        .where("status", "==", status)
        .where("publish_at", "<=", now)
        .orderBy("publish_at", "asc")
        .get()
    )
  );

  let processed = 0;
  const updates: Promise<unknown>[] = [];

  for (const snap of snapshots) {
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const publishAt = normalizePublishAt(data.publish_at);
      if (!publishAt) return;
      if (publishAt.toMillis() > now.toMillis()) return;

      processed += 1;
      updates.push(
        docSnap.ref
          .update({
            status: "publicada",
            publicado_em: admin.firestore.FieldValue.serverTimestamp(),
            publicado_por_id: "system-auto",
            publish_at: null,
            data_publicacao_auto: data.data_publicacao_auto || formatDateTime(publishAt.toDate()),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          })
          .catch((err) => logger.error("Falha ao publicar aula agendada", { id: docSnap.id, err }))
      );
    });
  }

  if (updates.length) {
    await Promise.all(updates);
  }

  return processed;
}

async function processDevotionals(now: admin.firestore.Timestamp): Promise<number> {
  const devotionalsRef = db.collection(devotionalsCollection);
  const snapshot = await devotionalsRef
    .where("status", "==", "rascunho")
    .where("publish_at", "<=", now)
    .orderBy("publish_at", "asc")
    .get();

  let processed = 0;
  const updates: Promise<unknown>[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const publishAt = normalizePublishAt(data.publish_at);
    if (!publishAt) return;
    if (publishAt.toMillis() > now.toMillis()) return;

    processed += 1;
    updates.push(
      docSnap.ref
        .update({
          status: "publicado",
          publicado_em: admin.firestore.FieldValue.serverTimestamp(),
          publish_at: null,
          data_publicacao_auto: data.data_publicacao_auto || formatDateTime(publishAt.toDate()),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch((err) => logger.error("Falha ao publicar devocional agendado", { id: docSnap.id, err }))
    );
  });

  if (updates.length) {
    await Promise.all(updates);
  }

  return processed;
}

function normalizePublishAt(
  raw: admin.firestore.Timestamp | string | null | undefined
): admin.firestore.Timestamp | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return admin.firestore.Timestamp.fromDate(parsed);
  }
  if (raw.toMillis) return raw as admin.firestore.Timestamp;
  return null;
}
