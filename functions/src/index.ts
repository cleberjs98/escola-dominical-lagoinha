import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const publishScheduledLessons = onSchedule("every 1 minutes", async () => {
  const now = new Date();
  const statuses = ["disponivel", "publicacao_agendada"];

  const lessonsRef = db.collection("aulas");

  // Firestore limita combinações de filtros; fazemos duas consultas simples e unimos resultados.
  const snapshots = await Promise.all(
    statuses.map((status) =>
      lessonsRef.where("status", "==", status).where("publish_at", "!=", null).get()
    )
  );

  const updates: Promise<unknown>[] = [];
  let candidates = 0;
  let published = 0;

  for (const snap of snapshots) {
    candidates += snap.size;
    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const publishAtString = data.publish_at as string | null;

      if (!publishAtString || typeof publishAtString !== "string") {
        logger.warn("publish_at ausente ou invalido", { id: docSnap.id });
        return;
      }

      const publishAt = new Date(publishAtString);
      if (isNaN(publishAt.getTime())) {
        logger.error("publish_at mal formatado", { id: docSnap.id, publish_at: publishAtString });
        return;
      }

      if (publishAt.getTime() <= now.getTime()) {
        const update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
          status: "publicada",
          publicado_em: admin.firestore.FieldValue.serverTimestamp(),
          data_publicacao_auto: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };
        updates.push(
          docSnap.ref.update(update).catch((err) => {
            logger.error("Falha ao publicar aula agendada", { id: docSnap.id, err });
          })
        );
        published += 1;
      }
    });
  }

  if (updates.length) {
    await Promise.all(updates);
  }

  logger.info("publishScheduledLessons concluida", {
    candidatos: candidates,
    publicados: published,
    horario: now.toISOString(),
  });
});
