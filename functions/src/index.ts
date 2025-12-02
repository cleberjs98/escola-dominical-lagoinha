import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const collectionName = "aulas";

export const publishScheduledLessons = onSchedule("every 1 minutes", async () => {
  const now = admin.firestore.Timestamp.now();
  const statuses = ["disponivel", "reservada"];
  const lessonsRef = db.collection(collectionName);

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
      const rawPublish = data.publish_at as admin.firestore.Timestamp | string | null;
      let publishAt: admin.firestore.Timestamp | null = null;
      if (rawPublish) {
        if (typeof rawPublish === "string") {
          const parsed = new Date(rawPublish);
          if (!Number.isNaN(parsed.getTime())) {
            publishAt = admin.firestore.Timestamp.fromDate(parsed);
          }
        } else if (rawPublish.toMillis) {
          publishAt = rawPublish;
        }
      }
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
          .catch((err) => logger.error("Falha ao publicar agendada", { id: docSnap.id, err }))
      );
    });
  }

  if (updates.length) {
    await Promise.all(updates);
  }

  logger.info("publishScheduledLessons concluída", {
    processadas: processed,
    horario: now.toDate().toISOString(),
  });
});

function formatDateTime(date: Date): string {
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}
